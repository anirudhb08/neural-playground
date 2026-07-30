import { useState } from "react";
import { argmax, score, toShares, type Network, type Sample } from "../lib/network";
import { GRID, type Glyph } from "../types";
import { WeightMap } from "./Grids";
import { Thumb } from "./Thumb";

type Props = {
  network: Network;
  sample: Sample;
  glyphs: Glyph[];
};

/**
 * Lets one of the 514 numbers be edited by hand. The usual outcome — that
 * moving a single number barely matters — is the lesson.
 */
export function TouchANumber({ network, sample, glyphs }: Props) {
  const [square, setSquare] = useState(() => {
    const inked = sample.pixels.findIndex((v) => v > 150);
    return inked === -1 ? 0 : inked;
  });
  const [edited, setEdited] = useState<Record<number, number>>({});

  const original = network.weights[0][square];
  const current = edited[square] ?? original;

  // Only class 0's scorecard is editable; the rest stay as trained.
  const tweaked: Network = {
    ...network,
    weights: network.weights.map((row, c) =>
      c === 0 ? row.map((w, i) => edited[i] ?? w) : row,
    ),
  };

  const before = toShares(score(network, sample.pixels));
  const after = toShares(score(tweaked, sample.pixels));
  const flipped = argmax(before) !== argmax(after);
  const touched = Object.keys(edited).length;
  const span = Math.max(0.5, Math.abs(original) * 8);

  return (
    <div className="border bg-paper-raised p-5 hairline">
      <div className="flex flex-wrap items-start gap-8">
        <figure className="w-44">
          <figcaption className="eyebrow pb-2">
            {glyphs[0].label}'s scorecard — click any square
          </figcaption>
          <WeightMap
            weights={tweaked.weights[0]}
            highlight={square}
            onPick={setSquare}
          />
          <figcaption className="pt-2 font-mono text-[0.625rem] text-graphite">
            square {square} · row {Math.floor(square / GRID)}, col{" "}
            {square % GRID}
          </figcaption>
        </figure>

        <div className="min-w-[17rem] flex-1">
          <label className="block">
            <span className="mono-note text-graphite">
              this square is worth{" "}
              <span className="text-ink">{current.toFixed(4)}</span>
              {current !== original && (
                <> · it was {original.toFixed(4)}</>
              )}
            </span>
            <input
              type="range"
              min={-span}
              max={span}
              step={span / 200}
              value={current}
              onChange={(e) =>
                setEdited((m) => ({ ...m, [square]: Number(e.target.value) }))
              }
              className="mt-2 w-full accent-riso"
            />
          </label>

          <div className="mt-5 flex flex-wrap items-center gap-5">
            <div className="h-16 w-16 shrink-0 border bg-paper hairline">
              <Thumb pixels={sample.pixels} />
            </div>
            <ul className="min-w-[11rem] flex-1">
              {glyphs.map((glyph, c) => (
                <li key={glyph.id} className="flex items-center gap-2 py-1">
                  <span className="w-14 shrink-0 truncate text-sm">
                    {glyph.label}
                  </span>
                  <span className="h-2.5 min-w-0 flex-1 bg-plot/10">
                    <span
                      className="block h-full bg-plot transition-[width] duration-150"
                      style={{ width: `${after[c] * 100}%` }}
                    />
                  </span>
                  <span className="w-20 shrink-0 text-right font-mono text-[0.625rem]">
                    {(after[c] * 100).toFixed(1)}%
                    <span className="text-graphite">
                      {" "}
                      was {(before[c] * 100).toFixed(0)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-4 caption">
            {touched === 0
              ? "Drag the slider to any extreme you like and watch the answer barely notice."
              : flipped
                ? `You have changed ${touched} number${touched === 1 ? "" : "s"} and finally flipped the answer. It took real effort, and this square is one of the ones your ink actually lands on.`
                : `${touched} number${touched === 1 ? "" : "s"} changed, and the answer has not moved. No single one of the 514 is holding the decision — it is spread across all of them.`}
          </p>

          {touched > 0 && (
            <button
              type="button"
              onClick={() => setEdited({})}
              className="mt-3 mono-note text-graphite underline underline-offset-4 hover:text-riso"
            >
              Put them all back
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
