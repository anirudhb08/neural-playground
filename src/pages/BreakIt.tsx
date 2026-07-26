import { useMemo } from "react";
import { StarveIt } from "../components/StarveIt";
import { TouchANumber } from "../components/TouchANumber";
import { WreckTheRate } from "../components/WreckTheRate";
import {
  applyNudge,
  createNetwork,
  holdOneOfEachBack,
  INPUTS,
  nudgeFor,
  type Sample,
} from "../lib/network";
import type { Dataset } from "../types";

const ROUNDS = 400;

/** Scale is meaningless as a number; it needs something to sit against. */
const scaleFor = (yours: number, classes: number) =>
  [
    ["yours", yours, `${classes} characters, drawn by one hand`],
    ["reads handwritten digits", 100_000, "the standard first exercise, ten digits"],
    ["recognises objects in photographs", 25_000_000, "a thousand categories"],
    ["writes essays", 100_000_000_000, "most of the public internet"],
  ] as const;

type Props = {
  dataset: Dataset;
  onBuildAlphabet: () => void;
};

export function BreakIt({ dataset, onBuildAlphabet }: Props) {
  const classes = dataset.glyphs.length;

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

  const trained = useMemo(() => {
    let net = createNetwork(Math.max(classes, 1));
    for (let i = 0; i < ROUNDS; i++) net = applyNudge(net, nudgeFor(net, train), 0.5);
    return net;
  }, [train, classes]);

  if (samples.length < 4 || classes < 2) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-20">
        <p className="eyebrow">Break it</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-[-0.02em]">
          Nothing to break yet
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
        <p className="eyebrow">Break it</p>
        <h1 className="mt-1 font-display text-3xl leading-[1.15] font-extrabold tracking-[-0.02em] sm:text-4xl">
          Everything has worked so far
        </h1>
        <p className="lede measure mt-6">
          Which is a poor way to learn anything. You understand a machine when
          you know how it fails, so this page is three ways to wreck yours on
          purpose.
        </p>
      </header>

      <section className="mt-14">
        <h2 className="section-title">One: ruin the training set</h2>
        <p className="body-text measure mt-3">
          Two dials. The first gives it fewer drawings to learn from. The second
          lies — it relabels some of your drawings as the wrong character before
          training starts. Watch the two scores on the right come apart.
        </p>
        <div className="mt-7">
          <StarveIt train={train} held={held} classes={classes} />
        </div>
        <p className="body-text measure mt-5">
          Starving it barely works. Your characters are so unlike each other
          that a single drawing of each is very nearly enough — which is a real
          finding, not a broken demo. Distinct classes are easy; that is why
          nobody is impressed by telling circles from squares.
        </p>
        <p className="body-text measure mt-4">
          Lying to it works. Push that second dial up and you reach a point
          where it still scores perfectly on the drawings it studied while
          falling to chance on everything else — it cheerfully memorised
          the lies alongside the truth. Its loss goes to nearly zero while doing
          it, because as far as the network is concerned it is getting every
          answer right. It has no way to tell a wrong label from a right one,
          and no notion that a label could be wrong at all.
        </p>
        <p className="claim mt-7">
          A network that scores perfectly on what it studied and badly on
          everything else has not learned. It has memorised.
        </p>
        <p className="body-text measure mt-6">
          That gap has a name — <strong>overfitting</strong> — and it is the
          single most useful diagnostic in the subject, because it is the only
          warning you get. It is also why nobody ever reports a score on the
          data they trained on.
        </p>
      </section>

      <section className="mt-14">
        <h2 className="section-title">Two: try to break it with the step size</h2>
        <p className="body-text measure mt-3">
          The nudge says which way to move; the step size says how far. Textbooks
          warn that too large a step overshoots the bottom of the valley and
          lands higher up the far side, so the loss climbs instead of falling.
          Wind the slider all the way up and try to make that happen.
        </p>
        <div className="mt-7">
          <WreckTheRate train={train} classes={classes} />
        </div>
        <p className="body-text measure mt-5">
          Small steps fail exactly as promised — the loss barely moves. But the
          other end refuses to break. A step size of ten million ought to be
          catastrophic, and it trains perfectly well.
        </p>
        <p className="claim mt-7">
          You cannot break this one by pushing too hard, and the reason is
          worth more than the breakage would have been.
        </p>
        <p className="body-text measure mt-6">
          The nudge is made of how wrong the network is. Once it is confidently
          right, that error is nearly zero, so the nudge is nearly zero, so a
          huge step size multiplies almost nothing and moves almost nowhere. The
          rule throttles itself. And because your characters can be cleanly
          separated, one enormous first step lands somewhere confidently correct
          with nothing left to overshoot.
        </p>
        <p className="body-text measure mt-4">
          On harder problems — characters that genuinely overlap, or the stacked
          layers from the next stage — that safety net is gone and the step size
          becomes the setting most likely to ruin your day. It just cannot be
          demonstrated to you honestly on a handful of hand-drawn marks, so it is not
          going to be.
        </p>
      </section>

      <section className="mt-14">
        <h2 className="section-title">Three: reach in and move a number</h2>
        <p className="body-text measure mt-3">
          Here is the trained network. Click any square of{" "}
          {dataset.glyphs[0].label}'s scorecard and drag its value as far as you
          like, and watch what happens to the answer.
        </p>
        <div className="mt-7">
          <TouchANumber
            network={trained}
            sample={held[0] ?? samples[0]}
            glyphs={dataset.glyphs}
          />
        </div>
        <p className="body-text measure mt-5">
          Almost nothing happens. There is no square holding the answer, no
          single number you can pull out to break it — the decision is smeared
          across all <code>{INPUTS * classes + classes}</code> of them, and each
          one contributes a sliver.
        </p>
        <p className="claim mt-7">
          That smearing is why these systems are hard to explain, and why they
          keep working when parts of them are damaged.
        </p>
      </section>

      <section className="mt-14">
        <h2 className="section-title">And a last thing about size</h2>
        <p className="body-text measure mt-3">
          Your network holds{" "}
          <code>{INPUTS * classes + classes}</code> numbers. That word —
          parameters — is the one used to describe every model you have heard
          of, so it is worth seeing what the same word covers.
        </p>
        <ul className="mt-6 flex flex-col gap-3">
          {scaleFor(INPUTS * classes + classes, classes).map(([name, count, note]) => (
            <li key={name} className="border-b pb-3 hairline last:border-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                <span className="text-sm font-semibold">{name}</span>
                <span className="font-mono text-sm">
                  {count.toLocaleString("en-GB")}
                </span>
              </div>
              <span
                className="mt-1.5 block h-1.5 bg-plot"
                style={{
                  width: `${Math.max(0.4, (Math.log10(count) / Math.log10(1e11)) * 100)}%`,
                }}
              />
              <span className="block pt-1 text-[0.8125rem] text-graphite">
                {note}
              </span>
            </li>
          ))}
        </ul>
        <p className="body-text measure mt-6">
          Those bars are on a ten-times scale, or the first one would be
          invisible. A model that writes essays holds hundreds of millions of times more
          numbers than yours.
        </p>
        <p className="claim mt-7">
          Not one of them does anything yours do not. There are simply more,
          arranged in more layers, nudged for far longer, by far more examples.
        </p>
      </section>
    </div>
  );
}
