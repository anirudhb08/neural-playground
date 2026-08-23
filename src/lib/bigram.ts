/**
 * A bigram language model, which is the smallest thing that deserves the name.
 *
 * It has no learned parameters at all: you count adjacent pairs of characters
 * in a text, and the counts are the model. Everything later in the tutorial —
 * embeddings, attention, a whole transformer — is an increasingly clever answer
 * to the same question this answers by tallying.
 *
 * Written here rather than only in Python so the figures can recount as the
 * reader types. The Python cells do the identical arithmetic.
 */

export type Counts = Map<string, Map<string, number>>;

/** Every adjacent pair tallied: counts[previous][next]. */
export function countBigrams(text: string): Counts {
  const counts: Counts = new Map();
  for (let i = 0; i < text.length - 1; i++) {
    const prev = text[i];
    const next = text[i + 1];
    if (!counts.has(prev)) counts.set(prev, new Map());
    const row = counts.get(prev)!;
    row.set(next, (row.get(next) ?? 0) + 1);
  }
  return counts;
}

/** Each row divided by its own total, so every row sums to 1. */
export function toProbabilities(counts: Counts): Map<string, Map<string, number>> {
  const probs = new Map<string, Map<string, number>>();
  for (const [prev, row] of counts) {
    const total = [...row.values()].reduce((a, b) => a + b, 0);
    const out = new Map<string, number>();
    for (const [next, n] of row) out.set(next, n / total);
    probs.set(prev, out);
  }
  return probs;
}

/** Every character the text contains, in a stable order. */
export function vocabulary(text: string): string[] {
  return [...new Set(text.split(""))].sort();
}

/** Small, seeded and reproducible, so the page shows the same thing twice. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Draw = {
  /** Where the random draw landed, in [0, 1). */
  at: number;
  /** The character it selected. */
  picked: string;
  /** Each candidate with the span of [0,1) it occupies. */
  spans: { char: string; from: number; to: number }[];
};

/**
 * Sampling as a weighted die.
 *
 * Walk the probabilities keeping a running total and take the first one that
 * pushes the total past the draw. Returned with the spans intact because the
 * mechanism is the point — this is exactly what torch.multinomial does inside,
 * and it is worth seeing before it becomes a function call.
 */
export function sample(
  row: Map<string, number>,
  random: () => number,
): Draw | null {
  const entries = [...row.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  if (entries.length === 0) return null;

  const spans: Draw["spans"] = [];
  let running = 0;
  for (const [char, p] of entries) {
    spans.push({ char, from: running, to: running + p });
    running += p;
  }

  const at = random();
  const hit = spans.find((s) => at < s.to) ?? spans[spans.length - 1];
  return { at, picked: hit.char, spans };
}

/**
 * Generate by feeding each sampled character back in as the next input.
 *
 * Stops early if it reaches a character the text never followed — with a tiny
 * corpus that is a real possibility, and pretending otherwise would hide it.
 */
export function generate(
  probs: Map<string, Map<string, number>>,
  start: string,
  length: number,
  random: () => number,
): string {
  let out = start;
  for (let i = 0; i < length; i++) {
    const row = probs.get(out[out.length - 1]);
    if (!row) break;
    const draw = sample(row, random);
    if (!draw) break;
    out += draw.picked;
  }
  return out;
}
