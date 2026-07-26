import { useState } from "react";
import {
  applyNudge,
  argmax,
  nudgeFor,
  score,
  toShares,
  type Network,
  type Sample,
} from "../lib/network";
import type { Glyph } from "../types";
import { WeightMap } from "./Grids";
import { Thumb } from "./Thumb";

type Props = {
  sample: Sample;
  other: Sample;
  glyphs: Glyph[];
  start: Network;
};

/**
 * Nudges the network on one drawing, over and over. It becomes certain about
 * that drawing very quickly — and the second drawing shows what that cost.
 */
export function TrainOneDrawing({ sample, other, glyphs, start }: Props) {
  const [network, setNetwork] = useState(start);
  const [rounds, setRounds] = useState(0);

  const belief = toShares(score(network, sample.pixels))[sample.label];
  const otherScores = score(network, other.pixels);
  const otherBelief = toShares(otherScores)[other.label];
  // Whether it would actually get the other drawing right, rather than a
  // threshold that only means anything with two characters.
  const otherRight = argmax(otherScores) === other.label;
  const chance = Math.round(100 / glyphs.length);

  function nudge(times: number) {
    let next = network;
    for (let i = 0; i < times; i++) {
      next = applyNudge(next, nudgeFor(next, [sample]), 2);
    }
    setNetwork(next);
    setRounds((r) => r + times);
  }

  return (
    <div className="border bg-paper-raised p-5 hairline">
      <div className="flex flex-wrap items-start gap-8">
        <div className="flex flex-col gap-2">
          <p className="eyebrow">Training on this one</p>
          <div className="h-20 w-20 border bg-paper hairline">
            <Thumb pixels={sample.pixels} />
          </div>
          <p className="font-mono text-[0.6875rem] text-graphite">
            a {glyphs[sample.label].label}
          </p>
        </div>

        <div className="min-w-[16rem] flex-1">
          <ul className="flex flex-col gap-3">
            <li>
              <div className="flex justify-between pb-1 text-sm">
                <span>belief in this drawing</span>
                <span className="font-mono">{(belief * 100).toFixed(1)}%</span>
              </div>
              <span className="block h-3 bg-plot/10">
                <span
                  className="block h-full bg-plot transition-[width] duration-300"
                  style={{ width: `${belief * 100}%` }}
                />
              </span>
            </li>
            <li>
              <div className="flex justify-between pb-1 text-sm">
                <span className="text-graphite">
                  a {glyphs[other.label].label} it is not being trained on
                </span>
                <span className="font-mono text-graphite">
                  {(otherBelief * 100).toFixed(1)}%
                </span>
              </div>
              <span className="block h-3 bg-plot/10">
                <span
                  className={`block h-full transition-[width] duration-300 ${otherRight ? "bg-plot/45" : "bg-riso"}`}
                  style={{ width: `${otherBelief * 100}%` }}
                />
              </span>
            </li>
          </ul>

          <p className="mt-4 text-sm leading-relaxed">
            {rounds === 0
              ? `Both are near chance, which with ${glyphs.length} characters is about ${chance}%. Nudge it and watch the top bar climb.`
              : !otherRight
                ? `After ${rounds} nudge${rounds === 1 ? "" : "s"} it is sure about the drawing it has seen — and now gets the one it has not seen wrong. It did not learn the character. It learned that drawing.`
                : `${rounds} nudge${rounds === 1 ? "" : "s"} in. The drawing it is being trained on is pulling ahead, and the other is still holding up.`}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t pt-4 hairline">
        <button
          type="button"
          onClick={() => nudge(1)}
          className="bg-plot px-4 py-2 font-mono text-[0.6875rem] tracking-wider text-paper uppercase transition-colors hover:bg-ink"
        >
          Nudge once
        </button>
        <button
          type="button"
          onClick={() => nudge(20)}
          className="border px-4 py-2 font-mono text-[0.6875rem] tracking-wider uppercase transition-colors hairline hover:border-plot"
        >
          Nudge 20 times
        </button>
        <button
          type="button"
          onClick={() => {
            setNetwork(start);
            setRounds(0);
          }}
          className="font-mono text-[0.6875rem] text-graphite underline underline-offset-4 hover:text-riso"
        >
          Start again
        </button>
        <span className="ml-auto font-mono text-[0.6875rem] text-graphite">
          {rounds} nudges
        </span>
      </div>

      {rounds > 0 && (
        <figure className="mt-5 w-36">
          <figcaption className="pb-2 font-mono text-[0.6875rem] text-graphite">
            {glyphs[sample.label].label}'s scorecard now
          </figcaption>
          <WeightMap weights={network.weights[sample.label]} />
        </figure>
      )}
    </div>
  );
}
