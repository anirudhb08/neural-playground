import { useState } from "react";
import { blameFor, forward, type Deep } from "../lib/deep";
import type { Sample } from "../lib/network";
import type { Glyph } from "../types";
import { InkGrid, WeightMap } from "./Grids";
import { Thumb } from "./Thumb";

const STAGES = [
  {
    name: "Forwards",
    line: "The drawing goes in. Each unit totals up what it sees and reports one number.",
  },
  {
    name: "The answer",
    line: "The output layer only ever sees those reports — never the drawing itself.",
  },
  {
    name: "Blame at the end",
    line: "The loss touches the output layer first: how far off was each character?",
  },
  {
    name: "Blame passed back",
    line: "Each unit is blamed in proportion to how heavily the output was leaning on it. This handing-back is backpropagation.",
  },
  {
    name: "Units that said nothing",
    line: "A unit that was switched off contributed nothing to the answer, so it is blamed for nothing. Its blame is struck out.",
  },
] as const;

type Props = {
  net: Deep;
  sample: Sample;
  glyphs: Glyph[];
};

export function BlameFlow({ net, sample, glyphs }: Props) {
  const [stage, setStage] = useState(0);
  const pass = forward(net, sample.pixels);
  const blame = blameFor(net, pass, sample.label);

  const loudest = Math.max(...pass.reported, 0.001);
  const worst = Math.max(...blame.passedBack.map(Math.abs), 0.001);

  return (
    <div className="border bg-paper-raised p-5 hairline">
      <ol className="flex flex-wrap gap-1.5">
        {STAGES.map((entry, i) => (
          <li key={entry.name}>
            <button
              type="button"
              onClick={() => setStage(i)}
              aria-current={i === stage ? "step" : undefined}
              className={`border px-3 py-1.5 font-mono text-[0.6875rem] transition-colors ${
                i === stage
                  ? "border-riso bg-riso/10 text-ink"
                  : i < stage
                    ? "hairline text-plot"
                    : "hairline text-graphite"
              }`}
            >
              {i + 1}. {entry.name}
            </button>
          </li>
        ))}
      </ol>

      <p className="mt-4 max-w-[36rem] text-sm leading-relaxed">
        {STAGES[stage].line}
      </p>

      <div className="mt-6 flex flex-wrap items-start gap-8">
        <figure className="w-28">
          <figcaption className="eyebrow pb-2">The drawing</figcaption>
          <InkGrid pixels={sample.pixels} />
          <p className="pt-2 font-mono text-[0.6875rem] text-graphite">
            a {glyphs[sample.label].label}
          </p>
        </figure>

        <div className="min-w-[18rem] flex-1">
          <p className="eyebrow pb-2">
            {net.units} hidden units — each one looks for its own pattern
          </p>
          <ul className="flex flex-col gap-1">
            {pass.reported.map((value, h) => {
              const off = pass.raw[h] <= 0;
              const struck = stage >= 4 && off;
              return (
                <li key={h} className="flex items-center gap-2.5">
                  <span className="w-7 shrink-0 font-mono text-[0.6875rem] text-graphite">
                    #{h}
                  </span>
                  <span className="h-8 w-8 shrink-0 border hairline">
                    <WeightMap weights={net.hidden[h]} />
                  </span>

                  <span className="h-2.5 w-24 shrink-0 bg-plot/10">
                    {stage >= 1 && (
                      <span
                        className="block h-full bg-plot"
                        style={{ width: `${(value / loudest) * 100}%` }}
                      />
                    )}
                  </span>
                  <span className="w-12 shrink-0 font-mono text-[0.6875rem] text-graphite">
                    {stage >= 1 ? (off ? "off" : value.toFixed(2)) : ""}
                  </span>

                  <span className="relative h-2.5 min-w-0 flex-1 bg-riso/10">
                    {stage >= 3 && (
                      <span
                        className={`block h-full ${struck ? "bg-graphite/25" : "bg-riso"}`}
                        style={{
                          width: `${(Math.abs(blame.passedBack[h]) / worst) * 100}%`,
                        }}
                      />
                    )}
                  </span>
                  <span
                    className={`w-14 shrink-0 text-right font-mono text-[0.6875rem] ${
                      struck ? "text-graphite line-through" : "text-riso"
                    }`}
                  >
                    {stage >= 3
                      ? struck
                        ? "no blame"
                        : blame.passedBack[h].toFixed(3)
                      : ""}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="mt-2 flex gap-2.5 font-mono text-[0.625rem] text-graphite">
            <span className="w-7" />
            <span className="w-8" />
            <span className="w-24">what it reported</span>
            <span className="flex-1 pl-14">blame handed back</span>
          </div>
        </div>

        <div className="w-40">
          <p className="eyebrow pb-2">The answer</p>
          <ul className="flex flex-col gap-2">
            {glyphs.map((glyph, c) => (
              <li key={glyph.id}>
                <div className="flex justify-between text-sm">
                  <span>{glyph.label}</span>
                  <span className="font-mono text-[0.6875rem]">
                    {stage >= 2 ? `${(pass.shares[c] * 100).toFixed(0)}%` : "—"}
                  </span>
                </div>
                {stage >= 2 && (
                  <p
                    className={`font-mono text-[0.6875rem] ${
                      blame.atOutput[c] > 0 ? "text-riso" : "text-plot"
                    }`}
                  >
                    off by {blame.atOutput[c] > 0 ? "+" : ""}
                    {(blame.atOutput[c] * 100).toFixed(0)}%
                  </p>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-4 h-20 w-20 border bg-paper hairline">
            <Thumb pixels={sample.pixels} />
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3 border-t pt-4 hairline">
        <button
          type="button"
          onClick={() => setStage((s) => Math.max(0, s - 1))}
          disabled={stage === 0}
          className="border px-4 py-2 font-mono text-[0.6875rem] tracking-wider uppercase transition-colors hairline hover:border-plot disabled:opacity-30"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => setStage((s) => Math.min(STAGES.length - 1, s + 1))}
          disabled={stage === STAGES.length - 1}
          className="bg-plot px-4 py-2 font-mono text-[0.6875rem] tracking-wider text-paper uppercase transition-colors hover:bg-ink disabled:opacity-30"
        >
          Next
        </button>
        <span className="ml-auto font-mono text-[0.6875rem] text-graphite">
          {stage + 1} of {STAGES.length}
        </span>
      </div>
    </div>
  );
}
