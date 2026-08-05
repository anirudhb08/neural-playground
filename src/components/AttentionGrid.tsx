import { useMemo, useState } from "react";
import { mulberry32 } from "../lib/bigram";

/**
 * The grid of attention, in the three states it passes through.
 *
 * Attention is hard to picture because three separate things happen to one
 * square of numbers: a comparison of everything against everything, a rule that
 * forbids half of it, and a normalisation. Shown as one finished picture it
 * looks arbitrary. Shown as three, each step is obvious.
 *
 * The scaling switch is the part worth building. Turning it off makes the rows
 * collapse to a single 1.0 in front of the reader, which is the failure the
 * divisor exists to prevent — and it is far more convincing to watch a row go
 * from shares to a spike than to be told that it would.
 *
 * The numbers are from a seeded generator and nothing here is trained, so the
 * *pattern* means nothing and the caption says so. What is true regardless, and
 * what the figure is for: the triangle, the rows summing to one, and what the
 * divisor does.
 */
const TEXT = "the cat";
const T = TEXT.length;
const HEAD = 16;

const show = (c: string) => (c === " " ? "␣" : c);

type Stage = "scores" | "masked" | "weights";

export function AttentionGrid() {
  const [stage, setStage] = useState<Stage>("scores");
  const [scaled, setScaled] = useState(true);
  const [row, setRow] = useState(6);

  const { raw, weights } = useMemo(() => {
    const rand = mulberry32(11);
    const gauss = () => {
      // Box–Muller, so the scores have the spread a real head's would.
      const u = Math.max(rand(), 1e-9);
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
    };
    const q = Array.from({ length: T }, () => Array.from({ length: HEAD }, gauss));
    const k = Array.from({ length: T }, () => Array.from({ length: HEAD }, gauss));
    const raw = q.map((qi) => k.map((kj) => qi.reduce((s, v, d) => s + v * kj[d], 0)));
    return { raw, weights: null };
  }, []);

  const divisor = scaled ? Math.sqrt(HEAD) : 1;

  const grid = useMemo(() => {
    return raw.map((r, i) => {
      const allowed = r.map((v, j) => (j <= i ? v / divisor : -Infinity));
      const max = Math.max(...allowed.filter(Number.isFinite));
      const exp = allowed.map((v) => (Number.isFinite(v) ? Math.exp(v - max) : 0));
      const sum = exp.reduce((a, b) => a + b, 0);
      return exp.map((v) => v / sum);
    });
  }, [raw, divisor]);

  const cell = (i: number, j: number) => {
    const future = j > i;
    if (stage === "scores") {
      const v = raw[i][j] / divisor;
      return { text: v.toFixed(1), tone: Math.min(Math.abs(v) / 6, 1), future: false };
    }
    if (stage === "masked") {
      return future
        ? { text: "−∞", tone: 0, future: true }
        : { text: (raw[i][j] / divisor).toFixed(1), tone: Math.min(Math.abs(raw[i][j] / divisor) / 6, 1), future: false };
    }
    return future
      ? { text: "0", tone: 0, future: true }
      : { text: grid[i][j].toFixed(2), tone: grid[i][j], future: false };
  };

  return (
    <div className="border bg-paper-raised p-5 hairline">
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <div className="flex gap-px">
          {(
            [
              ["scores", "1. compare"],
              ["masked", "2. forbid the future"],
              ["weights", "3. turn into shares"],
            ] as const
          ).map(([s, label]) => (
            <button
              key={s}
              type="button"
              onClick={() => setStage(s)}
              className={`border px-3 py-1.5 font-mono text-[0.6875rem] ${
                stage === s ? "border-plot bg-plot text-paper" : "text-graphite hairline hover:text-plot"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="mono-note flex items-center gap-2 text-graphite">
          <input type="checkbox" checked={scaled} onChange={(e) => setScaled(e.target.checked)} className="accent-riso" />
          divide by √{HEAD}
        </label>
      </div>

      <div className="mt-5 overflow-x-auto">
        {/* w-auto and the resets below matter: this table sits inside .prose,
            whose markdown-table rules would otherwise stretch it to full width,
            uppercase the row labels and add padding meant for prose. Those
            rules use :where(), so a plain class outranks them. */}
        <table className="w-auto border-separate border-spacing-1">
          <tbody>
            {Array.from({ length: T }, (_, i) => (
              <tr key={i}>
                <th
                  scope="row"
                  onClick={() => setRow(i)}
                  className={`w-6 cursor-pointer border-b-0 p-0 text-center font-mono text-[0.6875rem] tracking-normal normal-case ${i === row ? "text-riso" : "text-graphite"}`}
                >
                  {show(TEXT[i])}
                </th>
                {Array.from({ length: T }, (_, j) => {
                  const c = cell(i, j);
                  return (
                    <td
                      key={j}
                      className={`h-8 w-11 border p-0 text-center font-mono text-[0.625rem] ${
                        c.future ? "border-transparent bg-graphite/10 text-graphite/50" : "hairline"
                      } ${i === row && !c.future ? "!border-riso" : ""}`}
                      style={c.future ? undefined : { backgroundColor: `color-mix(in srgb, var(--color-plot) ${c.tone * 55}%, transparent)` }}
                    >
                      {c.text}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr>
              <th className="border-b-0 p-0" />
              {Array.from({ length: T }, (_, j) => (
                <td key={j} className="border-b-0 p-0 text-center font-mono text-[0.6875rem] text-graphite">
                  {show(TEXT[j])}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <p className="mono-note mt-3 text-graphite">
        row = the position doing the looking · column = the position looked at
      </p>

      <div className="mt-5 border-t pt-4 hairline">
        <p className="eyebrow">
          What “{show(TEXT[row])}” at position {row} takes from each
        </p>
        <ul className="mt-2 flex list-none flex-col gap-1 p-0">
          {Array.from({ length: row + 1 }, (_, j) => (
            <li key={j} className="flex items-center gap-2">
              <span className="w-4 shrink-0 text-right font-mono text-[0.6875rem] text-graphite">{show(TEXT[j])}</span>
              <span className="h-3 shrink-0 bg-riso/70" style={{ width: `${grid[row][j] * 60}%` }} />
              <span className="font-mono text-[0.6875rem] text-graphite">{(grid[row][j] * 100).toFixed(0)}%</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="caption mt-4 max-w-[34rem]">
        {scaled ? (
          <>
            Nothing here is trained, so <em>which</em> position attends to which
            means nothing — the shape is the lesson. The upper triangle is
            exactly zero, every row adds to 100%, and the first row can only
            ever be itself.
          </>
        ) : (
          <>
            Turn the divisor off and the rows collapse: almost every one puts
            94% or more onto a single position and rounds the rest away. That is
            what a head does without the correction, and a spike like this passes
            almost no gradient back — so it never learns its way out.
          </>
        )}
      </p>
    </div>
  );
}
