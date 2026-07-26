import { useState } from "react";
import { surprise } from "../lib/network";

const W = 320;
const H = 170;
const MAX = 4.6; // surprise at 1% belief, which is as far as the curve needs to go

function point(share: number): [number, number] {
  const x = share * W;
  const y = H - Math.min(surprise(share), MAX) * (H / MAX);
  return [x, y];
}

const PATH = Array.from({ length: 199 }, (_, i) => {
  const share = 0.01 + (i / 198) * 0.99;
  const [x, y] = point(share);
  return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
}).join(" ");

/** Lets the learner drag belief up and down and watch the cost respond. */
export function SurpriseCurve() {
  const [share, setShare] = useState(0.3);
  const [cx, cy] = point(share);
  const cost = surprise(share);

  return (
    <div className="border bg-paper-raised p-5 hairline">
      <div className="flex flex-wrap items-start gap-8">
        <div>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="h-[170px] w-[320px]"
            role="img"
            aria-label="Cost against belief in the right answer"
          >
            <line x1="0" y1={H} x2={W} y2={H} stroke="#77806f" strokeWidth="1" />
            <line x1="0" y1="0" x2="0" y2={H} stroke="#77806f" strokeWidth="1" />
            <path d={PATH} fill="none" stroke="#2e6a5c" strokeWidth="2" />
            <line
              x1={cx}
              y1={cy}
              x2={cx}
              y2={H}
              stroke="#ed3f72"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <circle cx={cx} cy={cy} r="5" fill="#ed3f72" />
          </svg>
          <div className="flex justify-between pt-1 font-mono text-[0.6875rem] text-graphite">
            <span>believed 1%</span>
            <span>believed 100%</span>
          </div>
        </div>

        <div className="min-w-[15rem] flex-1">
          <label className="block">
            <span className="eyebrow">
              How much did it believe the right answer?
            </span>
            <input
              type="range"
              min={1}
              max={100}
              value={Math.round(share * 100)}
              onChange={(e) => setShare(Number(e.target.value) / 100)}
              className="mt-3 w-full accent-riso"
            />
          </label>

          <dl className="mt-4 flex flex-col gap-2 font-mono text-xs">
            <div className="flex justify-between gap-4 border-b pb-2 hairline">
              <dt className="text-graphite">belief in the right answer</dt>
              <dd>{(share * 100).toFixed(0)}%</dd>
            </div>
            <div className="flex justify-between gap-4 pt-1">
              <dt className="text-graphite">cost</dt>
              <dd className="font-semibold text-riso">{cost.toFixed(2)}</dd>
            </div>
          </dl>

          <p className="mt-4 text-sm leading-relaxed">
            {share > 0.94
              ? "Almost no cost. It believed the right answer, so there is nothing to complain about."
              : share > 0.6
                ? "A small cost. Right, but not certain — there is still something to fix."
                : share > 0.25
                  ? "A real cost. It was hedging, and hedging on the truth is expensive."
                  : "A huge cost. It was confidently wrong, and the curve punishes that far harder than being merely unsure."}
          </p>
        </div>
      </div>
    </div>
  );
}
