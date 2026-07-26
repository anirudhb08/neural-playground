import { useEffect, useRef, useState } from "react";
import { INPUTS, type Network } from "../lib/network";
import { GRID, type Glyph } from "../types";
import { InkGrid, WeightMap } from "./Grids";

type Props = {
  pixels: number[];
  glyphs: Glyph[];
  network: Network;
};

/**
 * The same arithmetic as OneSquare, repeated across all 256 squares, slowly
 * enough to watch. Totals are prefix sums of the cursor, so pausing anywhere
 * shows exactly how far the tally has got.
 */
export function ScorecardFlow({ pixels, glyphs, network }: Props) {
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [perSecond, setPerSecond] = useState(24);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) return;
    timer.current = window.setInterval(() => {
      setCursor((c) => {
        if (c >= INPUTS) {
          setPlaying(false);
          return c;
        }
        return c + 1;
      });
    }, 1000 / perSecond);
    return () => {
      if (timer.current !== null) window.clearInterval(timer.current);
    };
  }, [playing, perSecond]);

  // Reset when the drawing or the weights change underneath.
  useEffect(() => {
    setCursor(0);
    setPlaying(false);
  }, [pixels, network]);

  const totals = glyphs.map((_, c) => {
    let sum = network.biases[c];
    for (let i = 0; i < cursor; i++) sum += (pixels[i] / 255) * network.weights[c][i];
    return sum;
  });

  const at = Math.min(cursor, INPUTS - 1);
  const ink = pixels[at] / 255;
  const done = cursor >= INPUTS;
  const largest = Math.max(...totals.map(Math.abs), 0.001);

  return (
    <div className="border bg-paper-raised p-5 hairline">
      <div className="flex flex-wrap gap-6">
        <figure className="w-36">
          <figcaption className="eyebrow pb-2">Your drawing</figcaption>
          <InkGrid pixels={pixels} highlight={done ? null : at} upTo={cursor} />
        </figure>

        {glyphs.map((glyph, c) => (
          <figure key={glyph.id} className="w-36">
            <figcaption className="eyebrow pb-2">{glyph.label}</figcaption>
            <WeightMap
              weights={network.weights[c]}
              highlight={done ? null : at}
              upTo={cursor}
            />
          </figure>
        ))}

        <div className="min-w-[15rem] flex-1">
          <p className="eyebrow">Running total</p>
          <ul className="mt-2 flex flex-col gap-2">
            {glyphs.map((glyph, c) => (
              <li key={glyph.id} className="flex items-center gap-3">
                <span className="w-16 shrink-0 truncate text-sm">
                  {glyph.label}
                </span>
                <span className="relative h-3 min-w-0 flex-1 bg-plot/10">
                  <span className="absolute inset-y-0 left-1/2 w-px bg-graphite/40" />
                  <span
                    className={`absolute inset-y-0 ${totals[c] >= 0 ? "left-1/2 bg-plot" : "right-1/2 bg-riso"}`}
                    style={{
                      width: `${(Math.abs(totals[c]) / largest) * 50}%`,
                    }}
                  />
                </span>
                <span className="w-16 shrink-0 text-right font-mono text-[0.6875rem]">
                  {totals[c] >= 0 ? "+" : ""}
                  {totals[c].toFixed(3)}
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-4 font-mono text-[0.6875rem] leading-relaxed text-graphite">
            {done ? (
              <>
                All {INPUTS} squares counted. Winner:{" "}
                <span className="text-ink">
                  {glyphs[totals.indexOf(Math.max(...totals))]?.label}
                </span>
              </>
            ) : (
              <>
                square {at} · row {Math.floor(at / GRID)}, col {at % GRID} · ink{" "}
                {ink.toFixed(2)}
                <br />
                {glyphs.map((glyph, c) => (
                  <span key={glyph.id}>
                    {glyph.label}: {ink.toFixed(2)} ×{" "}
                    {network.weights[c][at].toFixed(3)} ={" "}
                    {(ink * network.weights[c][at]).toFixed(4)}
                    <br />
                  </span>
                ))}
              </>
            )}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t pt-4 hairline">
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          disabled={done}
          className="bg-plot px-4 py-2 font-mono text-[0.6875rem] tracking-wider text-paper uppercase transition-colors hover:bg-ink disabled:opacity-30"
        >
          {playing ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          onClick={() => {
            setPlaying(false);
            setCursor((c) => Math.min(c + 1, INPUTS));
          }}
          disabled={done}
          className="border px-4 py-2 font-mono text-[0.6875rem] tracking-wider uppercase transition-colors hairline hover:border-plot disabled:opacity-30"
        >
          One square
        </button>
        <button
          type="button"
          onClick={() => {
            setPlaying(false);
            setCursor(0);
          }}
          className="font-mono text-[0.6875rem] text-graphite underline underline-offset-4 hover:text-riso"
        >
          Back to the start
        </button>

        <label className="ml-auto flex items-center gap-2 font-mono text-[0.6875rem] text-graphite">
          speed
          <input
            type="range"
            min={4}
            max={120}
            value={perSecond}
            onChange={(e) => setPerSecond(Number(e.target.value))}
            className="w-24 accent-plot"
          />
        </label>
        <span className="font-mono text-[0.6875rem] text-graphite">
          {cursor} / {INPUTS}
        </span>
      </div>
    </div>
  );
}
