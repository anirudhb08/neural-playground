import { useEffect, useRef, useState } from "react";
import {
  applyNudge,
  evaluate,
  nudgeFor,
  score,
  surprise,
  toShares,
  type Network,
  type Sample,
} from "../lib/network";
import type { Glyph } from "../types";
import { InkGrid, WeightMap } from "./Grids";

const STATIONS = [
  { name: "Your drawing", note: "becomes 256 numbers, one per square" },
  { name: "The scorecards", note: "what each square is worth to each character" },
  { name: "A score, then a share", note: "multiply, add up, turn into percentages" },
  { name: "How wrong", note: "the cost of the belief it put on the right answer" },
  { name: "Blame", note: "how far off each character was" },
  { name: "Nudge", note: "every number moves a little, and round it goes again" },
] as const;

type Props = {
  start: Network;
  samples: Sample[];
  glyphs: Glyph[];
};

/** The entire machine as one circuit, walked one station at a time. */
export function TheLoop({ start, samples, glyphs }: Props) {
  const [network, setNetwork] = useState(start);
  const [station, setStation] = useState(0);
  const [lap, setLap] = useState(0);
  const [pick, setPick] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<number | null>(null);

  const sample = samples[pick % samples.length];
  const raw = score(network, sample.pixels);
  const shares = toShares(raw);
  const cost = surprise(shares[sample.label]);
  const errors = shares.map((p, c) => p - (c === sample.label ? 1 : 0));
  const nudge = nudgeFor(network, [sample]);
  const report = evaluate(network, samples);

  const advance = () => {
    setStation((s) => {
      if (s < STATIONS.length - 1) return s + 1;
      // Completing a lap is what actually changes the network.
      setNetwork((n) => applyNudge(n, nudgeFor(n, samples), 0.5));
      setLap((l) => l + 1);
      setPick((p) => p + 1);
      return 0;
    });
  };

  useEffect(() => {
    if (!playing) return;
    timer.current = window.setInterval(advance, 900);
    return () => {
      if (timer.current !== null) window.clearInterval(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, samples]);

  const body = (index: number) => {
    switch (index) {
      case 0:
        return (
          <div className="w-full max-w-[7rem]">
            <InkGrid pixels={sample.pixels} />
            <p className="pt-1.5 font-mono text-[0.625rem] text-graphite">
              a {glyphs[sample.label].label}
            </p>
          </div>
        );
      case 1:
        return (
          <div className="flex gap-1.5">
            {glyphs.map((glyph, c) => (
              <div key={glyph.id} className="w-[3.25rem]">
                <WeightMap weights={network.weights[c]} />
                <p className="truncate pt-1 font-mono text-[0.625rem] text-graphite">
                  {glyph.label}
                </p>
              </div>
            ))}
          </div>
        );
      case 2:
        return (
          <ul className="flex w-full flex-col gap-1.5">
            {glyphs.map((glyph, c) => (
              <li key={glyph.id} className="flex items-center gap-2">
                <span className="w-10 shrink-0 truncate text-[0.6875rem]">
                  {glyph.label}
                </span>
                <span className="h-2 min-w-0 flex-1 bg-plot/10">
                  <span
                    className="block h-full bg-plot"
                    style={{ width: `${shares[c] * 100}%` }}
                  />
                </span>
                <span className="w-8 shrink-0 text-right font-mono text-[0.625rem]">
                  {(shares[c] * 100).toFixed(0)}%
                </span>
              </li>
            ))}
          </ul>
        );
      case 3:
        return (
          <div>
            <p className="font-display text-2xl font-extrabold">
              {cost.toFixed(3)}
            </p>
            <p className="font-mono text-[0.625rem] text-graphite">
              it believed the truth {(shares[sample.label] * 100).toFixed(0)}%
            </p>
          </div>
        );
      case 4:
        return (
          <ul className="flex flex-col gap-1 mono-note">
            {glyphs.map((glyph, c) => (
              <li
                key={glyph.id}
                className={errors[c] > 0 ? "text-riso" : "text-plot"}
              >
                {glyph.label}: {errors[c] > 0 ? "+" : ""}
                {(errors[c] * 100).toFixed(0)}%
              </li>
            ))}
          </ul>
        );
      default:
        return (
          <div className="flex gap-1.5">
            {glyphs.map((glyph, c) => (
              <div key={glyph.id} className="w-[3.25rem]">
                <WeightMap weights={nudge.weights[c]} />
              </div>
            ))}
          </div>
        );
    }
  };

  return (
    <div className="border bg-paper-raised p-5 hairline">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {STATIONS.map((entry, i) => {
          const active = i === station;
          return (
            <button
              key={entry.name}
              type="button"
              onClick={() => {
                setPlaying(false);
                setStation(i);
              }}
              aria-current={active ? "step" : undefined}
              className={`flex min-h-[10.5rem] flex-col items-start border p-3 text-left transition-colors ${
                active
                  ? "border-riso bg-riso/6"
                  : "hairline bg-paper opacity-55 hover:opacity-90"
              }`}
            >
              <span className="font-mono text-[0.625rem] text-plot">
                {i + 1}
              </span>
              <span className="text-sm font-semibold">{entry.name}</span>
              <span className="pb-2.5 text-[0.6875rem] leading-snug text-graphite">
                {entry.note}
              </span>
              <span className="mt-auto w-full">{body(i)}</span>
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-center mono-note text-graphite">
        ↑ station 6 hands the new numbers back to station 2, and it all runs
        again ↑
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t pt-4 hairline">
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className="bg-plot px-4 py-2 mono-note tracking-wider text-paper uppercase transition-colors hover:bg-ink"
        >
          {playing ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          onClick={() => {
            setPlaying(false);
            advance();
          }}
          className="border px-4 py-2 mono-note tracking-wider uppercase transition-colors hairline hover:border-plot"
        >
          Next station
        </button>
        <button
          type="button"
          onClick={() => {
            setPlaying(false);
            setNetwork(start);
            setStation(0);
            setLap(0);
            setPick(0);
          }}
          className="mono-note text-graphite underline underline-offset-4 hover:text-riso"
        >
          Start again
        </button>

        <span className="ml-auto flex gap-4 mono-note text-graphite">
          <span>
            laps <span className="text-ink">{lap}</span>
          </span>
          <span>
            loss{" "}
            <span className="text-ink">{report.loss.toFixed(4)}</span>
          </span>
          <span>
            right{" "}
            <span className="text-ink">
              {(report.accuracy * 100).toFixed(0)}%
            </span>
          </span>
        </span>
      </div>
    </div>
  );
}
