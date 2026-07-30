import { useState } from "react";
import { createNetwork } from "../../lib/network";
import { WeightLegend, WeightMap } from "../Grids";
import type { Glyph } from "../../types";

/**
 * Every scorecard laid back out as a picture, with the reroll.
 *
 * The seed lives here rather than on the page so the "these numbers are
 * arbitrary" claim can be demonstrated rather than asserted — press the button
 * and a different set of static appears.
 */
export function Scorecards({ glyphs }: { glyphs: Glyph[] }) {
  const [seed, setSeed] = useState(7);
  const network = createNetwork(Math.max(glyphs.length, 1), seed);

  return (
    <div>
      <WeightLegend />
      <div className="mt-7 flex flex-wrap items-start gap-8">
        {glyphs.map((glyph, c) => (
          <figure key={glyph.id} className="w-44">
            <figcaption className="eyebrow pb-2">{glyph.label}</figcaption>
            <WeightMap weights={network.weights[c]} />
          </figure>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setSeed((s) => s + 1)}
        className="mt-7 bg-riso px-5 py-2.5 font-mono text-xs tracking-[0.14em] text-paper uppercase transition-colors hover:bg-ink"
      >
        Roll new random numbers
      </button>
      <p className="mt-3 mono-note text-graphite">
        Seed {seed}. Every scorecard redraws, and the guesses change with them.
      </p>
    </div>
  );
}
