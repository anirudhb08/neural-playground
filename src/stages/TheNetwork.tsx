import { Suspense, lazy, useMemo, useState } from "react";
import { WeightLegend, WeightMap } from "../components/Grids";
import { OneSquare } from "../components/OneSquare";
import { ScorecardFlow } from "../components/ScorecardFlow";
import { argmax, createNetwork, INPUTS, score } from "../lib/network";
import { seedDrawings, seedMatrices, seedNetwork } from "../lib/pyodide";
import type { Dataset } from "../types";

const PythonLab = lazy(() =>
  import("../components/PythonLab").then((m) => ({ default: m.PythonLab })),
);

const torchFor = (classes: number) => `import torch.nn as nn

# ${classes} scorecards, ${INPUTS} numbers each
layer = nn.Linear(${INPUTS}, ${classes})

layer.weight   # the scorecards themselves
layer.bias     # each character's head start

scores = layer(drawing)`;

function buildSteps(classes: number) {
  return [
    {
      title: "the scorecards, as numbers",
      lead: `W is every scorecard side by side: ${INPUTS} squares down, ${classes} characters across. b is one extra number per character — a head start added to its total before any ink is counted, so a character can be favoured or held back on its own. Together they are the whole network.`,
      code: `print("W:", W.shape, " that is", W.size, "numbers")
print("b:", b.shape)
print("what hook's scorecard says about the first 4 squares:")
print(W[:4, 0])`,
    },
    {
      title: "one drawing, counted the slow way",
      lead: "This is the loop you just watched: multiply each square's ink by the scorecard's number for that square, and add it all up.",
      code: `drawing = X[0]

for c, name in enumerate(names):
    total = 0.0
    for square in range(${INPUTS}):
        total += drawing[square] * W[square, c]
    total += b[c]
    print(name, "scores", round(float(total), 4))`,
    },
    {
      title: "the same thing, without the loop",
      lead: "Nobody writes that loop. X @ W does the identical arithmetic for every drawing and every character at once — that is all a matrix multiply is.",
      code: `scores = X @ W + b
print("scores:", scores.shape)
print("first drawing:", scores[0])
print("winner:", names[scores[0].argmax()])`,
    },
    {
      title: "how often is it right?",
      lead: "argmax takes the highest score for each drawing. Compare against y and you have the network's report card before it has learned anything.",
      code: `guesses = scores.argmax(axis=1)

print("guessed: ", guesses)
print("actually:", y)
print("right:", int((guesses == y).sum()), "of", len(y))
print("that is", round(float((guesses == y).mean()) * 100), "percent")`,
    },
  ];
}

type Props = {
  dataset: Dataset;
  onBuildAlphabet: () => void;
};

export function TheNetwork({ dataset, onBuildAlphabet }: Props) {
  const classes = dataset.glyphs.length;
  const [seed, setSeed] = useState(7);
  const [pick, setPick] = useState(0);
  const network = useMemo(
    () => createNetwork(Math.max(classes, 1), seed),
    [classes, seed],
  );

  const specimen = dataset.specimens[pick];

  const prepare = async () => {
    const labelIndex = new Map(dataset.glyphs.map((g, i) => [g.id, i]));
    await seedDrawings({
      drawings: dataset.specimens.flatMap((s) => s.pixels),
      labels: dataset.specimens.map((s) => labelIndex.get(s.glyphId) ?? -1),
      names: dataset.glyphs.map((g) => g.label),
    });
    await seedMatrices(INPUTS);
    // Python gets the very weights drawn on screen, so the two cannot disagree.
    await seedNetwork(network.weights, network.biases);
  };

  if (!specimen || classes < 2) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-20">
        <p className="eyebrow">The network</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-[-0.02em]">
          Nothing to tell apart yet
        </h1>
        <p className="mt-4 body-text text-graphite">
          A network needs at least two characters to choose between, and some
          drawings of each.
        </p>
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

  // The first square with real ink in it, so the worked example is not about
  // a piece of blank paper.
  const inked = specimen.pixels.findIndex((v) => v > 120);
  const square = inked === -1 ? 0 : inked;

  const results = dataset.specimens.map((s) => {
    const truth = dataset.glyphs.findIndex((g) => g.id === s.glyphId);
    return argmax(score(network, s.pixels)) === truth;
  });
  const right = results.filter(Boolean).length;

  return (
    <div className="mx-auto max-w-3xl px-5 pb-20">
      <header className="pt-14">
        <p className="eyebrow">The network</p>
        <h1 className="mt-1 font-display text-3xl leading-[1.15] font-extrabold tracking-[-0.02em] sm:text-4xl">
          Every character gets a scorecard
        </h1>
        <p className="lede measure mt-6">
          A scorecard is a list of <code>{INPUTS}</code> numbers — one for every
          square of the grid. The number sitting at square <code>37</code> says
          how much ink in square <code>37</code> counts <em>towards</em> this
          character, or <em>against</em> it.
        </p>
        <p className="body-text measure mt-4">
          To judge a drawing you go square by square. Multiply the ink in the
          square by the scorecard's number for that square, and add the result
          to a running total. After all <code>{INPUTS}</code> squares you have
          one number — how much this drawing looks like a{" "}
          <em>{dataset.glyphs[0].label}</em>. Do it again for{" "}
          {classes === 2 ? "the other scorecard" : "each of the other scorecards"}{" "}
          and you have one number per character. Biggest wins.
        </p>
        <p className="body-text measure mt-4">
          Each character also gets one number that belongs to no square at all:
          a <strong>head start</strong>, added to that character's total before
          any ink is counted. It lets the network lean towards a character on
          its own — worth having if one of yours turns up more often than the
          rest. Yours all begin at <code>0</code>, and training moves them like
          everything else. Libraries call it the <em>bias</em>.
        </p>
        <p className="claim mt-8">
          That is the whole network. {classes} scorecards of {INPUTS} numbers,
          plus one head start each.
        </p>
      </header>

      <section className="mt-14">
        <h2 className="section-title">Start with one square</h2>
        <p className="body-text measure mt-3">
          Before all <code>{INPUTS}</code> of them, here is exactly one square of
          your drawing, and the one number the scorecard keeps for that square.
        </p>
        <div className="mt-7">
          <OneSquare
            pixels={specimen.pixels}
            weights={network.weights[0]}
            label={dataset.glyphs[0].label}
            square={square}
          />
        </div>
      </section>

      <section className="mt-14">
        <h2 className="section-title">A scorecard is a picture</h2>
        <p className="body-text measure mt-3">
          A scorecard has one number per square, and those squares came from a
          grid — so you can lay the scorecard back out in that same shape and
          simply look at it.
        </p>
        <div className="mt-5">
          <WeightLegend />
        </div>
        <div className="mt-7 flex flex-wrap items-start gap-8">
          {dataset.glyphs.map((glyph, c) => (
            <figure key={glyph.id} className="w-44">
              <figcaption className="eyebrow pb-2">{glyph.label}</figcaption>
              <WeightMap weights={network.weights[c]} />
            </figure>
          ))}
        </div>
        <p className="claim mt-7">
          It looks like television static, and it should. Nobody has told it
          anything yet.
        </p>
      </section>

      <section className="mt-14">
        <h2 className="section-title">Where did these numbers come from?</h2>
        <p className="lede measure mt-3">
          Nowhere. They are made up. Every number on every scorecard starts out
          random and small, and there is no alternative.
        </p>
        <p className="body-text measure mt-4">
          They cannot all start at <code>0</code>: then every drawing would
          score exactly <code>0</code> for every character, every answer would
          be a tie forever, and all {classes} scorecards would be identical and
          stay identical. And they start <em>small</em>, because big numbers
          give loud, confident, wrong answers.
        </p>
        <p className="body-text measure mt-4">
          If you do not believe they are arbitrary, throw them away and draw a
          new set.
        </p>
        <button
          type="button"
          onClick={() => setSeed((s) => s + 1)}
          className="mt-5 bg-riso px-5 py-2.5 font-mono text-xs tracking-[0.14em] text-paper uppercase transition-colors hover:bg-ink"
        >
          Roll new random numbers
        </button>
        <p className="mt-3 font-mono text-xs text-graphite">
          Everything on this page redraws — and the guesses change with it.
        </p>
      </section>

      <section className="mt-14">
        <h2 className="section-title">Now watch all {INPUTS} squares</h2>
        <p className="body-text measure mt-3">
          Same arithmetic as the single square above, repeated down the whole
          grid. Step through it one square at a time, or press play and watch
          the totals build. The dimmed part of each grid is what has not been
          counted yet.
        </p>
        <div className="mt-7">
          <ScorecardFlow
            pixels={specimen.pixels}
            glyphs={dataset.glyphs}
            network={network}
          />
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-xs text-graphite">
              all {dataset.specimens.length} drawings:
            </span>
            <span className="flex flex-wrap gap-1">
              {results.map((ok, i) => (
                <span
                  key={i}
                  title={ok ? "right" : "wrong"}
                  className={`h-3 w-3 ${ok ? "bg-plot" : "bg-riso"}`}
                />
              ))}
            </span>
            <span className="font-mono text-xs">
              {right} right, {results.length - right} wrong
            </span>
          </div>
          <button
            type="button"
            onClick={() => setPick((p) => (p + 1) % dataset.specimens.length)}
            className="border px-4 py-2 mono-note tracking-wider uppercase transition-colors hairline hover:border-plot"
          >
            Try another drawing
          </button>
        </div>
      </section>

      <section className="mt-14">
        <h2 className="section-title">The same thing, in Python you can run</h2>
        <p className="body-text measure mt-3">
          <code>W</code> and <code>b</code> below hold exactly the numbers drawn
          on this page, so what you work out here will match what you just
          watched.
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
              steps={buildSteps(classes)}
              prepare={prepare}
              closing={`Guessing at random would do about as well — with ${classes} characters that is roughly ${Math.round(100 / classes)}%. The network is not broken; it has simply never been told anything.`}
            />
          </Suspense>
        </div>
      </section>

      <section className="mt-14 border-t pt-10 hairline">
        <h2 className="section-title">What all this is called in PyTorch</h2>
        <p className="body-text measure mt-3">
          You have just built a network by hand, out of nothing but a table of
          numbers and a multiply-and-add. Almost nobody writes it that way. They
          use PyTorch, and the whole of the last hour collapses into four lines.
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
          You cannot run that here — PyTorch is far too large to load in a
          browser, which is why everything on this site is NumPy. But the words
          are worth having, because they are everywhere.
        </p>
        <p className="body-text measure mt-4">
          <code>nn.Linear({INPUTS}, {classes})</code> makes the scorecards.{" "}
          <code>layer.weight</code> is them. <code>layer(drawing)</code> is the
          multiply-and-add you stepped through square by square. And{" "}
          <code>layer.weight</code> is an <code>nn.Parameter</code>, which means
          exactly one thing:
        </p>
        <p className="claim mt-4">
          A number the network owns, and is allowed to change while it learns.
        </p>
        <p className="body-text measure mt-4">
          Everything else in your program stays put; parameters are the parts
          that move. When somebody says a model has eight billion parameters,
          these are what they are counting. Yours are quick to count: {classes}{" "}
          scorecards of {INPUTS} numbers each, plus the {classes} head starts.
          So{" "}
          <code>
            {INPUTS} × {classes} + {classes}
          </code>
          , or{" "}
          <span className="figure-value">{INPUTS * classes + classes}</span>{" "}
          altogether. Not one of them has moved yet. That is the next stage.
        </p>
      </section>
    </div>
  );
}
