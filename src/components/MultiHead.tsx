import { useMemo, useState } from "react";
import { mulberry32 } from "../lib/bigram";

/**
 * Two heads reading the same seven characters, disagreeing about who matters.
 *
 * The page proves that one head's average shreds information; this shows the
 * repair from the inside. Both heads get the identical x — only their learned
 * matrices differ — and the share bars come out different for every position.
 * That is the entire mechanism: two rulebooks, two patterns, at once, and the
 * strip underneath shows the answers laid side by side rather than blended,
 * which is how which-came-from-which survives.
 *
 * Untrained on purpose, and the caption says so: the patterns mean nothing,
 * their difference is the point.
 */
const TEXT = "the cat";
const T = TEXT.length;
const C = 16;

const show = (c: string) => (c === " " ? "␣" : c);

function headShares(): number[][][] {
  const rand = mulberry32(23);
  const gauss = () => {
    const u = Math.max(rand(), 1e-9);
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
  };
  const x = Array.from({ length: T }, () => Array.from({ length: C }, gauss));
  const mat = () =>
    Array.from({ length: C }, () => Array.from({ length: C }, () => gauss() / Math.sqrt(C)));
  const mm = (a: number[][], b: number[][]) =>
    a.map((r) => b[0].map((_, j) => r.reduce((s, v, k) => s + v * b[k][j], 0)));
  const shares = (): number[][] => {
    const Q = mm(x, mat());
    const K = mm(x, mat());
    return Q.map((q, i) => {
      const row = K.map((k, j) =>
        j <= i ? q.reduce((s, v, d) => s + v * k[d], 0) / Math.sqrt(C) : -Infinity,
      );
      const max = Math.max(...row.filter(Number.isFinite));
      const e = row.map((v) => (Number.isFinite(v) ? Math.exp(v - max) : 0));
      const total = e.reduce((a, b) => a + b, 0);
      return e.map((v) => v / total);
    });
  };
  return [shares(), shares()];
}

export function MultiHead() {
  const [row, setRow] = useState(6);
  const [a, b] = useMemo(headShares, []);

  const bars = (shares: number[][], color: string) => (
    <ul className="mt-2 flex list-none flex-col gap-1 p-0">
      {Array.from({ length: row + 1 }, (_, j) => (
        <li key={j} className="flex items-center gap-2">
          <span className="w-4 shrink-0 text-right font-mono text-[0.6875rem] text-graphite">
            {show(TEXT[j])}
          </span>
          <span
            className={`h-3 shrink-0 ${color}`}
            style={{ width: `${shares[row][j] * 52}%`, transition: "width 150ms" }}
          />
          <span className="font-mono text-[0.6875rem] text-graphite">
            {(shares[row][j] * 100).toFixed(0)}%
          </span>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="border bg-paper-raised p-5 hairline">
      <p className="eyebrow">One input, two heads — pick the position doing the looking</p>

      <ul className="mt-3 flex list-none flex-wrap gap-1.5 p-0">
        {[...TEXT].map((c, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => setRow(i)}
              className={`h-7 w-7 border font-mono text-[0.6875rem] ${
                i === row ? "border-riso bg-riso/8 text-ink" : "text-graphite hairline"
              }`}
            >
              {show(c)}
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-5 grid gap-x-10 gap-y-5 sm:grid-cols-2">
        <div>
          <p className="mono-note text-plot">head one takes from</p>
          {bars(a, "bg-plot/70")}
        </div>
        <div>
          <p className="mono-note text-riso">head two takes from</p>
          {bars(b, "bg-riso/60")}
        </div>
      </div>

      <div className="mt-5 border-t pt-4 hairline">
        <p className="eyebrow">The position's output: both answers, side by side</p>
        <div className="mt-2 flex gap-px">
          {Array.from({ length: C }, (_, i) => (
            <span
              key={i}
              className={`h-5 w-5 border ${i < C / 2 ? "bg-plot/25" : "bg-riso/20"} hairline`}
            />
          ))}
        </div>
        <p className="mono-note mt-1 text-graphite">
          ← head one’s 8 numbers · head two’s 8 numbers →
        </p>
      </div>

      <p className="caption mt-4 max-w-[34rem]">
        Nothing is trained, so neither pattern means anything — their
        <em> difference</em> is the point. Two rulebooks read the same seven
        characters and disagree about who matters, and the output keeps the two
        answers in separate lanes instead of averaging them into one.
      </p>
    </div>
  );
}
