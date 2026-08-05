import { useMemo, useState } from "react";
import { countBigrams, mulberry32, vocabulary } from "../lib/bigram";

/**
 * A character becomes a row, and the row is the scores for what comes next.
 *
 * The figure's whole job is the toggle. Both sides are the same table, the same
 * shape, doing the same job — the counted one was built in part 02 and can never
 * improve, and the learned one starts as noise and is adjusted by training. Put
 * side by side that is the entire idea of an embedding table, and it stops
 * looking like new machinery.
 *
 * The counted numbers are real: tallied from the sentence below, which is the
 * sentence the lab on this page uses. The learned numbers are deliberately
 * random and deliberately re-rollable, and nothing in the prose quotes them —
 * an untrained table means nothing, which is the point of showing it.
 */
const TEXT = "the cat sat on the mat and the dog sat on the log";

const show = (c: string) => (c === " " ? "␣" : c);

export function EmbeddingTable() {
  const [pick, setPick] = useState("t");
  const [learned, setLearned] = useState(false);
  const [roll, setRoll] = useState(0);

  const chars = useMemo(() => vocabulary(TEXT), []);
  const counts = useMemo(() => countBigrams(TEXT), []);

  const countedRow = useMemo(() => {
    const row = counts.get(pick) ?? new Map<string, number>();
    const total = [...row.values()].reduce((a, b) => a + b, 0);
    return chars.map((c) => (total ? (row.get(c) ?? 0) / total : 0));
  }, [chars, counts, pick]);

  // Seeded on the character too, so each row differs and re-rolling changes
  // everything — an untrained table has no reason for any of its numbers.
  const learnedRow = useMemo(() => {
    const rand = mulberry32(roll * 1000 + pick.charCodeAt(0));
    const raw = chars.map(() => rand() * 4 - 2);
    const max = Math.max(...raw);
    const exp = raw.map((v) => Math.exp(v - max));
    const total = exp.reduce((a, b) => a + b, 0);
    return exp.map((v) => v / total);
  }, [chars, pick, roll]);

  const row = learned ? learnedRow : countedRow;
  const peak = Math.max(...row, 0.0001);

  return (
    <div className="border bg-paper-raised p-5 hairline">
      <p className="eyebrow">Given this character</p>
      <ul className="mt-3 flex list-none flex-wrap gap-1.5 p-0">
        {chars.map((c) => (
          <li key={c}>
            <button
              type="button"
              onClick={() => setPick(c)}
              className={`h-7 w-7 border font-mono text-[0.6875rem] ${
                c === pick ? "border-riso bg-riso/8 text-ink" : "text-graphite hairline"
              }`}
            >
              {show(c)}
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-t pt-4 hairline">
        <div className="flex gap-px">
          {[
            { on: false, label: "counted in part 02" },
            { on: true, label: "learned, before training" },
          ].map((o) => (
            <button
              key={o.label}
              type="button"
              onClick={() => setLearned(o.on)}
              className={`border px-3 py-1.5 font-mono text-[0.6875rem] ${
                learned === o.on
                  ? "border-plot bg-plot text-paper"
                  : "text-graphite hairline hover:text-plot"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        {learned && (
          <button
            type="button"
            onClick={() => setRoll((r) => r + 1)}
            className="mono-note text-graphite underline underline-offset-4 hover:text-riso"
          >
            roll it again
          </button>
        )}
      </div>

      <p className="mono-note mt-5 text-graphite">
        row for {show(pick)} — one number per character that could come next
      </p>

      <ul className="mt-2 flex list-none flex-col gap-1 p-0">
        {chars.map((c, i) => (
          <li key={c} className="flex items-center gap-2">
            <span className="w-4 shrink-0 text-right font-mono text-[0.6875rem] text-graphite">
              {show(c)}
            </span>
            <span
              className="h-3 shrink-0 bg-plot/70"
              style={{ width: `${(row[i] / peak) * 60}%` }}
            />
            <span className="font-mono text-[0.6875rem] text-graphite">
              {(row[i] * 100).toFixed(0)}%
            </span>
          </li>
        ))}
      </ul>

      <p className="caption mt-5 max-w-[34rem]">
        {learned ? (
          <>
            Nothing here means anything yet, and rolling again gives a set of
            numbers exactly as good. What matters is that these numbers{" "}
            <strong>can be changed</strong>, one nudge at a time, until they say
            something true — which is the one thing the counted table could
            never do.
          </>
        ) : (
          <>
            Real counts, tallied from the sentence in the lab below. Accurate
            about this sentence and unable to become anything else: to improve
            it you would have to go and find more text.
          </>
        )}
      </p>
    </div>
  );
}
