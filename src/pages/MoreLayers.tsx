import { Suspense, lazy, useMemo, useState } from "react";
import { BlameFlow } from "../components/BlameFlow";
import { WeightMap } from "../components/Grids";
import { createDeep, reportDeep, trainStep, type Deep } from "../lib/deep";
import {
  applyNudge,
  createNetwork,
  evaluate,
  holdOneOfEachBack,
  INPUTS,
  nudgeFor,
  type Sample,
} from "../lib/network";
import { seedDrawings, seedMatrices } from "../lib/pyodide";
import type { Dataset } from "../types";

const PythonLab = lazy(() =>
  import("../components/PythonLab").then((m) => ({ default: m.PythonLab })),
);

const UNITS = 8;
const ROUNDS = 400;

const torchFor = (classes: number) => `import torch.nn as nn

net = nn.Sequential(
    nn.Linear(${INPUTS}, ${UNITS}),   # the ${UNITS} units, each with its own picture
    nn.ReLU(),           # negatives become zero
    nn.Linear(${UNITS}, ${classes}),     # the vote at the end
)

loss = loss_fn(net(X), y)
loss.backward()          # this one line is the whole of backpropagation`;

const stepsFor = (classes: number) => [
  {
    title: "two sets of numbers instead of one",
    lead: `W1 holds one picture per hidden unit. W2 holds each character's opinion of each unit. The drawing never reaches W2 — only what the units reported.`,
    code: `import numpy as np
rng = np.random.default_rng(11)

W1 = rng.normal(0, np.sqrt(2 / ${INPUTS}), (${INPUTS}, ${UNITS}))
b1 = np.zeros(${UNITS})
W2 = rng.normal(0, np.sqrt(2 / ${UNITS}), (${UNITS}, ${classes}))
b2 = np.zeros(${classes})

print("W1:", W1.shape, " W2:", W2.shape)
print("numbers in total:", W1.size + b1.size + W2.size + b2.size)`,
  },
  {
    title: "forwards, through both",
    lead: "Total up the first layer, set negatives to zero, then total up the second. Two multiply-and-adds with a bend in between.",
    code: `raw = X @ W1 + b1
reported = np.maximum(0, raw)        # this is ReLU, in full
scores = reported @ W2 + b2

print("raw:      ", raw.shape)
print("switched off:", int((raw <= 0).sum()), "of", raw.size, "unit readings")
print("scores:   ", scores.shape)`,
  },
  {
    title: "backwards — the chain rule, without the name",
    lead: "The error lands on the output layer. It is handed back to the units in proportion to how much the output leaned on them, and units that were off are struck out.",
    code: `def shares(s):
    e = np.exp(s - s.max(axis=1, keepdims=True))
    return e / e.sum(axis=1, keepdims=True)

error = shares(scores) - np.eye(len(names))[y]        # blame at the output

blame_at_units = error @ W2.T                # handed backwards
blame_at_units = blame_at_units * (raw > 0)  # off means blameless

print("blame at the output:", error.shape)
print("blame at the units: ", blame_at_units.shape)
print("struck out:", int((blame_at_units == 0).sum()), "of", blame_at_units.size)`,
  },
  {
    title: "both layers, nudged",
    lead: "Each layer now uses the same rule as before — what came in, times how far off it was. The only new idea was working out that second blame.",
    code: `rate = 0.5
n = len(y)

W2 -= rate * (reported.T @ error / n)
b2 -= rate * error.mean(axis=0)
W1 -= rate * (X.T @ blame_at_units / n)
b1 -= rate * blame_at_units.mean(axis=0)

print("both layers moved.")
print("that is backpropagation, in four lines.")`,
  },
];

type Props = {
  dataset: Dataset;
  onBuildAlphabet: () => void;
};

export function MoreLayers({ dataset, onBuildAlphabet }: Props) {
  const classes = dataset.glyphs.length;
  const [trained, setTrained] = useState<Deep | null>(null);

  const samples: Sample[] = useMemo(
    () =>
      dataset.specimens.map((s) => ({
        pixels: s.pixels,
        label: dataset.glyphs.findIndex((g) => g.id === s.glyphId),
      })),
    [dataset],
  );
  const { train, held } = useMemo(
    () => holdOneOfEachBack(samples, classes),
    [samples, classes],
  );

  const fresh = useMemo(
    () => createDeep(Math.max(classes, 1), UNITS),
    [classes],
  );

  // How the one-layer network from stage 06 does, for comparison.
  const flat = useMemo(() => {
    let net = createNetwork(Math.max(classes, 1));
    for (let i = 0; i < ROUNDS; i++) net = applyNudge(net, nudgeFor(net, train), 0.5);
    return net;
  }, [train, classes]);

  const prepare = async () => {
    const labelIndex = new Map(dataset.glyphs.map((g, i) => [g.id, i]));
    await seedDrawings({
      drawings: dataset.specimens.flatMap((s) => s.pixels),
      labels: dataset.specimens.map((s) => labelIndex.get(s.glyphId) ?? -1),
      names: dataset.glyphs.map((g) => g.label),
    });
    await seedMatrices(INPUTS);
  };

  if (samples.length < 4 || classes < 2) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-20">
        <p className="eyebrow">More layers</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-[-0.02em]">
          Nothing to stack yet
        </h1>
        <button
          type="button"
          onClick={onBuildAlphabet}
          className="mt-6 bg-ink px-6 py-3 font-mono text-xs tracking-[0.14em] text-paper uppercase transition-colors hover:bg-plot"
        >
          Go and invent an alphabet
        </button>
      </div>
    );
  }

  const flatTrain = evaluate(flat, train);
  const flatHeld = evaluate(flat, held);
  const deepTrain = trained ? reportDeep(trained, train) : null;
  const deepHeld = trained ? reportDeep(trained, held) : null;

  function run() {
    let net = fresh;
    for (let i = 0; i < ROUNDS; i++) net = trainStep(net, train, 0.5);
    setTrained(net);
  }

  return (
    <div className="mx-auto max-w-3xl px-5 pb-20">
      <header className="pt-14">
        <p className="eyebrow">More layers</p>
        <h1 className="mt-1 font-display text-3xl leading-[1.15] font-extrabold tracking-[-0.02em] sm:text-4xl">
          Blame that has to travel
        </h1>
        <p className="lede measure mt-6">
          Everything so far had one layer, which is why the rule fitted in a
          sentence: the loss touched the numbers directly. Stack a second layer
          in and that stops being true — and the thing you need to fix it is
          backpropagation.
        </p>
      </header>

      <section className="mt-14">
        <h2 className="section-title">First, the honest part</h2>
        <p className="body-text measure mt-3">
          Your one-layer network already gets{" "}
          <code>{(flatTrain.accuracy * 100).toFixed(0)}%</code> of its training
          drawings and <code>{(flatHeld.accuracy * 100).toFixed(0)}%</code> of
          the held-back ones right. There is nothing here for a bigger network
          to fix. Adding layers will not help you, and this page is not going to
          pretend otherwise.
        </p>
        <p className="body-text measure mt-4">
          Layers earn their keep when one weighted vote over the pixels cannot
          separate the answers — photographs, handwriting from thousands of
          people, an alphabet of fifty characters. {classes} of your marks,
          drawn by one hand, is not that. What follows is worth doing anyway,
          because backpropagation is the one idea in this whole subject you
          cannot skip.
        </p>
      </section>

      <section className="mt-14">
        <h2 className="section-title">What a middle row does</h2>
        <p className="body-text measure mt-3">
          Instead of {classes} scorecards reading the drawing directly, put{" "}
          <code>{UNITS}</code> units in between. Each one has its own{" "}
          <code>{INPUTS}</code> numbers — its own picture, exactly like a
          scorecard — and each reports a single number: how much it saw its own
          pattern. The output layer then votes on those {UNITS} reports and
          never looks at the drawing at all.
        </p>
        <p className="body-text measure mt-4">
          One rule has to be added, or the whole thing collapses. If a unit
          simply passed its total along, two layers of multiply-and-add would
          flatten into a single layer and you would have gained nothing at all.
          So each unit does one crude thing first:{" "}
          <strong>if its total came out negative, it reports zero</strong>. That
          bend is the entire reason stacking works, and it is called{" "}
          <strong>ReLU</strong>.
        </p>
      </section>

      <section className="mt-14">
        <h2 className="section-title">Watch the blame travel</h2>
        <p className="body-text measure mt-3">
          The loss can only speak to the output layer — it has no idea the
          hidden units exist. So the output layer works out its own error, then
          hands each unit a share of it, sized by how heavily it was leaning on
          that unit. Step through it.
        </p>
        <div className="mt-7">
          <BlameFlow net={fresh} sample={samples[0]} glyphs={dataset.glyphs} />
        </div>
        <p className="claim mt-8">
          That handing-back is backpropagation. Each layer works out its own
          blame, then passes the rest to the layer behind it.
        </p>
        <p className="body-text measure mt-6">
          With a hundred layers it is the same move, ninety-nine more times. The
          blame gets thinner the further back it travels, which is precisely why
          very deep networks were hard to train for decades.
        </p>
      </section>

      <section className="mt-14">
        <h2 className="section-title">Train it, and compare</h2>
        <p className="body-text measure mt-3">
          Same {ROUNDS} rounds, same step size, same drawings — just with a
          middle row of {UNITS} units and blame that has to travel.
        </p>
        <button
          type="button"
          onClick={run}
          className="mt-5 bg-ink px-6 py-3 font-mono text-xs tracking-[0.14em] text-paper uppercase transition-colors hover:bg-plot"
        >
          {trained ? "Train it again" : `Train the two-layer network`}
        </button>

        {trained && deepTrain && deepHeld && (
          <>
            <div className="mt-7 overflow-x-auto border bg-paper-raised p-5 hairline">
              <table className="w-full font-mono text-xs">
                <thead>
                  <tr className="border-b text-left text-graphite hairline">
                    <th className="pb-2 font-normal">network</th>
                    <th className="pb-2 text-right font-normal">numbers</th>
                    <th className="pb-2 text-right font-normal">loss</th>
                    <th className="pb-2 text-right font-normal">trained on</th>
                    <th className="pb-2 text-right font-normal">never seen</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b hairline">
                    <td className="py-2.5">one layer</td>
                    <td className="py-2.5 text-right">
                      {INPUTS * classes + classes}
                    </td>
                    <td className="py-2.5 text-right">
                      {flatTrain.loss.toFixed(4)}
                    </td>
                    <td className="py-2.5 text-right">
                      {(flatTrain.accuracy * 100).toFixed(0)}%
                    </td>
                    <td className="py-2.5 text-right">
                      {(flatHeld.accuracy * 100).toFixed(0)}%
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5">two layers</td>
                    <td className="py-2.5 text-right">
                      {INPUTS * UNITS + UNITS + UNITS * classes + classes}
                    </td>
                    <td className="py-2.5 text-right">
                      {deepTrain.loss.toFixed(4)}
                    </td>
                    <td className="py-2.5 text-right">
                      {(deepTrain.accuracy * 100).toFixed(0)}%
                    </td>
                    <td className="py-2.5 text-right">
                      {(deepHeld.accuracy * 100).toFixed(0)}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="body-text measure mt-5">
              Four times the numbers, and on this dataset it buys you nothing
              worth having. That is the lesson: capacity is not free, and a
              bigger network on a small dataset mostly learns the dataset.
            </p>

            <p className="eyebrow mt-8">
              What each unit ended up looking for
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              {trained.hidden.map((weights, h) => (
                <figure key={h} className="w-20">
                  <WeightMap weights={weights} />
                  <figcaption className="pt-1 text-center font-mono text-[0.625rem] text-graphite">
                    #{h}
                  </figcaption>
                </figure>
              ))}
            </div>
            <p className="body-text measure mt-4">
              Some units picked up a piece of a character; others never fired
              much and stayed close to the noise they started with. Nobody
              assigned them jobs — they divided the work up on their own, which
              is the part that still feels like magic and is not.
            </p>
          </>
        )}
      </section>

      <section className="mt-14">
        <h2 className="section-title">Write it yourself</h2>
        <p className="body-text measure mt-3">
          Four cells: two layers forwards, the blame backwards, and both layers
          nudged. The middle one is backpropagation, and it is a single line.
        </p>
        <div className="mt-8">
          <Suspense
            fallback={
              <p className="font-mono text-xs text-graphite">
                Loading the editor…
              </p>
            }
          >
            <PythonLab
              steps={stepsFor(classes)}
              prepare={prepare}
              closing="You have now written backpropagation. Every deep network ever trained is that same handing-back, repeated once per layer."
            />
          </Suspense>
        </div>
      </section>

      <section className="mt-14 border-t pt-10 hairline">
        <h2 className="section-title">And in PyTorch</h2>
        <pre className="mt-5 overflow-x-auto border bg-paper-raised p-4 font-mono text-xs leading-relaxed hairline">
          {torchFor(classes).split("\n").map((line, i) => (
            <div
              key={i}
              className={line.trimStart().startsWith("#") ? "text-graphite" : ""}
            >
              {line || " "}
            </div>
          ))}
        </pre>
        <p className="body-text measure mt-5">
          <code>loss.backward()</code> walks the whole stack for you, handing
          blame back layer by layer, however deep it goes. It is doing exactly
          what you just wrote by hand — no more, and nothing hidden.
        </p>
      </section>
    </div>
  );
}
