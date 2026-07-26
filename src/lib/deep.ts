import { INPUTS, toShares, type Sample } from "./network";

/**
 * A network with one hidden layer.
 *
 * The first layer's numbers still belong one-to-one with the squares of the
 * drawing, so every hidden unit remains a picture you can look at. The second
 * layer never sees the drawing at all — only what the hidden units reported.
 */
export type Deep = {
  /** hidden[h][i] — unit h's opinion of square i. */
  hidden: number[][];
  hiddenBias: number[];
  /** output[c][h] — how much character c leans on unit h. */
  output: number[][];
  outputBias: number[];
  units: number;
  classes: number;
};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createDeep(classes: number, units = 8, seed = 11): Deep {
  const random = mulberry32(seed);
  // Wider layers need smaller starting numbers, or the totals arrive huge.
  const spread = (fan: number) => Math.sqrt(2 / fan);
  return {
    units,
    classes,
    hidden: Array.from({ length: units }, () =>
      Array.from({ length: INPUTS }, () => (random() - 0.5) * 2 * spread(INPUTS)),
    ),
    hiddenBias: new Array(units).fill(0),
    output: Array.from({ length: classes }, () =>
      Array.from({ length: units }, () => (random() - 0.5) * 2 * spread(units)),
    ),
    outputBias: new Array(classes).fill(0),
  };
}

export type Pass = {
  /** What each unit totalled up before being switched off or not. */
  raw: number[];
  /** The same, with negatives set to zero. This is what it reports onward. */
  reported: number[];
  scores: number[];
  shares: number[];
};

/** Ink goes in, each unit reports, the output layer decides. */
export function forward(net: Deep, pixels: number[]): Pass {
  const raw = net.hidden.map((row, h) => {
    let total = net.hiddenBias[h];
    for (let i = 0; i < INPUTS; i++) total += (pixels[i] / 255) * row[i];
    return total;
  });
  // Negative means "I did not see my pattern", and a unit that saw nothing
  // says nothing. This is the whole of ReLU.
  const reported = raw.map((v) => Math.max(0, v));
  const scores = net.output.map((row, c) => {
    let total = net.outputBias[c];
    for (let h = 0; h < net.units; h++) total += reported[h] * row[h];
    return total;
  });
  return { raw, reported, scores, shares: toShares(scores) };
}

export type Blame = {
  /** How far off each character's answer was. */
  atOutput: number[];
  /** Each unit's share of the fault, before the switched-off ones are cut. */
  passedBack: number[];
  /** The same, after units that were switched off are zeroed. */
  atHidden: number[];
};

/**
 * Backpropagation, for one drawing.
 *
 * The loss only ever touches the output layer. Everything the hidden layer
 * knows about its mistake arrives second hand: a unit is blamed in proportion
 * to how heavily the output layer was leaning on it. A unit that was switched
 * off contributed nothing, so it is blamed for nothing.
 */
export function blameFor(net: Deep, pass: Pass, label: number): Blame {
  const atOutput = pass.shares.map((p, c) => p - (c === label ? 1 : 0));
  const passedBack = new Array(net.units).fill(0);
  for (let h = 0; h < net.units; h++) {
    for (let c = 0; c < net.classes; c++) {
      passedBack[h] += net.output[c][h] * atOutput[c];
    }
  }
  const atHidden = passedBack.map((v, h) => (pass.raw[h] > 0 ? v : 0));
  return { atOutput, passedBack, atHidden };
}

export function trainStep(net: Deep, samples: Sample[], rate: number): Deep {
  const dHidden = net.hidden.map((row) => row.map(() => 0));
  const dHiddenBias = new Array(net.units).fill(0);
  const dOutput = net.output.map((row) => row.map(() => 0));
  const dOutputBias = new Array(net.classes).fill(0);

  for (const sample of samples) {
    const pass = forward(net, sample.pixels);
    const blame = blameFor(net, pass, sample.label);
    const share = 1 / samples.length;

    for (let c = 0; c < net.classes; c++) {
      dOutputBias[c] += blame.atOutput[c] * share;
      for (let h = 0; h < net.units; h++) {
        dOutput[c][h] += pass.reported[h] * blame.atOutput[c] * share;
      }
    }
    for (let h = 0; h < net.units; h++) {
      if (blame.atHidden[h] === 0) continue;
      dHiddenBias[h] += blame.atHidden[h] * share;
      for (let i = 0; i < INPUTS; i++) {
        dHidden[h][i] += (sample.pixels[i] / 255) * blame.atHidden[h] * share;
      }
    }
  }

  return {
    units: net.units,
    classes: net.classes,
    hidden: net.hidden.map((row, h) => row.map((w, i) => w - rate * dHidden[h][i])),
    hiddenBias: net.hiddenBias.map((b, h) => b - rate * dHiddenBias[h]),
    output: net.output.map((row, c) => row.map((w, h) => w - rate * dOutput[c][h])),
    outputBias: net.outputBias.map((b, c) => b - rate * dOutputBias[c]),
  };
}

export function reportDeep(net: Deep, samples: Sample[]) {
  if (samples.length === 0) return { loss: 0, accuracy: 0 };
  let loss = 0;
  let correct = 0;
  for (const sample of samples) {
    const pass = forward(net, sample.pixels);
    loss += -Math.log(Math.max(pass.shares[sample.label], 1e-12));
    let best = 0;
    for (let c = 1; c < pass.scores.length; c++) {
      if (pass.scores[c] > pass.scores[best]) best = c;
    }
    if (best === sample.label) correct += 1;
  }
  return { loss: loss / samples.length, accuracy: correct / samples.length };
}
