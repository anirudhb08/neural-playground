import { Suspense, lazy, useMemo } from "react";
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
    lead: "The network hands back raw scores, and a raw score means nothing on its own. Turning them into shares of 100% takes two moves: make them all positive, then divide by the total.",
    code: `import numpy as np

scores = X @ W + b
row = scores[0]
print("raw scores:", row)

lifted = np.exp(row - row.max())   # all positive, gaps preserved
shares = lifted / lifted.sum()     # now they add up to 1

print("as shares:", shares)
print("they sum to:", shares.sum())`,
  },
  {
    title: "the same thing for every drawing at once",
    lead: "keepdims=True is the only fiddly part: it keeps the result shaped so NumPy divides each row by its own total rather than by one number.",
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
          So convert them into shares of 100%: make every score positive, then
          divide each one by the total. Only the <em>gaps</em> between scores
          survive, which is the part that carried any meaning.
        </p>

        <div className="mt-7 border bg-paper-raised p-5 hairline">
          <div className="flex flex-wrap items-center gap-8">
            <div className="h-24 w-24 shrink-0 border bg-paper hairline">
              <Thumb pixels={first.pixels} />
            </div>
            <ul className="min-w-[15rem] flex-1 flex-col gap-3">
              {dataset.glyphs.map((glyph, c) => (
                <li key={glyph.id} className="flex items-center gap-3 py-1">
                  <span className="w-16 shrink-0 truncate text-sm">
                    {glyph.label}
                  </span>
                  <span className="w-20 shrink-0 text-right font-mono text-[0.6875rem] text-graphite">
                    {raw[c] >= 0 ? "+" : ""}
                    {raw[c].toFixed(3)}
                  </span>
                  <span className="h-3 min-w-0 flex-1 bg-plot/10">
                    <span
                      className="block h-full bg-plot"
                      style={{ width: `${shares[c] * 100}%` }}
                    />
                  </span>
                  <span className="w-12 shrink-0 text-right font-mono text-[0.6875rem]">
                    {(shares[c] * 100).toFixed(0)}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-4 border-t pt-3 font-mono text-[0.6875rem] text-graphite hairline">
            raw scores on the left, shares on the right · the shares add up to
            100% · this drawing really is {dataset.glyphs[first.label].label}
          </p>
        </div>
        <p className="body-text measure mt-5">
          This conversion is called <strong>softmax</strong>. It is worth
          knowing the word, but it is only the two moves above: make positive,
          then divide by the total.
        </p>
      </section>

      <section className="mt-14">
        <h2 className="section-title">How wrong is one guess?</h2>
        <p className="body-text measure mt-3">
          Now there is something to grade. It gave the right answer{" "}
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
              <p className="mt-1 font-display text-4xl font-extrabold tracking-[-0.02em]">
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
          <p className="mt-5 border-t pt-4 text-sm leading-relaxed hairline">
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
          Four cells, and you will have written the loss function by hand. It is
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
