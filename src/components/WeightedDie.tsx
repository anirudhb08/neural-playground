import { useMemo, useRef, useState } from "react";
import {
  countBigrams,
  generate,
  mulberry32,
  sample,
  toProbabilities,
  type Draw,
} from "../lib/bigram";

const TEXT = "the cat sat on the mat";
const show = (c: string) => (c === " " ? "␣" : c);

/**
 * Sampling, with the mechanism left visible.
 *
 * Drawing from a distribution becomes `torch.multinomial` soon enough, and
 * before it does it is worth seeing that it is a ruler from 0 to 1 cut into
 * pieces, and a random number landing on one of them.
 */
export function WeightedDie() {
  const probs = useMemo(() => toProbabilities(countBigrams(TEXT)), []);
  const rows = useMemo(
    () => [...probs.keys()].sort((a, b) => a.localeCompare(b)),
    [probs],
  );

  const [given, setGiven] = useState("t");
  const [draw, setDraw] = useState<Draw | null>(null);
  const [tally, setTally] = useState<Record<string, number>>({});
  const [sentence, setSentence] = useState<string | null>(null);
  // Seeded, so the sequence is reproducible; advanced on every roll.
  const random = useRef(mulberry32(11));

  const row = probs.get(given);

  const roll = (times: number) => {
    if (!row) return;
    let last: Draw | null = null;
    const next = { ...tally };
    for (let i = 0; i < times; i++) {
      last = sample(row, random.current);
      if (last) next[last.picked] = (next[last.picked] ?? 0) + 1;
    }
    setDraw(last);
    setTally(next);
  };

  const reset = (c: string) => {
    setGiven(c);
    setDraw(null);
    setTally({});
  };

  const rolls = Object.values(tally).reduce((a, b) => a + b, 0);

  return (
    <div className="border bg-paper-raised p-5 hairline">
      <p className="eyebrow">Given this character</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {rows.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => reset(c)}
            aria-pressed={c === given}
            className={`border px-2.5 py-1 font-mono text-xs transition-colors ${
              c === given
                ? "border-riso bg-riso/8 text-ink"
                : "text-graphite hairline hover:border-plot hover:text-plot"
            }`}
          >
            {show(c)}
          </button>
        ))}
      </div>

      {row && (
        <>
          <div className="mt-6">
            <p className="eyebrow pb-2">
              The ruler from 0 to 1, cut by those probabilities
            </p>
            <div className="flex h-9 w-full overflow-hidden border hairline">
              {draw?.spans.map((s) => (
                <div
                  key={s.char}
                  className="flex items-center justify-center border-r font-mono text-[0.625rem] last:border-r-0 hairline"
                  style={{
                    width: `${(s.to - s.from) * 100}%`,
                    backgroundColor:
                      draw && s.char === draw.picked
                        ? "color-mix(in srgb, var(--color-riso) 22%, transparent)"
                        : "color-mix(in srgb, var(--color-plot) 10%, transparent)",
                  }}
                >
                  {show(s.char)}
                </div>
              ))}
              {!draw &&
                [...row.entries()]
                  .sort((a, b) => a[0].localeCompare(b[0]))
                  .map(([c, p]) => (
                    <div
                      key={c}
                      className="flex items-center justify-center border-r font-mono text-[0.625rem] last:border-r-0 hairline"
                      style={{
                        width: `${p * 100}%`,
                        backgroundColor:
                          "color-mix(in srgb, var(--color-plot) 10%, transparent)",
                      }}
                    >
                      {show(c)}
                    </div>
                  ))}
            </div>

            {draw && (
              <div
                className="relative mt-1 h-4"
                aria-hidden="true"
              >
                <span
                  className="absolute top-0 -translate-x-1/2 font-mono text-[0.625rem] text-riso"
                  style={{ left: `${draw.at * 100}%` }}
                >
                  ▲ {draw.at.toFixed(3)}
                </span>
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => roll(1)}
              className="bg-plot px-4 py-2 font-mono text-[0.6875rem] tracking-wider text-paper uppercase transition-colors hover:bg-ink"
            >
              Roll once
            </button>
            <button
              type="button"
              onClick={() => roll(200)}
              className="border px-4 py-2 font-mono text-[0.6875rem] tracking-wider uppercase transition-colors hairline hover:border-plot"
            >
              Roll 200 times
            </button>
            {rolls > 0 && (
              <button
                type="button"
                onClick={() => reset(given)}
                className="mono-note text-graphite underline underline-offset-4 hover:text-riso"
              >
                Start again
              </button>
            )}
          </div>

          {rolls > 0 && (
            <table className="mt-5 w-full max-w-md font-mono text-[0.6875rem]">
              <thead>
                <tr className="border-b text-left text-graphite hairline">
                  <th className="pb-1.5 font-normal">followed by</th>
                  <th className="pb-1.5 text-right font-normal">the model says</th>
                  <th className="pb-1.5 text-right font-normal">
                    {rolls} rolls gave
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...row.entries()]
                  .sort((a, b) => a[0].localeCompare(b[0]))
                  .map(([c, p]) => (
                    <tr key={c} className="border-b last:border-0 hairline">
                      <td className="py-1.5">{show(c)}</td>
                      <td className="py-1.5 text-right text-graphite">
                        {(p * 100).toFixed(1)}%
                      </td>
                      <td className="py-1.5 text-right">
                        {(((tally[c] ?? 0) / rolls) * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </>
      )}

      <div className="mt-6 border-t pt-5 hairline">
        <p className="eyebrow pb-2">And the same thing, in a loop</p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() =>
              setSentence(generate(probs, "t", 24, random.current))
            }
            className="border px-4 py-2 font-mono text-[0.6875rem] tracking-wider uppercase transition-colors hairline hover:border-plot"
          >
            Generate from “t”
          </button>
          {sentence && (
            <code className="font-mono text-sm">{sentence}</code>
          )}
        </div>
        <p className="caption mt-3 max-w-[34rem] text-graphite">
          Sample, append, feed the new character back in, repeat. Press it a few
          times — every run is different, because sampling is a die and not a
          lookup.
        </p>
      </div>
    </div>
  );
}
