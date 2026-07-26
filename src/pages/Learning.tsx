import { Suspense, lazy, useMemo } from "react";
import { AveragingNudges } from "../components/AveragingNudges";
import { OneNudge } from "../components/OneNudge";
import { TrainOneDrawing } from "../components/TrainOneDrawing";
import { TrainingRun } from "../components/TrainingRun";
import {
  createNetwork,
  holdOneOfEachBack,
  INPUTS,
  type Sample,
} from "../lib/network";
import { seedDrawings, seedMatrices, seedNetwork } from "../lib/pyodide";
import type { Dataset } from "../types";

const PythonLab = lazy(() =>
  import("../components/PythonLab").then((m) => ({ default: m.PythonLab })),
);

const torchFor = (classes: number) => `import torch.nn as nn, torch.optim as optim

layer = nn.Linear(${INPUTS}, ${classes})
loss_fn = nn.CrossEntropyLoss()                 # the surprise, from stage 05
optimiser = optim.SGD(layer.parameters(), lr=0.5)

for step in range(400):
    loss = loss_fn(layer(X), y)   # how wrong are we?
    loss.backward()               # work out every nudge
    optimiser.step()              # move every number
    optimiser.zero_grad()         # forget the nudges, ready for next time`;

const STEPS = [
  {
    title: "how far off is every guess?",
    lead: "Subtract what it should have said from what it did say. Positive means too keen on that character, negative means not keen enough. This single table drives everything else.",
    code: `import numpy as np

def shares(s):
    lifted = np.exp(s - s.max(axis=1, keepdims=True))
    return lifted / lifted.sum(axis=1, keepdims=True)

P = shares(X @ W + b)
should_be = np.eye(len(names))[y]   # 1 for the right character, 0 for the rest
error = P - should_be

print("said:      ", np.round(P[0], 3))
print("should say:", should_be[0])
print("off by:    ", np.round(error[0], 3))`,
  },
  {
    title: "turn that into a nudge for all 512 numbers",
    lead: "X.T @ error is the whole update rule: for every square and every character, how much ink was there multiplied by how far off that character was — added up over every drawing.",
    code: `nudge_W = X.T @ error / len(y)
nudge_b = error.mean(axis=0)

print("nudge_W:", nudge_W.shape, "— one number per square, per character")
print("biggest single nudge:", round(float(np.abs(nudge_W).max()), 5))

# belief has to total 100%, so what one character gains the others lose
print("do the nudges cancel out across characters?",
      np.allclose(nudge_W.sum(axis=1), 0))`,
  },
  {
    title: "take one step",
    lead: "Move every number a fraction of the way along its nudge, then measure again. One step, and the loss has already come down.",
    code: `def loss_now(W, b):
    P = shares(X @ W + b)
    return -np.log(P[np.arange(len(y)), y]).mean()

print("before:", round(float(loss_now(W, b)), 4))

rate = 0.5
W = W - rate * nudge_W
b = b - rate * nudge_b

print("after: ", round(float(loss_now(W, b)), 4))`,
  },
  {
    title: "now do it four hundred times",
    lead: "That is the entire training loop. Everything else in machine learning is a variation on these five lines.",
    code: `for step in range(400):
    P = shares(X @ W + b)
    error = P - np.eye(len(names))[y]
    W = W - 0.5 * (X.T @ error / len(y))
    b = b - 0.5 * error.mean(axis=0)

    if step % 100 == 0 or step == 399:
        P = shares(X @ W + b)
        truth = P[np.arange(len(y)), y]
        print(f"step {step:3d}   loss {-np.log(truth).mean():.4f}"
              f"   right {(P.argmax(1) == y).mean():.0%}"
              f"   sure {truth.mean():.0%}")`,
  },
];

type Props = {
  dataset: Dataset;
  onBuildAlphabet: () => void;
};

export function Learning({ dataset, onBuildAlphabet }: Props) {
  const classes = dataset.glyphs.length;
  const start = useMemo(() => createNetwork(Math.max(classes, 1)), [classes]);

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

  const prepare = async () => {
    const labelIndex = new Map(dataset.glyphs.map((g, i) => [g.id, i]));
    await seedDrawings({
      drawings: dataset.specimens.flatMap((s) => s.pixels),
      labels: dataset.specimens.map((s) => labelIndex.get(s.glyphId) ?? -1),
      names: dataset.glyphs.map((g) => g.label),
    });
    await seedMatrices(INPUTS);
    await seedNetwork(start.weights, start.biases);
  };

  if (samples.length < 4 || classes < 2) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-20">
        <p className="eyebrow">Learning</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-[-0.02em]">
          Not enough to learn from yet
        </h1>
        <button
          type="button"
          onClick={onBuildAlphabet}
          className="mt-6 bg-ink px-6 py-3 font-mono text-xs tracking-[0.14em] text-paper uppercase transition-colors hover:bg-plot"
        >
          Go and draw some more
        </button>
      </div>
    );
  }

  const first = samples[0];
  const opposite = samples.find((s) => s.label !== first.label) ?? samples[1];
  const inked = first.pixels.findIndex((v) => v > 120);
  const sameCharacter = samples.filter((s) => s.label === first.label);

  return (
    <div className="mx-auto max-w-3xl px-5 pb-20">
      <header className="pt-14">
        <p className="eyebrow">Learning</p>
        <h1 className="mt-1 font-display text-3xl leading-[1.15] font-extrabold tracking-[-0.02em] sm:text-4xl">
          Being told off, {INPUTS * classes + classes} numbers at a time
        </h1>
        <p className="lede measure mt-6">
          You have a number that says how wrong the network is. Now the question
          that sounds impossible: how can one number tell{" "}
          {INPUTS * classes + classes} separate numbers which way to move?
        </p>
        <p className="body-text measure mt-4">
          For a network with no hidden layer the answer needs no mathematics at
          all. It fits in one sentence.
        </p>
        <p className="claim mt-7">
          Where there was ink, push the right character's scorecard up and the
          wrong one's down — in proportion to how badly you missed.
        </p>
      </header>

      <section className="mt-14">
        <h2 className="section-title">One square, one telling-off</h2>
        <p className="body-text measure mt-3">
          Take a drawing the network gets wrong, and look again at a single
          square. Two things decide how far its number moves: how much ink is in
          that square, and how far off the guess was. Multiply them.
        </p>
        <div className="mt-7">
          <OneNudge
            sample={first}
            glyphs={dataset.glyphs}
            network={start}
            square={inked === -1 ? 0 : inked}
            rate={0.5}
          />
        </div>
        <p className="body-text measure mt-5">
          Notice what happens to blank squares. Ink of <code>0</code> times any
          error is <code>0</code>, so squares you never drew on are left
          untouched. The network only ever learns about places you put ink.
        </p>
      </section>

      <section className="mt-14">
        <h2 className="section-title">Nudge the same drawing over and over</h2>
        <p className="body-text measure mt-3">
          Apply that rule to one drawing, repeatedly, and watch what happens to
          how much the network believes it.
        </p>
        <div className="mt-7">
          <TrainOneDrawing
            sample={first}
            other={opposite}
            glyphs={dataset.glyphs}
            start={start}
          />
        </div>
        <p className="body-text measure mt-5">
          It becomes certain within a handful of nudges — and useless at
          everything else. Being told about one drawing over and over does not
          teach a character; it teaches that drawing.
        </p>
      </section>

      <section className="mt-14">
        <h2 className="section-title">How disagreement cancels itself out</h2>
        <p className="body-text measure mt-3">
          This is the part worth staring at, because it is where memorising
          turns into understanding.
        </p>
        <p className="body-text measure mt-4">
          The nudge asked for by a single drawing is simply that drawing — you
          can see the strokes in it. But your drawings are all slightly
          different, so each one asks for something slightly different. Average
          them, and everywhere they disagree the colours cancel towards nothing,
          while everywhere they agree they pile up.
        </p>
        <div className="mt-7">
          <AveragingNudges
            samples={sameCharacter}
            glyph={dataset.glyphs[first.label]}
            classIndex={first.label}
            network={start}
          />
        </div>
        <p className="claim mt-8">
          Nobody decided which parts of your handwriting mattered. The parts
          that varied deleted themselves.
        </p>
        <p className="body-text measure mt-6">
          That is the whole trick behind learning a character instead of a
          drawing — and it is also why more drawings, drawn more differently,
          make a better network. Every extra one gives the accidents another
          chance to cancel.
        </p>
      </section>

      <section className="mt-14">
        <h2 className="section-title">Train on everything</h2>
        <p className="body-text measure mt-3">
          Now the real thing: work out the nudge across every drawing at once,
          take one small step, and repeat. The teal line is the loss on the
          drawings it is learning from. The pink line is the loss on{" "}
          {held.length} drawing{held.length === 1 ? "" : "s"} deliberately kept
          back, which it never gets to learn from — the only honest test of
          whether it has understood anything.
        </p>
        <div className="mt-7">
          <TrainingRun
            start={start}
            train={train}
            held={held}
            glyphs={dataset.glyphs}
          />
        </div>
        <p className="body-text measure mt-5">
          Watch the order things happen in. It gets every drawing right within a
          couple of steps, and then keeps going for hundreds more — because
          being <em>right</em> and being <em>sure</em> are different, and the
          loss only stops complaining about the second one slowly.
        </p>
        <p className="body-text measure mt-4">
          Push the step size up and the curve will start to thrash: too big a
          step overshoots the bottom and lands further up the other side. Push
          it down and progress becomes glacial. That one dial is called the{" "}
          <strong>learning rate</strong>, and choosing it is most of what tuning
          a network feels like.
        </p>
        <p className="body-text measure mt-4">
          If the pink line stops falling while the teal one keeps going, the
          network has started memorising your particular drawings rather than
          learning the characters. That is <strong>overfitting</strong>, and
          more drawings is the usual cure.
        </p>
      </section>

      <section className="mt-14">
        <h2 className="section-title">What all this is called</h2>
        <p className="body-text measure mt-3">
          Walking downhill by repeatedly taking a small step in the direction
          that reduces the loss is <strong>gradient descent</strong>. The nudge
          you have been computing is the <strong>gradient</strong>. One pass
          over your drawings is an <strong>epoch</strong>. The thing that
          applies the step is an <strong>optimiser</strong>.
        </p>
        <p className="body-text measure mt-4">
          One word deserves an honest answer:{" "}
          <strong>backpropagation</strong>. You have not used it. With a single
          layer, blame travels straight from the loss to the numbers in one
          move, which is why the rule fitted in a sentence. Backpropagation is
          what you need once layers are stacked: each layer works out its own
          blame, hands what is left to the layer before it, and the same rule
          runs backwards through the whole chain. It is this idea repeated, not
          a different one — but this network is too simple to show it to you,
          and pretending otherwise would be a lie.
        </p>
      </section>

      <section className="mt-14">
        <h2 className="section-title">Write the training loop yourself</h2>
        <p className="body-text measure mt-3">
          Four cells and you will have trained it by hand, starting from the
          same numbers the page above started from.
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
              steps={STEPS}
              prepare={prepare}
              closing="That loop is the whole of it. Next: draw something it has never seen, and find out whether any of this worked."
            />
          </Suspense>
        </div>
      </section>

      <section className="mt-14 border-t pt-10 hairline">
        <h2 className="section-title">The same loop, in PyTorch</h2>
        <p className="body-text measure mt-3">
          Every line you wrote by hand has a name in the real library. You still
          cannot run this here, but you can now read it — and none of it is
          mysterious any more.
        </p>
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
          <code>loss.backward()</code> is the nudge you computed with{" "}
          <code>X.T @ error</code>. <code>optimiser.step()</code> is the
          subtraction. <code>zero_grad()</code> exists because PyTorch adds
          nudges up rather than replacing them, so you have to clear them
          between rounds — forgetting it is the most common bug in the language.
        </p>
      </section>
    </div>
  );
}
