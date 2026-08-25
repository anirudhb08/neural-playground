import { useEffect, useMemo, useRef, useState } from "react";
import { mulberry32 } from "../lib/bigram";

/**
 * The grid of attention, in the three states it passes through — and the
 * failure that makes Q and K necessary.
 *
 * The "compare x with x" toggle exists because the honest first attempt at
 * content-based weights is to dot each row against the others directly, and
 * that attempt fails in a way worth seeing: x·x is the length of your own
 * vector squared, always large and always positive, so the diagonal dominates
 * and every position mostly listens to itself (measured over 2,000 draws:
 * self-score +4.00 against +0.01 for others; the last position keeps 82% of
 * its attention where fair would be 17%). Flip the toggle and watch the
 * diagonal light up; flip it back and the advantage vanishes, because with
 * two different learned matrices the diagonal is nothing special.
 *
 * The step-through exists because the finished grid hides its order: compare
 * one pair at a time along the chosen row, then forbid the future, then turn
 * what is left into shares. Watching one row do it once is worth more than a
 * paragraph about all of them.
 *
 * Nothing here is trained, so which position attends to which is arbitrary;
 * the caption says so. The shape of each stage is what the figure teaches.
 */
const TEXT = "the cat";
const T = TEXT.length;
const HEAD = 16;

const show = (c: string) => (c === " " ? "␣" : c);

type Stage = "scores" | "masked" | "weights";

function matmul(a: number[][], b: number[][]): number[][] {
  return a.map((row) =>
    b[0].map((_, j) => row.reduce((s, v, k) => s + v * b[k][j], 0)),
  );
}

export function AttentionGrid() {
  const [stage, setStage] = useState<Stage>("scores");
  const [scaled, setScaled] = useState(true);
  const [rawXX, setRawXX] = useState(false);
  const [row, setRow] = useState(6);
  const [animCell, setAnimCell] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<number | null>(null);

  const { qk, xx } = useMemo(() => {
    const rand = mulberry32(11);
    const gauss = () => {
      // Box–Muller, so the scores have the spread a real head's would.
      const u = Math.max(rand(), 1e-9);
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
    };
    const x = Array.from({ length: T }, () => Array.from({ length: HEAD }, gauss));
    // W entries scaled by 1/√HEAD so Q and K stay unit-spread, as in the lab.
    const w = () =>
      Array.from({ length: HEAD }, () =>
        Array.from({ length: HEAD }, () => gauss() / Math.sqrt(HEAD)),
      );
    const Q = matmul(x, w());
    const K = matmul(x, w());
    const dots = (A: number[][], B: number[][]) =>
      A.map((a) => B.map((b) => a.reduce((s, v, d) => s + v * b[d], 0)));
    return { qk: dots(Q, K), xx: dots(x, x) };
  }, []);

  const raw = rawXX ? xx : qk;
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

  function play() {
    if (timer.current !== null) clearInterval(timer.current);
    setPlaying(true);
    setStage("scores");
    setAnimCell(-1);
    let step = 0;
    const compares = row + 1;
    timer.current = window.setInterval(() => {
      step += 1;
      if (step <= compares) {
        setAnimCell(step - 1);
      } else if (step === compares + 2) {
        setStage("masked");
        setAnimCell(-1);
      } else if (step === compares + 5) {
        setStage("weights");
      } else if (step > compares + 5) {
        if (timer.current !== null) clearInterval(timer.current);
        setPlaying(false);
      }
    }, 260);
  }

  useEffect(() => () => {
    if (timer.current !== null) clearInterval(timer.current);
  }, []);

  const cell = (i: number, j: number) => {
    const future = j > i;
    const v = raw[i][j] / divisor;
    if (stage === "scores")
      return { text: v.toFixed(1), tone: Math.min(Math.abs(v) / 6, 1), future: false };
    if (stage === "masked")
      return future
        ? { text: "−∞", tone: 0, future: true }
        : { text: v.toFixed(1), tone: Math.min(Math.abs(v) / 6, 1), future: false };
    return future
      ? { text: "0", tone: 0, future: true }
      : { text: grid[i][j].toFixed(2), tone: grid[i][j], future: false };
  };

  return (
    <div className="border bg-paper-raised p-5 hairline">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
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
              disabled={playing}
              onClick={() => setStage(s)}
              className={`border px-3 py-1.5 font-mono text-[0.6875rem] disabled:opacity-40 ${
                stage === s ? "border-plot bg-plot text-paper" : "text-graphite hairline hover:text-plot"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={playing}
          onClick={play}
          className="border border-riso px-3 py-1.5 font-mono text-[0.6875rem] text-riso disabled:opacity-40"
        >
          ▶ step through row {show(TEXT[row])}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
        <label className="mono-note flex items-center gap-2 text-graphite">
          <input type="checkbox" checked={scaled} onChange={(e) => setScaled(e.target.checked)} className="accent-riso" />
          divide by √{HEAD}
        </label>
        <label className="mono-note flex items-center gap-2 text-graphite">
          <input type="checkbox" checked={rawXX} onChange={(e) => setRawXX(e.target.checked)} className="accent-riso" />
          compare x with x — skip Q and K
        </label>
      </div>

      <div className="mt-5 overflow-x-auto">
        {/* w-auto and the resets below: this table sits inside .prose, whose
            markdown-table rules would stretch it full width and uppercase the
            row labels. Those rules use :where(), so plain classes win. */}
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
                  const lit = i === row && j === animCell && stage === "scores";
                  return (
                    <td
                      key={j}
                      className={`h-8 w-11 border p-0 text-center font-mono text-[0.625rem] ${
                        c.future ? "border-transparent bg-graphite/10 text-graphite/50" : "hairline"
                      } ${i === row && !c.future ? "!border-riso" : ""} ${lit ? "!bg-riso/25" : ""}`}
                      style={
                        c.future || lit
                          ? undefined
                          : { backgroundColor: `color-mix(in srgb, var(--color-plot) ${c.tone * 55}%, transparent)` }
                      }
                    >
                      {playing && stage === "scores" && i === row && j > animCell && j <= row ? "" : c.text}
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
              <span
                className={`h-3 shrink-0 ${j === row && rawXX ? "bg-riso/70" : "bg-riso/40"}`}
                style={{ width: `${grid[row][j] * 60}%`, transition: "width 150ms" }}
              />
              <span className="font-mono text-[0.6875rem] text-graphite">{(grid[row][j] * 100).toFixed(0)}%</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="caption mt-4 max-w-[34rem]">
        {rawXX ? (
          <>
            With rows compared directly, watch the diagonal: x·x adds up
            squares, so it is large and positive whatever the row contains,
            and every position mostly matches <em>itself</em>. Q and K exist
            to take that advantage away.
          </>
        ) : scaled ? (
          <>
            Nothing here is trained, so <em>which</em> position attends to
            which means nothing — the shape is the lesson. The upper triangle
            is exactly zero, every row adds to 100%, and the first row can only
            ever be itself.
          </>
        ) : (
          <>
            Without the divisor the rows collapse: most put nearly everything
            on a single position. That spike passes almost no gradient back, so
            a head like this never learns its way out.
          </>
        )}
      </p>
    </div>
  );
}
