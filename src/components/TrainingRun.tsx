import { useEffect, useRef, useState } from "react";
import {
  applyNudge,
  chanceLevel,
  evaluate,
  nudgeFor,
  type Network,
  type Report,
  type Sample,
} from "../lib/network";
import type { Glyph } from "../types";
import { WeightMap } from "./Grids";

type Point = { step: number; loss: number; held: number };

const PAD = 40;
const W = 600;
const H = 160;
const PLOT = W - PAD;
/** Loss can get arbitrarily close to zero; the axis has to stop somewhere. */
const FLOOR = 1e-4;
const DECADES = [1, 0.1, 0.01, 0.001, 0.0001];

function Curve({
  history,
  ceiling,
  logScale,
}: {
  history: Point[];
  ceiling: number;
  logScale: boolean;
}) {
  if (history.length < 2) {
    return (
      <div className="grid h-[160px] place-items-center border bg-paper hairline">
        <p className="font-mono text-xs text-graphite">
          Press play and the curve will draw itself.
        </p>
      </div>
    );
  }

  const top = Math.max(1, ...history.map((p) => p.loss));
  const yFor = (value: number) => {
    if (!logScale) return H - Math.min(value / ceiling, 1) * H;
    const clamped = Math.max(value, FLOOR);
    const share =
      (Math.log10(clamped) - Math.log10(FLOOR)) /
      (Math.log10(top) - Math.log10(FLOOR));
    return H - Math.max(0, Math.min(1, share)) * H;
  };

  const last = history[history.length - 1].step || 1;
  const path = (key: "loss" | "held") =>
    history
      .map((p, i) => {
        const x = PAD + (p.step / last) * PLOT;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${yFor(p[key]).toFixed(1)}`;
      })
      .join(" ");

  const marks = logScale
    ? DECADES.filter((d) => d <= top)
    : [ceiling * 0.75, ceiling * 0.5, ceiling * 0.25];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-[160px] w-full border bg-paper hairline"
      role="img"
      aria-label="Loss falling as training goes on"
    >
      {marks.map((value) => (
        <g key={value}>
          <line
            x1={PAD}
            y1={yFor(value)}
            x2={W}
            y2={yFor(value)}
            stroke="#2e6a5c"
            strokeOpacity="0.14"
            strokeWidth="1"
          />
          <text
            x={PAD - 6}
            y={yFor(value) + 3}
            textAnchor="end"
            fontSize="9"
            fill="#77806f"
            fontFamily="IBM Plex Mono, monospace"
          >
            {value >= 1 ? value : value.toFixed(String(value).length - 2)}
          </text>
        </g>
      ))}

      <line
        x1={PAD}
        y1={yFor(0.6931)}
        x2={W}
        y2={yFor(0.6931)}
        stroke="#77806f"
        strokeWidth="1"
        strokeDasharray="4 4"
      />
      <path d={path("held")} fill="none" stroke="#ed3f72" strokeWidth="1.5" />
      <path d={path("loss")} fill="none" stroke="#2e6a5c" strokeWidth="2" />
    </svg>
  );
}

function Metric({
  label,
  value,
  tone = "ink",
}: {
  label: string;
  value: string;
  tone?: "ink" | "plot" | "riso";
}) {
  return (
    <div>
      <p className="eyebrow">{label}</p>
      <p
        className={`mt-0.5 font-mono text-lg ${
          tone === "plot" ? "text-plot" : tone === "riso" ? "text-riso" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

type Props = {
  start: Network;
  train: Sample[];
  held: Sample[];
  glyphs: Glyph[];
};

export function TrainingRun({ start, train, held, glyphs }: Props) {
  const [network, setNetwork] = useState(start);
  const [step, setStep] = useState(0);
  const [history, setHistory] = useState<Point[]>([]);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(0.5);
  const [showChange, setShowChange] = useState(false);
  const [logScale, setLogScale] = useState(true);
  const timer = useRef<number | null>(null);

  const advance = (times: number) => {
    setNetwork((current) => {
      let next = current;
      for (let i = 0; i < times; i++) {
        next = applyNudge(next, nudgeFor(next, train), rate);
      }
      const trainReport = evaluate(next, train);
      const heldReport = evaluate(next, held);
      setStep((s) => {
        setHistory((h) => [
          ...h,
          { step: s + times, loss: trainReport.loss, held: heldReport.loss },
        ]);
        return s + times;
      });
      return next;
    });
  };

  useEffect(() => {
    if (!playing) return;
    timer.current = window.setInterval(() => advance(2), 60);
    return () => {
      if (timer.current !== null) window.clearInterval(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, rate, train, held]);

  useEffect(() => {
    setNetwork(start);
    setStep(0);
    setHistory([]);
    setPlaying(false);
  }, [start, train]);

  const trainReport: Report = evaluate(network, train);
  const heldReport: Report = evaluate(network, held);
  const ceiling = Math.max(chanceLevel(glyphs.length) * 1.2, ...history.map((p) => p.loss));

  return (
    <div className="border bg-paper-raised p-5 hairline">
      <Curve history={history} ceiling={ceiling} logScale={logScale} />
      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 mono-note text-graphite">
        <span>
          <span className="inline-block h-0.5 w-4 align-middle bg-plot" /> loss
          on the drawings it trains on
        </span>
        <span>
          <span className="inline-block h-0.5 w-4 align-middle bg-riso" /> loss
          on the ones it has never seen
        </span>
        <span>· · · a network that knows nothing</span>
        <button
          type="button"
          onClick={() => setLogScale((l) => !l)}
          className="ml-auto text-plot underline underline-offset-4 hover:text-riso"
        >
          {logScale ? "even scale" : "ten-times scale"}
        </button>
      </div>
      {logScale && (
        <p className="mt-1.5 mono-note text-graphite">
          Each line up the side is ten times the one below it, so steady
          progress reads as a steady slope. Switch to an even scale and almost
          all of it collapses into the first few steps.
        </p>
      )}

      <div className="mt-5 grid grid-cols-2 gap-4 border-y py-4 sm:grid-cols-4 hairline">
        <Metric label="Loss" value={trainReport.loss.toFixed(4)} tone="plot" />
        <Metric
          label="Gets right"
          value={`${(trainReport.accuracy * 100).toFixed(0)}%`}
        />
        <Metric
          label="How sure"
          value={`${(trainReport.confidence * 100).toFixed(0)}%`}
        />
        <Metric
          label="Never seen before"
          value={
            held.length === 0
              ? "—"
              : `${(heldReport.accuracy * 100).toFixed(0)}%`
          }
          tone={heldReport.accuracy < trainReport.accuracy ? "riso" : "ink"}
        />
      </div>

      <div className="mt-5 flex flex-wrap items-start gap-6">
        {glyphs.map((glyph, c) => (
          <figure key={glyph.id} className="w-36">
            <figcaption className="pb-2 mono-note text-graphite">
              {glyph.label}
            </figcaption>
            <WeightMap
              weights={
                showChange
                  ? network.weights[c].map((w, i) => w - start.weights[c][i])
                  : network.weights[c]
              }
            />
          </figure>
        ))}
        <div className="min-w-[12rem] flex-1">
          <button
            type="button"
            onClick={() => setShowChange((s) => !s)}
            className="mono-note text-plot underline underline-offset-4 hover:text-riso"
          >
            {showChange ? "Show the scorecards" : "Show only what changed"}
          </button>
          <p className="mt-2 max-w-[20rem] caption text-graphite">
            {showChange
              ? "The random numbers it started with, subtracted away. This is purely what training put there."
              : "The scorecards as they stand, random starting values and all."}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t pt-4 hairline">
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
            advance(1);
          }}
          className="border px-4 py-2 mono-note tracking-wider uppercase transition-colors hairline hover:border-plot"
        >
          One step
        </button>
        <button
          type="button"
          onClick={() => {
            setPlaying(false);
            setNetwork(start);
            setStep(0);
            setHistory([]);
          }}
          className="mono-note text-graphite underline underline-offset-4 hover:text-riso"
        >
          Start again
        </button>

        <label className="ml-auto flex items-center gap-2 mono-note text-graphite">
          step size
          <input
            type="range"
            min={1}
            max={200}
            value={Math.round(rate * 20)}
            onChange={(e) => setRate(Number(e.target.value) / 20)}
            className="w-28 accent-plot"
          />
          <span className="w-8 text-right">{rate.toFixed(2)}</span>
        </label>
        <span className="mono-note text-graphite">
          step {step}
        </span>
      </div>
    </div>
  );
}
