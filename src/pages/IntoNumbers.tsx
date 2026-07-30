import { Suspense, lazy, useCallback, useRef, useState } from "react";
import { DrawCanvas, type DrawCanvasHandle } from "../components/DrawCanvas";
import { MatrixView } from "../components/MatrixView";
import { seedDrawings } from "../lib/pyodide";

// The code editor is a large dependency and only this page needs it, so it
// stays out of the bundle until someone actually reaches the Python steps.
const PythonLab = lazy(() =>
  import("../components/PythonLab").then((m) => ({ default: m.PythonLab })),
);

const SIZE = GRID * GRID;

function buildSteps(count: number) {
  return [
    {
      title: "what actually arrived",
      lead: `Your drawings reach Python as one long line of ink values — all ${count} of them laid end to end, with nothing marking where one drawing stops and the next begins.`,
      code: `len(drawings)`,
    },
    {
      title: "a look at the raw values",
      lead: "These are the numbers themselves. Long stretches of 0 are the blank paper around your mark.",
      code: `drawings[:20]`,
    },
    {
      title: "reshape — deciding where to cut the line",
      lead: `This is the step worth slowing down on. reshape does not change a single number, and it does not throw anything away. It only decides where that one long line gets cut into rows. Ask for ${count} rows of ${SIZE} and your drawings come back, one per row.`,
      code: `import numpy as np

flat = np.array(drawings, dtype=np.float32)
print("one long line:", flat.shape)

X = flat.reshape(len(labels), ${SIZE})
print("cut into rows:", X.shape)
print("still the same amount of numbers:", flat.size, "vs", X.size)`,
    },
    {
      title: "one row is one drawing",
      lead: `Row 0 is your first drawing, flattened: the top row of the grid, then the next, and so on, ${GRID} squares at a time.`,
      code: `print("numbers in row 0:", X[0].shape)
print("darkest square in it:", X[0].max())
print("its first ${GRID} values (the top row of the grid):")
print(X[0][:${GRID}])`,
    },
    {
      title: "squeezing 0-255 down to 0-1",
      lead: "Networks behave badly when their inputs are large. Dividing every value by 255 keeps the picture identical and just changes the units — 128 becomes roughly 0.5.",
      code: `X = X / 255.0
print("now runs from", X.min(), "to", X.max())`,
    },
    {
      title: "the answer key",
      lead: "X is what the network will look at. y is what it will be marked against — one number per row, saying which character that row really is.",
      code: `y = np.array(labels, dtype=np.int32)
print("y:", y)
print("names:", names)
print("X is", X.shape, "and y is", y.shape)`,
    },
  ];
}
import type { Placement } from "../lib/raster";
import { GRID, type Dataset } from "../types";

type Props = {
  dataset: Dataset;
  onBuildAlphabet: () => void;
};

export function IntoNumbers({ dataset, onBuildAlphabet }: Props) {
  const [pixels, setPixels] = useState<number[]>(() =>
    new Array(GRID * GRID).fill(0),
  );
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [highlight, setHighlight] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const canvas = useRef<DrawCanvasHandle>(null);

  const drawings = dataset.specimens.length;

  const prepare = useCallback(async () => {
    const labelIndex = new Map(dataset.glyphs.map((g, i) => [g.id, i]));
    await seedDrawings({
      drawings: dataset.specimens.flatMap((s) => s.pixels),
      labels: dataset.specimens.map((s) => labelIndex.get(s.glyphId) ?? -1),
      names: dataset.glyphs.map((g) => g.label),
    });
  }, [dataset]);

  return (
    <div className="mx-auto max-w-3xl px-5 pb-20">
      <header className="pt-14">
        <p className="eyebrow">Into numbers</p>
        <h1 className="mt-1 font-display text-3xl leading-[1.15] font-extrabold tracking-[-0.02em] sm:text-4xl">
          A network cannot look at a picture
        </h1>
        <p className="mt-5 body-text">
          Everything a neural network does is arithmetic. Multiply, add,
          compare. That is all it has.
        </p>
        <p className="mt-4 body-text">
          A drawing is not arithmetic. So before anything else, your drawings
          have to turn into numbers.
        </p>
      </header>

      <section className="mt-12">
        <p className="eyebrow">Laying a grid over it</p>
        <p className="mt-2 body-text">
          Here is the whole trick. Put a grid over the drawing. For each square,
          ask one question: how dark is it? An empty square is 0. A solid black
          square is 255. Half covered lands somewhere in between.
        </p>
        <p className="mt-4 body-text">
          This grid is {GRID} squares across and {GRID} down, so it produces{" "}
          {GRID * GRID} numbers. As far as the network is concerned, those{" "}
          {GRID * GRID} numbers <em>are</em> the drawing.
        </p>

        <div className="mt-8 border-y py-8 hairline">
          <p className="caption text-graphite">
            Draw anything here. The grid fills in as you go — and if you point
            at a square, it will show you where on the drawing that number came
            from.
          </p>
          <div className="mt-5 flex flex-wrap items-start gap-8">
            <div className="flex w-[18.75rem] flex-col gap-2">
              <p className="eyebrow">Your drawing</p>
              <DrawCanvas
                ref={canvas}
                onChange={(next, nextPlacement) => {
                  setPixels(next);
                  setPlacement(nextPlacement);
                }}
                highlight={highlight}
                placement={placement}
              />
              <button
                type="button"
                onClick={() => canvas.current?.clear()}
                className="border px-3 py-2 font-mono text-xs tracking-wider uppercase transition-colors hairline hover:border-plot"
              >
                Clear
              </button>
            </div>
            <div className="w-full max-w-[21rem]">
              <MatrixView pixels={pixels} onHover={setHighlight} />
            </div>
          </div>
        </div>
      </section>

      <section className="mt-12">
        <p className="eyebrow">Where on the page does not matter</p>
        <p className="mt-2 body-text">
          One more thing happens on the way. The drawing is trimmed down to its
          ink, then scaled up to fill the grid.
        </p>
        <p className="mt-4 body-text">
          So a tiny mark in the corner and a big one in the middle end up as
          almost the same {GRID * GRID} numbers. The network gets to see the
          shape you drew, not where on the page you happened to draw it. Try it
          above — draw small in one corner, then big in the middle, and watch
          how little the grid changes.
        </p>
      </section>

      <section className="mt-12">
        <p className="eyebrow">Your whole alphabet, as numbers</p>
        {drawings === 0 ? (
          <>
            <p className="mt-2 body-text">
              You have not drawn anything yet, so there is nothing to convert.
            </p>
            <button
              type="button"
              onClick={onBuildAlphabet}
              className="mt-5 bg-ink px-6 py-3 font-mono text-xs tracking-[0.14em] text-paper uppercase transition-colors hover:bg-plot"
            >
              Go and invent an alphabet
            </button>
          </>
        ) : (
          <>
            <p className="mt-2 body-text">
              The same thing happens to every drawing you made. You have{" "}
              {drawings} of them, and each one becomes a row of {GRID * GRID}{" "}
              numbers. Stack the rows and you get a table: {drawings} rows,{" "}
              {GRID * GRID} columns. That table is what the network will be fed.
            </p>
            <p className="mt-4 body-text">
              Next to it sits a second, much shorter list — which character each
              row actually is. That one is the answer key, the thing the network
              gets marked against.
            </p>
            <p className="mt-4 body-text">
              The table is called <code>X</code> and the answer key is called{" "}
              <code>y</code>, which is what nearly everyone calls them. Below you
              can build both yourself, a line at a time, and see what each line
              actually did.
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
                  steps={buildSteps(drawings)}
                  prepare={prepare}
                  closing={`That is the whole conversion. Every drawing you made is now one row of ${SIZE} numbers, with an answer sitting beside it. Next: a machine that tries to tell those rows apart — and, at first, gets it wrong.`}
                />
              </Suspense>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
