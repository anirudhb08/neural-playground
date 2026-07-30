import { useMemo } from "react";
import { TheLoop } from "../components/TheLoop";
import { createNetwork, INPUTS, type Sample } from "../lib/network";
import type { Dataset } from "../types";

type Props = {
  dataset: Dataset;
  onBuildAlphabet: () => void;
};

export function WholeLoop({ dataset, onBuildAlphabet }: Props) {
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

  if (samples.length < 2 || classes < 2) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-20">
        <p className="eyebrow">The whole loop</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-[-0.02em]">
          Nothing to run round yet
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

  return (
    <div className="mx-auto max-w-3xl px-5 pb-20">
      <header className="pt-14">
        <p className="eyebrow">The whole loop</p>
        <h1 className="mt-1 font-display text-3xl leading-[1.15] font-extrabold tracking-[-0.02em] sm:text-4xl">
          All of it, in one circuit
        </h1>
        <p className="lede measure mt-6">
          You have met every piece separately. Here they are joined up — because
          the important thing about them is not the pieces, it is that they go
          round.
        </p>
        <p className="body-text measure mt-4">
          Six stations. Walk them one at a time, or press play and watch it
          circle. Nothing new is introduced on this page; every station is
          something you already built.
        </p>
      </header>

      <section className="mt-12">
        <TheLoop start={start} samples={samples} glyphs={dataset.glyphs} />
      </section>

      <section className="mt-14">
        <h2 className="section-title">What actually changes, and what does not</h2>
        <p className="body-text measure mt-3">
          Five of the six stations are pure arithmetic. Multiplying, adding,
          turning scores into percentages, taking a logarithm, subtracting one
          set of numbers from another — none of that learns anything, and none
          of it is different on lap one thousand than on lap one.
        </p>
        <p className="body-text measure mt-4">
          Only station six touches anything permanent. The{" "}
          <code>{INPUTS * classes + classes}</code> numbers in the scorecards
          are the sole thing that carries over from one lap to the next. That is
          the entire memory of the system.
        </p>
        <p className="claim mt-7">
          The loop is not the network. The loop is what happens to it.
        </p>
      </section>

      <section className="mt-14">
        <h2 className="section-title">Where each station came from</h2>
        <ol className="mt-4 flex flex-col gap-3">
          {[
            ["Your drawing", "part 03 — a grid laid over the ink, 256 numbers out"],
            ["The scorecards", "part 04 — one number per square, per character"],
            ["A score, then a share", "stages 04 and 05 — multiply and add, then softmax"],
            ["How wrong", "part 05 — the cost of the belief placed on the truth"],
            ["Blame", "part 06 — what it said minus what it should have said"],
            ["Nudge", "part 06 — ink times blame, subtracted from every number"],
          ].map(([name, where], i) => (
            <li key={name} className="flex gap-3 border-b pb-3 hairline last:border-0">
              <span className="w-5 shrink-0 mono-note text-plot">
                {i + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{name}</span>
                <span className="block text-sm text-graphite">{where}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-14">
        <h2 className="section-title">This is the whole subject</h2>
        <p className="body-text measure mt-3">
          Every network you have heard of runs this circuit. What changes
          between a toy like yours and something that writes essays is what sits
          at station two — more numbers, arranged in more layers, with more
          elaborate ways of combining them — and how many laps it runs, over how
          much data.
        </p>
        <p className="body-text measure mt-4">
          The circuit itself does not change. Guess, measure how wrong, work out
          the blame, nudge, guess again.
        </p>
      </section>
    </div>
  );
}
