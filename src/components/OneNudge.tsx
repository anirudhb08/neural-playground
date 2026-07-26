import { GRID, type Glyph } from "../types";
import {
  INPUTS,
  score,
  toShares,
  type Network,
  type Sample,
} from "../lib/network";
import { InkGrid, WeightMap } from "./Grids";

type Props = {
  sample: Sample;
  glyphs: Glyph[];
  network: Network;
  square: number;
  rate: number;
};

/** The update rule worked through for a single square, before anything moves. */
export function OneNudge({ sample, glyphs, network, square, rate }: Props) {
  const predicted = toShares(score(network, sample.pixels));
  const ink = sample.pixels[square] / 255;

  return (
    <div className="border bg-paper-raised p-5 hairline">
      <div className="flex flex-wrap items-start gap-x-8 gap-y-6">
        <figure className="w-36">
          <figcaption className="eyebrow pb-2">Square {square}</figcaption>
          <InkGrid pixels={sample.pixels} highlight={square} />
          <p className="pt-2 font-mono text-[0.6875rem] text-graphite">
            row {Math.floor(square / GRID)}, col {square % GRID} · ink{" "}
            {ink.toFixed(2)}
          </p>
        </figure>

        <div className="min-w-[20rem] flex-1">
          <p className="eyebrow">
            This drawing really is {glyphs[sample.label].label}
          </p>
          <table className="mt-3 w-full font-mono text-xs">
            <thead>
              <tr className="border-b text-left text-graphite hairline">
                <th className="pb-1.5 font-normal">character</th>
                <th className="pb-1.5 text-right font-normal">said</th>
                <th className="pb-1.5 text-right font-normal">should say</th>
                <th className="pb-1.5 text-right font-normal">off by</th>
                <th className="pb-1.5 text-right font-normal">move by</th>
              </tr>
            </thead>
            <tbody>
              {glyphs.map((glyph, c) => {
                const target = c === sample.label ? 1 : 0;
                const error = predicted[c] - target;
                const move = -rate * ink * error;
                return (
                  <tr key={glyph.id} className="border-b last:border-0 hairline">
                    <td className="py-2">{glyph.label}</td>
                    <td className="py-2 text-right">
                      {(predicted[c] * 100).toFixed(0)}%
                    </td>
                    <td className="py-2 text-right text-graphite">
                      {target * 100}%
                    </td>
                    <td
                      className={`py-2 text-right ${error > 0 ? "text-riso" : "text-plot"}`}
                    >
                      {error > 0 ? "+" : ""}
                      {(error * 100).toFixed(0)}%
                    </td>
                    <td
                      className={`py-2 text-right font-semibold ${move >= 0 ? "text-plot" : "text-riso"}`}
                    >
                      {move >= 0 ? "+" : ""}
                      {move.toFixed(4)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <p className="mt-4 text-sm leading-relaxed">
            The network was not keen enough on the right character and too keen
            on {glyphs.length === 2 ? "the other" : "the others"}. So at this
            square — where there is <code>{ink.toFixed(2)}</code> ink —{" "}
            {glyphs[sample.label].label}'s scorecard has its number for this
            square moved up, and{" "}
            {glyphs.length === 2 ? "the other's" : "the others'"} moved down,
            each in proportion to how far off it was. Squares with no ink move
            by nothing at all.
          </p>
        </div>
      </div>

      <div className="mt-6 border-t pt-5 hairline">
        <p className="eyebrow pb-3">
          Every square at once — how far each scorecard's numbers move
        </p>
        <div className="flex flex-wrap gap-6">
          {glyphs.map((glyph, c) => (
            <figure key={glyph.id} className="w-36">
              <figcaption className="pb-2 font-mono text-[0.6875rem] text-graphite">
                how {glyph.label}'s scorecard moves
              </figcaption>
              <WeightMap
                weights={sample.pixels.map(
                  (p) =>
                    -rate *
                    (p / 255) *
                    (predicted[c] - (c === sample.label ? 1 : 0)),
                )}
                highlight={square}
              />
            </figure>
          ))}
        </div>
        <p className="mt-4 max-w-[34rem] text-sm leading-relaxed">
          {glyphs.length === 2 ? (
            <>
              Those two pictures are exact opposites of each other, and they
              always will be. With two characters, believing one more means
              believing the other less by precisely the same amount — so every
              nudge up on one scorecard is the identical nudge down on the
              other.
            </>
          ) : (
            <>
              These are not the scorecards — they are how far each scorecard's{" "}
              {INPUTS} numbers are about to move. Add all {glyphs.length}{" "}
              together, square by square, and you get exactly nothing. Belief
              has to total 100%, so whatever{" "}
              {glyphs[sample.label].label} gains is taken from the others
              between them: the teal here is precisely the pink spread across
              the rest.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
