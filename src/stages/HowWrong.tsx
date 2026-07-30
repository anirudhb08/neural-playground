import { Suspense, lazy, useMemo } from "react";
import { SHIFT, SoftmaxSteps } from "../components/SoftmaxSteps";
import { SurpriseCurve } from "../components/SurpriseCurve";
import { Thumb } from "../components/Thumb";
import {
  averageSurprise,
  chanceLevel,
  createNetwork,
  INPUTS,
  score,
  toShares,
} from "../lib/network";
import { seedDrawings, seedMatrices, seedNetwork } from "../lib/pyodide";
import type { Dataset } from "../types";

const PythonLab = lazy(() =>
  import("../components/PythonLab").then((m) => ({ default: m.PythonLab })),
);

const STEPS = [
  {
    title: "scores are not answers",
    lead: "One drawing's scores, converted by hand. Raise e to the power of each one so they are all positive, add those up, then divide each by that total. Nothing else happens.",
    code: `import numpy as np

scores = X @ W + b
row = scores[0]
print("raw scores: ", np.round(row, 3))

lifted = np.exp(row)              # e to the power of each score
total = lifted.sum()

print("e^score:    ", np.round(lifted, 3))
print("their total:", round(float(total), 3))

shares = lifted / total
print("as shares:  ", np.round(shares, 3))
print("summing to: ", round(float(shares.sum()), 3))`,
  },
  {
    title: "why the real version subtracts the biggest score",
    lead: "Adding the same amount to every score cannot change the shares. That is fortunate, because exp() runs out of room quickly, and subtracting the largest score first is what keeps it in range. The last two lines are what that is protecting you from.",
    code: `bumped = np.exp(row + 100)
print("shares after +100:", np.round(bumped / bumped.sum(), 3))
print("identical to before:", np.allclose(bumped / bumped.sum(), shares))

# So: subtract the largest score first. Same answer, nothing enormous.
safe = np.exp(row - row.max())
print("shares, safely:   ", np.round(safe / safe.sum(), 3))

# Here is what that is protecting you from.
print("e^800 is", np.exp(800.0))

lost = np.exp(row + 800)
print("shares without it:", lost / lost.sum())`,
  },
  {
    title: "the same thing for every drawing at once",
    lead: "Both moves again, on all your drawings in one go, with the max subtracted for the reason above. keepdims=True is the only fiddly part: it keeps the result shaped so NumPy divides each row by its own total rather than by one number.",
    code: `lifted = np.exp(scores - scores.max(axis=1, keepdims=True))
P = lifted / lifted.sum(axis=1, keepdims=True)

print("P:", P.shape)
print("every row sums to 1:", np.allclose(P.sum(axis=1), 1))
print("first drawing:", P[0])`,
  },
  {
    title: "how much did it believe the right answer?",
    lead: "y says which character each drawing really is. This picks out, for every drawing, the share the network gave to that answer — and ignores the rest.",
    code: `truth = P[np.arange(len(y)), y]

print("belief in the right answer, per drawing:")
print(np.round(truth, 3))
print("worst:", round(float(truth.min()), 3))
print("best: ", round(float(truth.max()), 3))`,
  },
  {
    title: "one number for the whole set",
    lead: "Take the cost of each drawing, then average. A network that knows nothing lands on log(number of characters). That is the number to beat.",
    code: `cost = -np.log(truth)
loss = cost.mean()

print("cost per drawing:", np.round(cost, 3))
print("loss:", round(float(loss), 4))
print("a network that knows nothing:", round(float(np.log(len(names))), 4))`,
  },
];

type Props = {
  dataset: Dataset;
  onBuildAlphabet: () => void;
};

export function HowWrong({ dataset, onBuildAlphabet }: Props) {
  const classes = dataset.glyphs.length;
  const network = useMemo(
    () => createNetwork(Math.max(classes, 1)),
    [classes],
  );

  const samples = dataset.specimens.map((s) => ({
    pixels: s.pixels,
    label: dataset.glyphs.findIndex((g) => g.id === s.glyphId),
  }));

  const prepare = async () => {
    const labelIndex = new Map(dataset.glyphs.map((g, i) => [g.id, i]));
    await seedDrawings({
      drawings: dataset.specimens.flatMap((s) => s.pixels),
      labels: dataset.specimens.map((s) => labelIndex.get(s.glyphId) ?? -1),
      names: dataset.glyphs.map((g) => g.label),
    });
    await seedMatrices(INPUTS);
    await seedNetwork(network.weights, network.biases);
  };

  if (samples.length === 0 || classes < 2) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-20">
        <p className="eyebrow">How wrong is it?</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-[-0.02em]">
          Nothing to measure yet
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

  const first = samples[0];
  const raw = score(network, first.pixels);
  const shares = toShares(raw);
  const loss = averageSurprise(network, samples);
  const chance = chanceLevel(classes);

  return (
    <div className="mx-auto max-w-3xl px-5 pb-20">
      <header className="pt-14">
        <p className="eyebrow">How wrong is it?</p>
        <h1 className="mt-1 font-display text-3xl leading-[1.15] font-extrabold tracking-[-0.02em] sm:text-4xl">
          You cannot fix what you cannot measure
        </h1>
        <p className="lede measure mt-6">
          The network guesses, and mostly guesses wrong. To make it better, we
          first need to say <em>how</em> wrong — as a single number that gets
          smaller as it improves.
        </p>
        <p className="body-text measure mt-4">
          Nothing on this page learns anything. This is only the measuring
          stick. Building it is most of the work; once you have it, improving
          the network turns out to be surprisingly mechanical.
        </p>
      </header>

      <section className="mt-14">
        <h2 className="section-title">Scores are not answers</h2>
        <p className="body-text measure mt-3">
          The network hands back a score per character. For this drawing it said{" "}
          {dataset.glyphs.map((g, c) => (
            <span key={g.id}>
              {c > 0 && (c === classes - 1 ? " and " : ", ")}
              <code>
                {raw[c] >= 0 ? "+" : ""}
                {raw[c].toFixed(3)}
              </code>{" "}
              for {g.label}
            </span>
          ))}
          . Those numbers are not percentages, they have no ceiling, and they
          could just as easily have been <code>+412</code> and{" "}
          <code>−9</code>. Nothing can be measured against them yet.
        </p>
        <p className="body-text measure mt-4">
          Shares of 100% would be measurable, and two moves produce them. Raise{" "}
          <code>e</code> — that constant, 2.718… — to the power of each score,
          which makes every one of them positive, since no share of anything is
          negative. Then divide each result by the total of them all. That pair
          of moves is called <strong>softmax</strong>, and here it is in full on
          your network's real scores.
        </p>

        <div className="mt-7">
          <SoftmaxSteps
            labels={dataset.glyphs.map((g) => g.label)}
            scores={raw}
            truth={first.label}
          >
            <div className="mb-5 flex items-center gap-4 border-b pb-4 hairline">
              <div className="h-16 w-16 shrink-0 border bg-paper hairline">
                <Thumb pixels={first.pixels} />
              </div>
              <p className="caption">
                This drawing really is{" "}
                <strong>{dataset.glyphs[first.label].label}</strong>, and every
                number below is the network's own.
              </p>
            </div>
          </SoftmaxSteps>
        </div>

        <p className="body-text measure mt-5">
          Two things show up as you drag. The exponent turns the <em>gap</em>{" "}
          between two scores into a <em>ratio</em> — one point of score is always
          worth about 2.7 times the belief, wherever the two sit. And adding{" "}
          {SHIFT} to all of them changes nothing whatever, because the extra
          factor lands above and below the line and cancels. Which is why real
          code subtracts the largest score before exponentiating, as the cells
          below do: it keeps <code>exp</code> from overflowing, and it cannot
          change the answer.
        </p>
      </section>

      <section className="mt-14">
        <h2 className="section-title">How wrong is one guess?</h2>
        <p className="body-text measure mt-3">
          Now there is something to grade. Left to its own scores, the network
          gave the right answer{" "}
          <code>{(shares[first.label] * 100).toFixed(0)}%</code> of its belief.
          The cost of a guess depends only on that one number — whatever it
          spread across the wrong answers does not matter separately, because it
          is what is left over.
        </p>
        <p className="body-text measure mt-4">
          Believe the right answer completely and the cost is zero. Believe it a
          little less and the cost creeps up. Believe it barely at all and the
          cost runs away. Drag the belief and watch what the cost does.
        </p>
        <div className="mt-7">
          <SurpriseCurve />
        </div>
        <p className="body-text measure mt-5">
          The runaway end is the point. If the cost were simply{" "}
          <code>100% − belief</code>, being confidently wrong would cost barely
          more than being unsure. This curve makes confident mistakes
          enormously expensive, which is exactly the behaviour worth
          discouraging.
        </p>
      </section>

      <section className="mt-14">
        <h2 className="section-title">One number for the whole set</h2>
        <p className="body-text measure mt-3">
          Work out that cost for every drawing you made, then take the average.
          That single number is called the <strong>loss</strong>, and it is the
          only thing training ever tries to make smaller.
        </p>

        <div className="mt-7 border bg-paper-raised p-6 hairline">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="eyebrow">Your network right now</p>
              {/* Mono, like every other quantity on the site — the figure it is
                  set against, two inches to the right, is the same kind of
                  number and must not look like a different kind of thing. */}
              <p className="mt-1 font-mono text-4xl font-semibold tracking-[-0.02em]">
                {loss.toFixed(4)}
              </p>
            </div>
            <div className="text-right">
              <p className="eyebrow">A network that knows nothing</p>
              <p className="mt-1 font-mono text-2xl text-graphite">
                {chance.toFixed(4)}
              </p>
            </div>
          </div>
          <p className="mt-5 border-t pt-4 caption hairline">
            With {classes} characters, a network that splits its belief evenly
            every time scores <code>{chance.toFixed(4)}</code> — that is{" "}
            <code>log({classes})</code>. Yours is at{" "}
            <code>{loss.toFixed(4)}</code>, which is about what you would expect
            from something that has never been told anything.
          </p>
        </div>

        <p className="claim mt-8">
          Everything from here is one question: which way do we move the{" "}
          {INPUTS * classes + classes} numbers to make that figure smaller?
        </p>
      </section>

      <section className="mt-14">
        <h2 className="section-title">Build the measuring stick yourself</h2>
        <p className="body-text measure mt-3">
          Five cells, and you will have written the loss function by hand. It is
          the same one used to train essentially every classifier in the world.
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
              closing="You now have a number that says how wrong the network is. Next: how that one number tells every single weight which way to move."
            />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
