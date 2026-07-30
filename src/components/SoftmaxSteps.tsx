import { useState, type ReactNode } from "react";

/** Big enough that the exponentials become absurd and the shares still do not move. */
export const SHIFT = 100;

const signed = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(3)}`;

/** Keeps e^100 from printing as 26881171418161356000000000000000000000000000. */
const compact = (v: number) =>
  v >= 1e6 || (v > 0 && v < 1e-3) ? v.toExponential(3) : v.toFixed(3);

type Props = {
  labels: string[];
  /** The network's actual scores for one drawing. */
  scores: number[];
  /** Which character the drawing really is. */
  truth: number;
  /** Shown above the table — the drawing these scores came from. */
  children?: ReactNode;
};

/**
 * Softmax with the arithmetic left in.
 *
 * Every row shows its own score, that score exponentiated, and the division
 * that turns it into a share — all against one shared total, so the reader can
 * check the sum by hand. The scores are draggable because the interesting
 * behaviour lives in the gaps between them, and an untrained network's scores
 * are all within a whisker of each other.
 */
export function SoftmaxSteps({ labels, scores, truth, children }: Props) {
  const [edited, setEdited] = useState<number[] | null>(null);
  const [shifted, setShifted] = useState(false);

  // A glyph added or removed underneath us invalidates the edits.
  const base = edited?.length === scores.length ? edited : scores;
  const tampered = base !== scores || shifted;
  const shown = shifted ? base.map((s) => s + SHIFT) : base;
  const lifted = shown.map((s) => Math.exp(s));
  const total = lifted.reduce((a, b) => a + b, 0);
  const shares = lifted.map((v) => v / total);

  const setScore = (index: number, value: number) =>
    setEdited(base.map((s, i) => (i === index ? value : s)));

  // Wide enough to open real gaps, and never so narrow that a score the
  // network actually produced would sit off the end of its own slider.
  const reach = Math.max(4, ...scores.map((s) => Math.ceil(Math.abs(s))));

  return (
    <div className="border bg-paper-raised p-5 hairline">
      {children}

      {tampered && (
        <p className="mb-3 font-mono text-[0.6875rem] text-riso">
          Your scores now, not the network's — the rest of the page still quotes
          its own.
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] border-collapse">
          <thead>
            <tr className="border-b hairline">
              <th className="eyebrow pb-2 text-left font-normal">character</th>
              <th className="eyebrow pb-2 pl-4 text-right font-normal">score</th>
              <th className="eyebrow pb-2 pl-4 text-right font-normal">
                e to that power
              </th>
              <th className="eyebrow pb-2 pl-6 text-left font-normal">
                ÷ the total = its share
              </th>
            </tr>
          </thead>

          <tbody>
            {labels.map((label, c) => (
              <tr key={label} className="border-b hairline">
                <td className="py-2.5 pr-2">
                  <span className="text-sm">{label}</span>
                  {c === truth && (
                    <span className="ml-2 font-mono text-[0.625rem] text-riso">
                      ← the true one
                    </span>
                  )}
                </td>
                <td className="py-2.5 pl-4 text-right font-mono text-[0.6875rem] text-graphite whitespace-nowrap">
                  {signed(shown[c])}
                </td>
                <td className="py-2.5 pl-4 text-right font-mono text-[0.6875rem] whitespace-nowrap">
                  {compact(lifted[c])}
                </td>
                <td className="py-2.5 pl-6">
                  <div className="flex items-center gap-3">
                    <span className="hidden shrink-0 font-mono text-[0.6875rem] text-graphite sm:inline">
                      ÷ {compact(total)}
                    </span>
                    <span className="h-3 min-w-[3rem] flex-1 bg-plot/10">
                      <span
                        className="block h-full bg-plot"
                        style={{ width: `${shares[c] * 100}%` }}
                      />
                    </span>
                    <span className="w-14 shrink-0 text-right font-mono text-[0.6875rem]">
                      {(shares[c] * 100).toFixed(1)}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>

          <tfoot>
            <tr>
              <td className="pt-2.5 pr-2 text-sm text-graphite">total</td>
              <td />
              <td className="pt-2.5 pl-4 text-right font-mono text-[0.6875rem] font-semibold whitespace-nowrap">
                {compact(total)}
              </td>
              <td className="pt-2.5 pl-6">
                <div className="flex items-center gap-3">
                  <span className="hidden shrink-0 font-mono text-[0.6875rem] text-graphite sm:inline">
                    ÷ {compact(total)}
                  </span>
                  <span className="min-w-[3rem] flex-1" />
                  <span className="w-14 shrink-0 text-right font-mono text-[0.6875rem] font-semibold">
                    100.0%
                  </span>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-5 border-t pt-4 hairline">
        <p className="eyebrow">Move the scores yourself</p>
        <div className="mt-3 flex flex-col gap-2">
          {labels.map((label, c) => (
            <label key={label} className="flex items-center gap-3">
              <span className="w-20 shrink-0 truncate text-[0.8125rem]">
                {label}
              </span>
              <input
                type="range"
                min={-reach}
                max={reach}
                step={0.05}
                value={base[c]}
                onChange={(e) => setScore(c, Number(e.target.value))}
                className="min-w-0 flex-1 accent-riso"
                aria-label={`Score for ${label}`}
              />
            </label>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
          <button
            type="button"
            onClick={() => setShifted((s) => !s)}
            className="border border-plot px-3 py-1.5 font-mono text-[0.6875rem] tracking-[0.1em] text-plot uppercase transition-colors hover:bg-plot hover:text-paper"
          >
            {shifted ? `Take the ${SHIFT} back off` : `Add ${SHIFT} to every score`}
          </button>
          {base !== scores && (
            <button
              type="button"
              onClick={() => setEdited(null)}
              className="font-mono text-[0.6875rem] text-graphite underline underline-offset-4 hover:text-riso"
            >
              Put the network's own scores back
            </button>
          )}
        </div>

        <p className="mt-4 text-sm leading-relaxed">
          {shifted
            ? `Every score is ${SHIFT} higher and the exponentials are unrecognisable — yet not one share has moved.`
            : `Drag any score, or add ${SHIFT} to all of them at once, and watch which of these columns actually move.`}
        </p>
      </div>
    </div>
  );
}
