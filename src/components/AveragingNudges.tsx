import { useState } from "react";
import { nudgeFor, type Network, type Sample } from "../lib/network";
import type { Glyph } from "../types";
import { WeightMap } from "./Grids";

const SHOWN = 5;

type Props = {
  samples: Sample[];
  glyph: Glyph;
  classIndex: number;
  network: Network;
};

/**
 * Why training on many drawings teaches a character rather than a drawing.
 *
 * The nudge from a single drawing is that drawing. Averaged over several, the
 * parts that differ cancel each other out and only the shared shape is left
 * standing — which is generalisation, made visible.
 */
export function AveragingNudges({
  samples,
  glyph,
  classIndex,
  network,
}: Props) {
  const [count, setCount] = useState(1);
  const used = samples.slice(0, count);

  const averaged = nudgeFor(network, used).weights[classIndex];
  const individual = used
    .slice(0, SHOWN)
    .map((s) => nudgeFor(network, [s]).weights[classIndex]);

  // A shared colour range, so adding drawings does not silently rescale
  // everything and hide the effect.
  const scale = Math.max(
    ...individual.flat().map(Math.abs),
    ...averaged.map(Math.abs),
    1e-6,
  );

  return (
    <div className="border bg-paper-raised p-5 hairline">
      <div className="flex flex-wrap items-start gap-x-8 gap-y-6">
        <div className="min-w-[15rem] flex-1">
          <p className="eyebrow">
            What each drawing of {glyph.label} asks for, on its own
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {individual.map((weights, i) => (
              <figure key={i} className="w-[4.5rem]">
                <WeightMap weights={weights} scale={scale} />
                <figcaption className="pt-1 text-center font-mono text-[0.625rem] text-graphite">
                  #{i + 1}
                </figcaption>
              </figure>
            ))}
            {count > SHOWN && (
              <span className="self-center font-mono text-[0.6875rem] text-graphite">
                + {count - SHOWN} more
              </span>
            )}
          </div>
          <p className="mt-3 max-w-[24rem] text-sm leading-relaxed text-graphite">
            Each one is just that drawing, stamped out. Alone, every one of them
            is asking the scorecard to memorise a particular set of strokes.
          </p>
        </div>

        <div className="shrink-0">
          <p className="eyebrow pb-3">Averaged together</p>
          <figure className="w-40">
            <WeightMap weights={averaged} scale={scale} />
          </figure>
        </div>
      </div>

      <div className="mt-5 border-t pt-4 hairline">
        <label className="block">
          <span className="font-mono text-[0.6875rem] text-graphite">
            averaging over {count} of {samples.length} drawings
          </span>
          <input
            type="range"
            min={1}
            max={samples.length}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="mt-2 w-full accent-riso"
          />
        </label>
        <p className="mt-3 max-w-[36rem] text-sm leading-relaxed">
          {count === 1
            ? "With one drawing, the average is that drawing. Slide right and watch what happens."
            : count < samples.length
              ? `Where the ${count} drawings disagree — a stroke that landed slightly differently each time — the colours cancel and fade towards nothing. Where they agree, they pile up.`
              : "Across all of them, only what every drawing had in common is still standing. Nobody chose which parts to keep; disagreement simply cancelled itself out."}
        </p>
      </div>
    </div>
  );
}
