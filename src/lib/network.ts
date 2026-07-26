import { GRID } from "../types";

export const INPUTS = GRID * GRID;

/**
 * The simplest thing that is still a neural network: every input square has one
 * weight per character, plus one spare number per character. No hidden layer,
 * which means each character's weights are themselves 256 numbers — and so can
 * be looked at as a picture.
 */
export type Network = {
  /** weights[classIndex][inputIndex] */
  weights: number[][];
  biases: number[];
  classes: number;
};

/** Small, seeded, and reproducible, so the page shows the same thing twice. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createNetwork(classes: number, seed = 7): Network {
  const random = mulberry32(seed);
  return {
    classes,
    // Deliberately tiny: large starting weights make the first guesses wildly
    // overconfident, which reads as broken rather than as untrained.
    weights: Array.from({ length: classes }, () =>
      Array.from({ length: INPUTS }, () => (random() - 0.5) * 0.1),
    ),
    biases: new Array(classes).fill(0),
  };
}

/** One score per character. Higher means the network likes that answer more. */
export function score(network: Network, pixels: number[]): number[] {
  return network.weights.map((row, c) => {
    let total = network.biases[c];
    for (let i = 0; i < INPUTS; i++) {
      total += (pixels[i] / 255) * row[i];
    }
    return total;
  });
}

export function argmax(values: number[]): number {
  let best = 0;
  for (let i = 1; i < values.length; i++) if (values[i] > values[best]) best = i;
  return best;
}

/**
 * Turns scores into shares of 1 — what everyone calls softmax.
 * Subtracting the largest score first changes nothing about the result and
 * keeps exp() from overflowing.
 */
export function toShares(values: number[]): number[] {
  const top = Math.max(...values);
  const lifted = values.map((v) => Math.exp(v - top));
  const total = lifted.reduce((a, b) => a + b, 0);
  return lifted.map((v) => v / total);
}

/**
 * How surprised the network should be by the right answer. Believing the
 * correct answer completely costs nothing; believing it barely at all costs a
 * great deal.
 */
export function surprise(shareOfTruth: number): number {
  return -Math.log(Math.max(shareOfTruth, 1e-12));
}

/** Average surprise across every drawing — one number for the whole dataset. */
export function averageSurprise(
  network: Network,
  samples: { pixels: number[]; label: number }[],
): number {
  if (samples.length === 0) return 0;
  const total = samples.reduce((sum, s) => {
    const shares = toShares(score(network, s.pixels));
    return sum + surprise(shares[s.label]);
  }, 0);
  return total / samples.length;
}

/** What a network that knows nothing scores: every answer equally likely. */
export function chanceLevel(classes: number): number {
  return Math.log(classes);
}

export type Sample = { pixels: number[]; label: number };

export type Nudge = {
  /** dWeights[classIndex][inputIndex] — how far to move each number. */
  weights: number[][];
  biases: number[];
};

/**
 * Which way every number should move to make the loss smaller.
 *
 * For a network with no hidden layer this needs no calculus: a square's nudge
 * is how much ink was in it, times how far off that character's prediction
 * was. Positive error means the network was too keen on that character, so the
 * update below subtracts and the number comes down.
 */
export function nudgeFor(network: Network, samples: Sample[]): Nudge {
  const weights = Array.from({ length: network.classes }, () =>
    new Array(INPUTS).fill(0),
  );
  const biases = new Array(network.classes).fill(0);
  if (samples.length === 0) return { weights, biases };

  for (const sample of samples) {
    const predicted = toShares(score(network, sample.pixels));
    for (let c = 0; c < network.classes; c++) {
      const error = (predicted[c] - (c === sample.label ? 1 : 0)) / samples.length;
      biases[c] += error;
      for (let i = 0; i < INPUTS; i++) {
        weights[c][i] += (sample.pixels[i] / 255) * error;
      }
    }
  }
  return { weights, biases };
}

/** Moves every number a fraction of the way along its nudge. */
export function applyNudge(
  network: Network,
  nudge: Nudge,
  rate: number,
): Network {
  return {
    classes: network.classes,
    weights: network.weights.map((row, c) =>
      row.map((w, i) => w - rate * nudge.weights[c][i]),
    ),
    biases: network.biases.map((b, c) => b - rate * nudge.biases[c]),
  };
}

export type Report = {
  loss: number;
  accuracy: number;
  /** Average belief placed on the right answer. */
  confidence: number;
};

export function evaluate(network: Network, samples: Sample[]): Report {
  if (samples.length === 0) return { loss: 0, accuracy: 0, confidence: 0 };
  let loss = 0;
  let correct = 0;
  let confidence = 0;
  for (const sample of samples) {
    const shares = toShares(score(network, sample.pixels));
    loss += surprise(shares[sample.label]);
    confidence += shares[sample.label];
    if (argmax(shares) === sample.label) correct += 1;
  }
  const n = samples.length;
  return { loss: loss / n, accuracy: correct / n, confidence: confidence / n };
}

/**
 * Keeps the last drawing of each character out of training, so there is always
 * something the network has genuinely never seen to test it against.
 */
export function holdOneOfEachBack(samples: Sample[], classes: number) {
  const held: Sample[] = [];
  const train: Sample[] = [];
  const spent = new Set<number>();
  for (let i = samples.length - 1; i >= 0; i--) {
    const sample = samples[i];
    if (!spent.has(sample.label) && spent.size < classes) {
      spent.add(sample.label);
      held.unshift(sample);
    } else {
      train.unshift(sample);
    }
  }
  return { train, held };
}
