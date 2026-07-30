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

          <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-3 border-t pt-4 hairline">
            <div>
              <dt className="eyebrow">Trained on</dt>
              <dd className="mt-0.5 font-mono text-sm">
                {train.length} drawings
              </dd>
            </div>
            <div>
              <dt className="eyebrow">Kept back</dt>
              <dd className="mt-0.5 font-mono text-sm">
                {held.length} drawing{held.length === 1 ? "" : "s"}
              </dd>
            </div>
            <div>
              <dt className="eyebrow">Right on the kept-back ones</dt>
              <dd className="mt-0.5 font-mono text-sm font-semibold text-plot">
                {(heldReport.accuracy * 100).toFixed(0)}%
              </dd>
            </div>
          </dl>
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
    </div>
  );
}
