import { useMemo, useState } from "react";
import { mulberry32 } from "../lib/bigram";

/**
 * One signal crossing 24 layers, three ways: replaced, added, added-and-tidied.
 *
 * The chart exists because the residual/layernorm pair is usually taught as
 * two separate tricks, and drawn together they are visibly one system: replace
 * compounds to nothing, add survives but drifts without limit, add-then-tidy
 * holds flat at 1. The gain slider is the argument that this is not about one
 * unlucky setting — timid layers (gain below 1) kill the replace line, bold
 * ones (above 1) explode it, and the tidied line does not care.
 *
 * Log scale, because the whole story is exponents: 0.7^24 and 1.3^24 do not
 * fit on any linear axis together.
 */
const C = 32;
const LAYERS = 24;

function gauss(rand: () => number) {
  const u = Math.max(rand(), 1e-9);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

/** Unit-gain layer matrices and a starting signal, fixed once. */
function makeBase() {
  const rand = mulberry32(7);
  const Ws = Array.from({ length: LAYERS }, () =>
    Array.from({ length: C }, () => Array.from({ length: C }, () => gauss(rand) / Math.sqrt(C))),
  );
  const x0 = Array.from({ length: C }, () => gauss(rand));
  return { Ws, x0 };
}

const std = (v: number[]) => {
  const m = v.reduce((a, b) => a + b, 0) / v.length;
  return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length);
};
const matvec = (v: number[], W: number[][], g: number) =>
  W[0].map((_, j) => g * v.reduce((s, vi, i) => s + vi * W[i][j], 0));
const ln = (v: number[]) => {
  const m = v.reduce((a, b) => a + b, 0) / v.length;
  const s = Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length + 1e-5);
  return v.map((vi) => (vi - m) / s);
};

const W = 460, H = 170;
const LO = -4, HI = 3; // log10 range shown

export function DeepStack() {
  const [gain, setGain] = useState(0.7);
  const { Ws, x0 } = useMemo(makeBase, []);

  const curves = useMemo(() => {
    let a = x0.slice(), b = x0.slice(), c = x0.slice();
    const rep = [1], add = [1], tidy = [1];
    for (const Wk of Ws) {
      a = matvec(a, Wk, gain);
      b = b.map((v, i) => v + matvec(b, Wk, gain)[i]);
      c = ln(c.map((v, i) => v + matvec(c, Wk, gain)[i]));
      rep.push(std(a)); add.push(std(b)); tidy.push(std(c));
    }
    return { rep, add, tidy };
  }, [Ws, x0, gain]);

  const y = (v: number) => {
    const l = Math.max(LO, Math.min(HI, Math.log10(Math.max(v, 1e-12))));
    return H - ((l - LO) / (HI - LO)) * H;
  };
  const path = (vals: number[]) =>
    vals.map((v, k) => `${k === 0 ? "M" : "L"}${((k / LAYERS) * W).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const last = (vals: number[]) => {
    const v = vals[vals.length - 1];
    return v >= 100 ? v.toFixed(0) : v >= 0.01 ? v.toFixed(2) : v.toExponential(0);
  };

  return (
    <div className="border bg-paper-raised p-5 hairline">
      <p className="eyebrow">One signal, 24 layers, three ways to pass it down</p>

      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img"
        aria-label="Signal size across 24 layers for replace, add, and add-then-tidy">
        <line x1="0" y1={y(1)} x2={W} y2={y(1)} stroke="var(--grid-ink)" strokeWidth="1" />
        <path d={path(curves.rep)} fill="none" stroke="var(--color-graphite)" strokeWidth="2" strokeDasharray="4 3" />
        <path d={path(curves.add)} fill="none" stroke="var(--color-riso)" strokeWidth="2" />
        <path d={path(curves.tidy)} fill="none" stroke="var(--color-plot)" strokeWidth="2" />
      </svg>
      <p className="mono-note mt-1 text-graphite">layer 0 → 24, size on a log scale (line = size 1)</p>

      <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3 border-t pt-4 hairline">
        <div>
          <dt className="mono-note text-graphite">— — replace</dt>
          <dd className="mt-0.5 font-mono text-sm">{last(curves.rep)}</dd>
        </div>
        <div>
          <dt className="mono-note text-riso">— add</dt>
          <dd className="mt-0.5 font-mono text-sm">{last(curves.add)}</dd>
        </div>
        <div>
          <dt className="mono-note text-plot">— add, then tidy</dt>
          <dd className="mt-0.5 font-mono text-sm">{last(curves.tidy)}</dd>
        </div>
      </dl>

      <label className="mt-5 block max-w-[16rem]">
        <span className="mono-note text-graphite">layer gain: {gain.toFixed(2)}</span>
        <input type="range" min={0.5} max={1.5} step={0.05} value={gain}
          onChange={(e) => setGain(Number(e.target.value))}
          className="mt-2 w-full accent-riso" aria-label="Gain of each layer" />
      </label>

      <p className="caption mt-4 max-w-[34rem]">
        Drag the gain. Timid layers starve the replace line, bold ones explode
        it — and the added-then-tidied line does not care, because adding never
        erases and tidying resets the size after every layer. That indifference
        is what lets blocks stack.
      </p>
    </div>
  );
}
