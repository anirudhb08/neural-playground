import { useState, type ReactNode } from "react";
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
  /** Where to start; the reader can click any other square. */
  square: number;
  rate: number;
};

/** One factor of the multiplication, with its name underneath. */
function Term({ value, label }: { value: ReactNode; label?: string }) {
  return (
    <span className="inline-flex flex-col items-center">
      <span className="font-mono text-sm whitespace-nowrap">{value}</span>
      <span className="pt-1 font-mono text-[0.625rem] text-graphite">
        {label ?? " "}
      </span>
    </span>
  );
}

/**
 * The update rule worked through for a single square, before anything moves.
 *
 * Every number here is printed to the precision it was multiplied at, and the
 * result is computed from exactly the figures on screen — so a reader who
 * reaches for a calculator gets the same answer to the last digit. Rounding
 * the factors for looks and printing an unrounded product would teach them
 * they had misunderstood the rule.
 */
export function OneNudge({ sample, glyphs, network, square, rate }: Props) {
  const [picked, setPicked] = useState(square);
  const [character, setCharacter] = useState(sample.label);

  // Everything is rounded once, here, and every figure on screen is derived
  // from these — so the table's subtraction and the multiplication below both
  // come out exactly as shown.
  const predicted = toShares(score(network, sample.pixels)).map((p) =>
    Number(p.toFixed(4)),
  );
  const offBy = predicted.map((p, c) =>
    Number((p - (c === sample.label ? 1 : 0)).toFixed(4)),
  );

  const ink = Number((sample.pixels[picked] / 255).toFixed(4));
  const error = offBy[character];
  const move = -rate * ink * error;

  return (
    <div className="border bg-paper-raised p-5 hairline">
      <div className="flex flex-wrap items-start gap-x-8 gap-y-6">
        <figure className="w-36">
          <figcaption className="eyebrow pb-2">Square {picked}</figcaption>
          <InkGrid pixels={sample.pixels} highlight={picked} onPick={setPicked} />
          <p className="pt-2 mono-note text-graphite">
            row {Math.floor(picked / GRID)}, col {picked % GRID} · click any
            square
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
              </tr>
            </thead>
            <tbody>
              {glyphs.map((glyph, c) => {
                const target = c === sample.label ? 1 : 0;
                const off = offBy[c];
                return (
                  <tr
                    key={glyph.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setCharacter(c)}
                    onKeyDown={(e) => e.key === "Enter" && setCharacter(c)}
                    className={`cursor-pointer border-b last:border-0 hairline ${
                      c === character ? "bg-plot/8" : ""
                    }`}
                  >
                    <td className="py-2">
                      {glyph.label}
                      {c === character && (
                        <span className="pl-2 text-[0.625rem] text-riso">
                          ← worked out below
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-right">
                      {(predicted[c] * 100).toFixed(2)}%
                    </td>
                    <td className="py-2 text-right text-graphite">
                      {target * 100}%
                    </td>
                    <td
                      className={`py-2 text-right ${off > 0 ? "text-riso" : "text-plot"}`}
                    >
                      {off > 0 ? "+" : ""}
                      {(off * 100).toFixed(2)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <p className="mt-4 caption">
            A perfect answer would put all 100% of the belief on the character
            the drawing really is, and 0% on{" "}
            {glyphs.length === 2 ? "the other" : "the others"} — that is the{" "}
            <em>should say</em> column. Subtract it from what the network{" "}
            <em>said</em> and you get how far off it was. For{" "}
            {glyphs[character].label}:{" "}
            <code className="whitespace-nowrap">
              {(predicted[character] * 100).toFixed(2)}% −{" "}
              {(character === sample.label ? 1 : 0) * 100}% ={" "}
              {error > 0 ? "+" : ""}
              {(error * 100).toFixed(2)}%
            </code>
            .
          </p>
        </div>
      </div>

      <div className="mt-6 border-t pt-5 hairline">
        <p className="eyebrow pb-4">
          What that does to {glyphs[character].label}'s number for square{" "}
          {picked}
        </p>
        <div className="flex flex-wrap items-start gap-x-3 gap-y-4 overflow-x-auto">
          <Term value="move" />
          <Term value="=" />
          <Term value={`−${rate}`} label="step size" />
          <Term value="×" />
          <Term value={ink.toFixed(4)} label="ink here" />
          <Term value="×" />
          <Term
            value={`(${error >= 0 ? "+" : "−"}${Math.abs(error).toFixed(4)})`}
            label="off by"
          />
          <Term value="=" />
          <Term
            value={
              <strong
                className={`font-semibold ${move >= 0 ? "text-plot" : "text-riso"}`}
              >
                {move === 0 ? "" : move > 0 ? "+" : "−"}
                {Math.abs(move).toFixed(4)}
              </strong>
            }
          />
        </div>
        <p className="mt-4 max-w-[34rem] caption">
          {ink === 0 ? (
            <>
              You have picked a square you never drew on. Ink of{" "}
              <code>0</code> times anything is <code>0</code>, so this number
              does not move — and neither do the other{" "}
              {sample.pixels.filter((p) => p === 0).length - 1} blank squares.
              The network only ever learns about places you put ink.
            </>
          ) : (
            <>
              Every figure above is printed at the precision it was multiplied
              at, so a calculator will agree with the answer.{" "}
              {error < 0 ? (
                <>
                  <code>{glyphs[character].label}</code> was under-believed, so{" "}
                  <em>off by</em> is negative, the two minus signs cancel, and
                  the number goes <strong>up</strong>.
                </>
              ) : (
                <>
                  <code>{glyphs[character].label}</code> was over-believed, so{" "}
                  <em>off by</em> is positive and the number comes{" "}
                  <strong>down</strong>.
                </>
              )}
            </>
          )}
        </p>
        <p className="mt-3 max-w-[34rem] caption text-graphite">
          The step size is the one number here that nothing decided for you: it
          is set to {rate} because that trains this network well. Part 09 is
          where you get to break it.
        </p>
      </div>

      <div className="mt-6 border-t pt-5 hairline">
        <p className="eyebrow pb-3">
          Every square at once — how far each scorecard's numbers move
        </p>
        <div className="flex flex-wrap gap-6">
          {glyphs.map((glyph, c) => (
            <figure key={glyph.id} className="w-36">
              <figcaption className="pb-2 mono-note text-graphite">
                how {glyph.label}'s scorecard moves
              </figcaption>
              <WeightMap
                weights={sample.pixels.map(
                  (p) =>
                    -rate *
                    (p / 255) *
                    (predicted[c] - (c === sample.label ? 1 : 0)),
                )}
                highlight={picked}
              />
            </figure>
          ))}
        </div>
        <p className="mt-4 max-w-[34rem] caption">
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
              {INPUTS} numbers are about to move, the line above repeated for
              every square. Add all {glyphs.length} together, square by square,
              and you get exactly nothing. Belief has to total 100%, so whatever{" "}
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
