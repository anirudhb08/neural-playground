import { useMemo, useState } from "react";
import {
  countBigrams,
  toProbabilities,
  vocabulary,
  type Counts,
} from "../lib/bigram";

const DEFAULT = "the cat sat on the mat";

const show = (c: string) => (c === " " ? "␣" : c);

/**
 * The whole model, recounted as you type.
 *
 * A bigram model has no parameters to train, so the table is not a summary of
 * the model — it *is* the model. Letting the reader change the text and watch
 * every number move is the cheapest way to make that stick.
 */
export function BigramTable() {
  const [text, setText] = useState(DEFAULT);
  const [showProbs, setShowProbs] = useState(false);

  const { chars, counts, probs } = useMemo(() => {
    const counts: Counts = countBigrams(text);
    return {
      chars: vocabulary(text),
      counts,
      probs: toProbabilities(counts),
    };
  }, [text]);

  const rowTotal = (prev: string) =>
    [...(counts.get(prev)?.values() ?? [])].reduce((a, b) => a + b, 0);

  return (
    <div className="border bg-paper-raised p-5 hairline">
      <label className="block">
        <span className="eyebrow">The text it counts</span>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="mt-2 w-full border bg-paper px-3 py-2.5 font-mono text-sm text-ink outline-none hairline focus:border-riso"
          aria-label="Text to count bigrams in"
        />
      </label>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
        <p className="mono-note text-graphite">
          {text.length} characters · {chars.length} distinct ·{" "}
          {Math.max(0, text.length - 1)} pairs
        </p>
        <button
          type="button"
          onClick={() => setShowProbs((s) => !s)}
          className="mono-note border px-3 py-1.5 text-graphite hairline transition-colors hover:border-plot hover:text-plot"
        >
          {showProbs ? "Show the counts" : "Divide each row by its total"}
        </button>
      </div>

      {chars.length === 0 ? (
        <p className="caption mt-5 text-graphite">
          Type something and the table below is built from it.
        </p>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="border-collapse font-mono text-[0.6875rem]">
            <thead>
              <tr>
                <th className="sticky left-0 bg-paper-raised p-1.5 text-left font-normal text-graphite">
                  <span className="sr-only">previous character</span>
                </th>
                {chars.map((c) => (
                  <th
                    key={c}
                    className="min-w-[2.1rem] p-1.5 font-normal text-graphite"
                    title={c === " " ? "space" : c}
                  >
                    {show(c)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chars.map((prev) => {
                const total = rowTotal(prev);
                return (
                  <tr key={prev} className="border-t hairline">
                    <th
                      scope="row"
                      className="sticky left-0 bg-paper-raised p-1.5 text-left font-normal text-ink"
                      title={prev === " " ? "space" : prev}
                    >
                      {show(prev)}
                    </th>
                    {chars.map((next) => {
                      const n = counts.get(prev)?.get(next) ?? 0;
                      const p = probs.get(prev)?.get(next) ?? 0;
                      return (
                        <td
                          key={next}
                          className="p-1.5 text-center"
                          style={{
                            backgroundColor:
                              n === 0
                                ? undefined
                                : `color-mix(in srgb, var(--color-plot) ${(showProbs ? p : n / Math.max(total, 1)) * 70}%, transparent)`,
                          }}
                          title={`${show(prev)} → ${show(next)}`}
                        >
                          {n === 0 ? (
                            <span className="text-graphite/40">·</span>
                          ) : showProbs ? (
                            p.toFixed(2).replace(/^0/, "")
                          ) : (
                            n
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="caption mt-4 max-w-[34rem] text-graphite">
        Rows are the character you just saw, columns the one that followed.{" "}
        {showProbs
          ? "Every row now sums to 1 — that is the whole model, and nothing was learned to get it."
          : "Press the button to divide each row by its own total."}
      </p>
    </div>
  );
}
