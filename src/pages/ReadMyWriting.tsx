import { useMemo, useRef, useState } from "react";
import { DrawCanvas, type DrawCanvasHandle } from "../components/DrawCanvas";
import { WeightMap } from "../components/Grids";
import {
  applyNudge,
  argmax,
  createNetwork,
  evaluate,
  holdOneOfEachBack,
  INPUTS,
  nudgeFor,
  score,
  toShares,
  type Sample,
} from "../lib/network";
import { GRID, type Dataset } from "../types";

const ROUNDS = 400;
const RATE = 0.5;

type Props = {
  dataset: Dataset;
  onBuildAlphabet: () => void;
};

export function ReadMyWriting({ dataset, onBuildAlphabet }: Props) {
  const classes = dataset.glyphs.length;
  const [pixels, setPixels] = useState<number[]>(() =>
    new Array(GRID * GRID).fill(0),
  );
  const canvas = useRef<DrawCanvasHandle>(null);

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

  // Trained once, on arrival. Nothing new is being taught here — this page
  // only asks whether any of it worked.
  const trained = useMemo(() => {
    let network = createNetwork(Math.max(classes, 1));
    for (let i = 0; i < ROUNDS; i++) {
      network = applyNudge(network, nudgeFor(network, train), RATE);
    }
    return network;
  }, [train, classes]);

  if (samples.length < 4 || classes < 2) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-20">
        <p className="eyebrow">Read my writing</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-[-0.02em]">
          Nothing to read yet
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

  const heldReport = evaluate(trained, held);
  const drawn = pixels.some((v) => v > 0);
  const scores = score(trained, pixels);
  const shares = toShares(scores);
  const winner = argmax(scores);
  const contribution = pixels.map(
    (p, i) => (p / 255) * trained.weights[winner][i],
  );

  return (
    <div className="mx-auto max-w-3xl px-5 pb-20">
      <header className="pt-14">
        <p className="eyebrow">Read my writing</p>
        <h1 className="mt-1 font-display text-3xl leading-[1.15] font-extrabold tracking-[-0.02em] sm:text-4xl">
          Write something it has never seen
        </h1>
        <p className="lede measure mt-6">
          The network below has been trained on {train.length} of your drawings,
          for {ROUNDS} rounds, using the rule from the last stage. Nothing else
          about it is special. Draw one of your characters and it will tell you
          which one it thinks you drew.
        </p>
      </header>

      <section className="mt-12">
        <div className="border bg-paper-raised p-5 hairline">
          <div className="flex flex-wrap gap-8">
            <div className="flex w-[18.75rem] flex-col gap-2">
              <p className="eyebrow">Draw here</p>
              <DrawCanvas
                ref={canvas}
                onChange={setPixels}
                highlight={null}
                placement={null}
              />
              <button
                type="button"
                onClick={() => canvas.current?.clear()}
                className="border px-3 py-2 font-mono text-xs tracking-wider uppercase transition-colors hairline hover:border-plot"
              >
                Clear
              </button>
            </div>

            <div className="min-w-[16rem] flex-1">
              <p className="eyebrow">It reads this as</p>
              {drawn ? (
                <>
                  <p className="mt-1 font-display text-4xl font-extrabold tracking-[-0.02em]">
                    {dataset.glyphs[winner].label}
                  </p>
                  <ul className="mt-5 flex flex-col gap-2">
                    {dataset.glyphs.map((glyph, c) => (
                      <li key={glyph.id} className="flex items-center gap-3">
                        <span className="w-20 shrink-0 truncate text-sm">
                          {glyph.label}
                        </span>
                        <span className="h-3 min-w-0 flex-1 bg-plot/10">
                          <span
                            className={`block h-full ${c === winner ? "bg-riso" : "bg-plot/45"}`}
                            style={{ width: `${shares[c] * 100}%` }}
                          />
                        </span>
                        <span className="w-12 shrink-0 text-right mono-note">
                          {(shares[c] * 100).toFixed(0)}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="mt-3 caption text-graphite">
                  Nothing drawn yet. The answer appears as you draw, and changes
                  with every stroke.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {drawn && (
        <section className="mt-12">
          <h2 className="section-title">Why it said that</h2>
          <p className="body-text measure mt-3">
            Every square of your drawing was multiplied by{" "}
            {dataset.glyphs[winner].label}'s scorecard. Here is the result:
            teal squares are the ones that argued <em>for</em> that answer, pink
            squares argued against it, and the totals of all{" "}
            <code>{INPUTS}</code> decided it.
          </p>
          <div className="mt-7 flex flex-wrap items-start gap-8">
            <figure className="w-44">
              <figcaption className="eyebrow pb-2">
                what made it say {dataset.glyphs[winner].label}
              </figcaption>
              <WeightMap weights={contribution} />
            </figure>
            <figure className="w-44">
              <figcaption className="eyebrow pb-2">
                {dataset.glyphs[winner].label}'s scorecard
              </figcaption>
              <WeightMap weights={trained.weights[winner]} />
            </figure>
            <p className="min-w-[14rem] flex-1 caption text-graphite">
              The left picture is only the part of the scorecard your ink
              actually touched. Everywhere you left blank contributed nothing at
              all, which is why most of it is empty.
            </p>
          </div>
        </section>
      )}

      <section className="mt-14">
        <h2 className="section-title">It can only ever say what you taught it</h2>
        <p className="body-text measure mt-3">
          Draw a spiral, a house, a letter from a real alphabet — anything at
          all. It will still answer{" "}
          {dataset.glyphs.map((g, i) => (
            <span key={g.id}>
              {i > 0 && (i === classes - 1 ? " or " : ", ")}
              {g.label}
            </span>
          ))}
          , often with great confidence. It has no category for "none of these"
          and no way to invent one.
        </p>
        <p className="body-text measure mt-4">
          That is not a fault in your network; it is what a classifier is. It
          was asked to divide the world into {classes} boxes, so it divides the
          world into {classes} boxes. Every one of these systems has an edge
          like this, and knowing where the edge sits is most of using them
          responsibly.
        </p>
      </section>

      <section className="mt-14">
        <h2 className="section-title">How much to trust it</h2>
        <p className="body-text measure mt-3">
          {held.length} drawing{held.length === 1 ? "" : "s"} were kept out of
          training entirely. On those, it gets{" "}
          <code>{(heldReport.accuracy * 100).toFixed(0)}%</code> right —{" "}
          {heldReport.accuracy === 1
            ? "which is the only result here worth anything, because those are the ones it could not have memorised."
            : "which is a more honest figure than its score on the drawings it studied."}
        </p>
        <p className="body-text measure mt-4">
          It has seen {train.length} drawings in its life, all by one person,
          all with the same pen. If your handwriting drifts, or someone else
          draws your characters, expect it to struggle. More drawings, and more
          varied ones, is the cure for almost everything that goes wrong here.
        </p>
      </section>

      <section className="mt-14 border-t pt-10 hairline">
        <h2 className="section-title">What you built</h2>
        <p className="body-text measure mt-3">
          You invented an alphabet nobody had written before, turned it into
          numbers, built a network out of nothing but a table and a
          multiply-and-add, worked out how wrong it was, and taught it to be
          less wrong — and now it reads your handwriting.
        </p>
        <p className="claim mt-7">
          There was never anything in the box but numbers being nudged.
        </p>
        <p className="body-text measure mt-7">
          The same rule, stacked into layers and pointed at photographs, is
          image recognition. Pointed at sequences of characters, so it predicts
          the next one rather than naming the whole, it becomes a language
          model. Nothing new gets added — only more layers, more numbers, and a
          great deal more data.
        </p>
        <p className="body-text measure mt-4">
          If you want to keep going: draw more characters and watch it get
          harder, add a third and a fourth, or go back and see what happens when
          you train on four drawings instead of {train.length}.
        </p>
      </section>
    </div>
  );
}
