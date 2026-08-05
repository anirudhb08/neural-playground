import { useCallback, useEffect, useRef, useState } from "react";
import { mulberry32 } from "../lib/bigram";

/**
 * The first thing in this tutorial that improves on its own.
 *
 * Two horizontal lines make the figure worth having, and both are computed from
 * the text rather than typed in. The upper one is ln(V): what a model that knows
 * nothing scores. The lower one is the entropy of the text's own bigram
 * distribution — the best any one-character model can possibly do, and exactly
 * what the counted table from earlier achieves.
 *
 * So the curve is not just going down, it is going down *towards a number the
 * reader already has*. Training rediscovers, by nudging, the table that counting
 * produced directly — which is the point of the part, and is watchable rather
 * than asserted.
 *
 * The generated sample is here for the same reason. A loss falling from 2.56 to
 * 0.83 means nothing to most readers; `the sat on the log` appearing where there
 * was gibberish means something immediately.
 */
const TEXT = "the cat sat on the mat and the dog sat on the log";
const CHARS = [...new Set(TEXT)].sort();
const V = CHARS.length;
const STOI = new Map(CHARS.map((c, i) => [c, i]));
const DATA = [...TEXT].map((c) => STOI.get(c)!);

const BLOCK = 8;
const BATCH = 4;
const RATE = 1.0;
/** Steps per animation frame. Small enough to watch, large enough to finish. */
const PER_FRAME = 4;
const TOTAL = 600;

const zeros = () => Array.from({ length: V }, () => new Float64Array(V));

/** ln(V): every character equally likely, which is what a table of zeros gives. */
const UNIFORM = Math.log(V);

/**
 * The entropy of the text's real bigram distribution — the floor for anything
 * that sees one character. Derived here so it cannot drift from the text above.
 */
const FLOOR = (() => {
  const pairs = zeros();
  for (let i = 0; i < DATA.length - 1; i++) pairs[DATA[i]][DATA[i + 1]] += 1;
  const total = DATA.length - 1;
  let h = 0;
  for (let a = 0; a < V; a++) {
    const rowTotal = pairs[a].reduce((s, n) => s + n, 0);
    if (!rowTotal) continue;
    let rowH = 0;
    for (let b = 0; b < V; b++) {
      const p = pairs[a][b] / rowTotal;
      if (p > 0) rowH -= p * Math.log(p);
    }
    h += (rowTotal / total) * rowH;
  }
  return h;
})();

function softmax(row: Float64Array): Float64Array {
  let max = -Infinity;
  for (const v of row) if (v > max) max = v;
  const out = new Float64Array(row.length);
  let sum = 0;
  for (let i = 0; i < row.length; i++) {
    out[i] = Math.exp(row[i] - max);
    sum += out[i];
  }
  for (let i = 0; i < row.length; i++) out[i] /= sum;
  return out;
}

/** Loss over every position in the text, so the number does not jump about. */
function lossOverAll(table: Float64Array[]): number {
  let total = 0;
  for (let i = 0; i < DATA.length - 1; i++) {
    const p = softmax(table[DATA[i]]);
    total -= Math.log(Math.max(p[DATA[i + 1]], 1e-12));
  }
  return total / (DATA.length - 1);
}

function generate(table: Float64Array[], rand: () => number, n: number): string {
  let at = STOI.get("t")!;
  let out = "t";
  for (let i = 0; i < n; i++) {
    const p = softmax(table[at]);
    let r = rand();
    let pick = V - 1;
    for (let j = 0; j < V; j++) {
      r -= p[j];
      if (r < 0) {
        pick = j;
        break;
      }
    }
    out += CHARS[pick];
    at = pick;
  }
  return out;
}

const W = 460;
const H = 150;
const TOP = 2.8;

export function TrainBigram() {
  const table = useRef<Float64Array[]>(zeros());
  const rand = useRef(mulberry32(7));
  const [step, setStep] = useState(0);
  const [curve, setCurve] = useState<number[]>([lossOverAll(zeros())]);
  const [sample, setSample] = useState(() => generate(zeros(), mulberry32(7), 34));
  const [running, setRunning] = useState(false);

  const one = useCallback(() => {
    // One gradient step, written out. For this model the derivative of the loss
    // with respect to a score is just (probability - 1 if it was the answer),
    // which is why no autograd is needed to do this honestly.
    const xs: number[] = [];
    const ys: number[] = [];
    for (let b = 0; b < BATCH; b++) {
      const start = Math.floor(rand.current() * (DATA.length - BLOCK - 1));
      for (let t = 0; t < BLOCK; t++) {
        xs.push(DATA[start + t]);
        ys.push(DATA[start + t + 1]);
      }
    }
    const grad = zeros();
    for (let i = 0; i < xs.length; i++) {
      const p = softmax(table.current[xs[i]]);
      for (let j = 0; j < V; j++) {
        grad[xs[i]][j] += (p[j] - (j === ys[i] ? 1 : 0)) / xs.length;
      }
    }
    for (let a = 0; a < V; a++)
      for (let b = 0; b < V; b++) table.current[a][b] -= RATE * grad[a][b];
  }, []);

  useEffect(() => {
    if (!running) return;
    let frame = 0;
    const tick = () => {
      for (let i = 0; i < PER_FRAME; i++) one();
      setStep((s) => {
        const next = s + PER_FRAME;
        if (next >= TOTAL) setRunning(false);
        return next;
      });
      setCurve((c) => [...c, lossOverAll(table.current)]);
      setSample(generate(table.current, mulberry32(7), 34));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running, one]);

  const reset = () => {
    table.current = zeros();
    rand.current = mulberry32(7);
    setStep(0);
    setCurve([lossOverAll(zeros())]);
    setSample(generate(zeros(), mulberry32(7), 34));
    setRunning(false);
  };

  const y = (loss: number) => H - (Math.min(loss, TOP) / TOP) * H;
  const path = curve
    .map((l, i) => `${i === 0 ? "M" : "L"}${((i / (TOTAL / PER_FRAME)) * W).toFixed(1)} ${y(l).toFixed(1)}`)
    .join(" ");
  const now = curve[curve.length - 1];

  return (
    <div className="border bg-paper-raised p-5 hairline">
      <p className="eyebrow">Loss, every step</p>

      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img" aria-label="Loss falling as the model trains">
        <line x1="0" y1={y(UNIFORM)} x2={W} y2={y(UNIFORM)} stroke="var(--color-graphite)" strokeWidth="1" strokeDasharray="3 3" />
        <line x1="0" y1={y(FLOOR)} x2={W} y2={y(FLOOR)} stroke="var(--color-riso)" strokeWidth="1" strokeDasharray="3 3" />
        <path d={path} fill="none" stroke="var(--color-plot)" strokeWidth="2" />
      </svg>

      <div className="mono-note mt-1 flex flex-wrap gap-x-6 text-graphite">
        <span>— — knowing nothing, {UNIFORM.toFixed(4)}</span>
        <span className="text-riso">— — the best one character can do, {FLOOR.toFixed(4)}</span>
      </div>

      <dl className="mt-5 flex flex-wrap gap-x-10 gap-y-3 border-t pt-4 hairline">
        <div>
          <dt className="eyebrow">Step</dt>
          <dd className="mt-0.5 font-mono text-sm">{step}</dd>
        </div>
        <div>
          <dt className="eyebrow">Loss now</dt>
          <dd className="mt-0.5 font-mono text-sm text-riso">{now.toFixed(4)}</dd>
        </div>
      </dl>

      <p className="eyebrow mt-5">Generating from “t”</p>
      <p className="mt-1 font-mono text-sm break-all">“{sample}”</p>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setRunning((r) => !r)}
          disabled={step >= TOTAL}
          className="border border-plot bg-plot px-4 py-1.5 font-mono text-[0.6875rem] tracking-[0.14em] text-paper uppercase disabled:opacity-40"
        >
          {step >= TOTAL ? "Trained" : running ? "Pause" : step === 0 ? `Train ${TOTAL} steps` : "Continue"}
        </button>
        <button
          type="button"
          onClick={reset}
          className="border px-4 py-1.5 font-mono text-[0.6875rem] tracking-[0.14em] text-graphite uppercase hairline hover:text-plot"
        >
          Reset
        </button>
      </div>

      <p className="caption mt-4 max-w-[34rem]">
        The table starts at zeros, which is why it opens exactly on the upper
        line. Watch where it stops: the lower line is what counting achieved
        directly, and nothing that sees one character can beat it. The curve
        wobbles on the way because each step is judged on four short chunks
        rather than the whole text.
      </p>
    </div>
  );
}
