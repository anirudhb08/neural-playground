import { useEffect, useRef, useState } from "react";
import { initParams, lossAndGrads, sgdStep, nextProbs, T, type Params } from "../lib/tinygpt";
import { TRAINING_TEXT } from "../labs/trainingText";

/**
 * The assembled model, training live on the tutorial's own prose.
 *
 * The chart carries the part's argument: the dashed riso line is the bigram
 * floor on the held-out tenth — the best any memory-free predictor can do —
 * and the val curve crosses under it while you watch. Train loss is drawn
 * too, fainter, so the mirror/window gap from the small-text act is visible
 * in reverse: here they fall together, because there is enough text.
 *
 * Batch 8 rather than the lab's 16, so a step fits a frame budget; the model
 * and recipe are otherwise the lab's. The JS model is the verified port in
 * lib/tinygpt.ts.
 */
const chars = [...new Set(TRAINING_TEXT)].sort();
const V = chars.length;
const IDX = new Map(chars.map((c, i) => [c, i] as const));
const DATA = Int32Array.from([...TRAINING_TEXT].map((c) => IDX.get(c)!));
const CUT = Math.floor(DATA.length * 0.9);
const TRAIN = DATA.subarray(0, CUT);
const VAL = DATA.subarray(CUT);
const B = 8, LR = 0.3, TOTAL = 2000;

const FLOOR = (() => {
  const pairs = Array.from({ length: V }, () => new Float64Array(V).fill(1));
  for (let i = 0; i + 1 < TRAIN.length; i++) pairs[TRAIN[i]][TRAIN[i + 1]] += 1;
  const P = pairs.map((r) => { const s = r.reduce((a, b) => a + b, 0); return r.map((v) => v / s); });
  let tot = 0;
  for (let i = 0; i + 1 < VAL.length; i++) tot -= Math.log(P[VAL[i]][VAL[i + 1]]);
  return tot / (VAL.length - 1);
})();
const UNIFORM = Math.log(V);

function makeRand(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function valLoss(p: Params): number {
  let tot = 0, n = 0;
  for (let s = 0; s + T + 1 < VAL.length; s += 24) {
    const x = new Int32Array(T), y = new Int32Array(T);
    for (let t2 = 0; t2 < T; t2++) { x[t2] = VAL[s + t2]; y[t2] = VAL[s + t2 + 1]; }
    tot += lossAndGrads(p, x, y, 1, T, V).loss; n++;
  }
  return tot / n;
}

function sample(p: Params, rand: () => number): string {
  const ids = [..."the model "].map((c) => IDX.get(c)!);
  for (let i = 0; i < 64; i++) {
    const probs = nextProbs(p, ids, V, 0.9);
    let r = rand(), pick = V - 1;
    for (let j = 0; j < V; j++) { r -= probs[j]; if (r < 0) { pick = j; break; } }
    ids.push(pick);
  }
  return ids.map((i) => chars[i]).join("");
}

const W = 460, H = 170, LO = 1.4, HI = 3.8;

export function TrainGPT() {
  const params = useRef<Params>(initParams(V, 5));
  const rand = useRef(makeRand(99));
  // Progress lives in refs and the loop mutates them; one counter state
  // triggers renders. setState work inside a setState updater gets dropped
  // by React, which is exactly how the first version of this trained at
  // full speed while displaying step 0 forever.
  const stepRef = useRef(0);
  const trainRef = useRef<[number, number][]>([]);
  const valRef = useRef<[number, number][]>([]);
  const textRef = useRef("");
  const ema = useRef(0);
  const [, setTick] = useState(0);
  const [running, setRunning] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    if (!running) return;
    // setInterval, not requestAnimationFrame: rAF stops entirely in an
    // occluded window, and a reader who switches tabs mid-training would come
    // back to a widget frozen where they left it. Intervals get clamped in
    // hidden tabs but keep firing, so training continues at reduced pace.
    const tick = () => {
      try {
        const p = params.current;
        for (let i = 0; i < 3 && stepRef.current < TOTAL; i++) {
          const x = new Int32Array(B * T), y = new Int32Array(B * T);
          for (let b = 0; b < B; b++) {
            const st = Math.floor(rand.current() * (TRAIN.length - T - 1));
            for (let t2 = 0; t2 < T; t2++) { x[b * T + t2] = TRAIN[st + t2]; y[b * T + t2] = TRAIN[st + t2 + 1]; }
          }
          const { loss, g } = lossAndGrads(p, x, y, B, T, V);
          sgdStep(p, g, LR);
          ema.current = ema.current === 0 ? loss : 0.95 * ema.current + 0.05 * loss;
          stepRef.current += 1;
          if (stepRef.current % 60 === 0) trainRef.current.push([stepRef.current, ema.current]);
          if (stepRef.current % 200 === 0 || stepRef.current === TOTAL) {
            valRef.current.push([stepRef.current, valLoss(p)]);
            textRef.current = sample(p, makeRand(7));
          }
        }
        if (stepRef.current >= TOTAL) setRunning(false);
        setTick((t) => t + 1);
      } catch (e) {
        setFailed(String(e));
        setRunning(false);
      }
    };
    const timer = window.setInterval(tick, 30);
    return () => clearInterval(timer);
  }, [running]);

  const reset = () => {
    params.current = initParams(V, 5);
    rand.current = makeRand(99);
    ema.current = 0;
    stepRef.current = 0; trainRef.current = []; valRef.current = []; textRef.current = "";
    setRunning(false); setFailed(null); setTick((t) => t + 1);
  };
  const step = stepRef.current, trainCurve = trainRef.current,
    valCurve = valRef.current, text = textRef.current;

  const y = (l: number) => H - ((Math.min(Math.max(l, LO), HI) - LO) / (HI - LO)) * H;
  const x = (s: number) => (s / TOTAL) * W;
  const path = (pts: [number, number][]) =>
    pts.map(([s, l], i) => `${i === 0 ? "M" : "L"}${x(s).toFixed(1)} ${y(l).toFixed(1)}`).join(" ");
  const lastVal = valCurve.length ? valCurve[valCurve.length - 1][1] : null;

  return (
    <div className="border bg-paper-raised p-5 hairline">
      <p className="eyebrow">The assembled model, training on this tutorial's own prose</p>

      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img"
        aria-label="Training and held-out loss crossing under the bigram floor">
        <line x1="0" y1={y(UNIFORM)} x2={W} y2={y(UNIFORM)} stroke="var(--color-graphite)" strokeWidth="1" strokeDasharray="3 3" />
        <line x1="0" y1={y(FLOOR)} x2={W} y2={y(FLOOR)} stroke="var(--color-riso)" strokeWidth="1" strokeDasharray="3 3" />
        <path d={path(trainCurve)} fill="none" stroke="var(--color-plot-soft)" strokeWidth="1.5" />
        <path d={path(valCurve)} fill="none" stroke="var(--color-riso)" strokeWidth="2" />
      </svg>
      <div className="mono-note mt-1 flex flex-wrap gap-x-5 text-graphite">
        <span>— — knowing nothing {UNIFORM.toFixed(2)}</span>
        <span className="text-riso">— — bigram floor {FLOOR.toFixed(2)}</span>
        <span className="text-plot-soft">— train</span>
        <span className="text-riso">— held-out</span>
      </div>

      <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3 border-t pt-4 hairline">
        <div>
          <dt className="eyebrow">Step</dt>
          <dd className="mt-0.5 font-mono text-sm">{step}</dd>
        </div>
        <div>
          <dt className="eyebrow">Held-out loss</dt>
          <dd className={`mt-0.5 font-mono text-sm ${lastVal !== null && lastVal < FLOOR ? "text-plot" : "text-riso"}`}>
            {lastVal === null ? "—" : lastVal.toFixed(3)}
          </dd>
        </div>
        <div>
          <dt className="eyebrow">Beats the bigram</dt>
          <dd className="mt-0.5 font-mono text-sm">{lastVal !== null && lastVal < FLOOR ? "yes" : "not yet"}</dd>
        </div>
      </dl>

      {failed && <p className="caption mt-3 text-riso">The loop hit an error: {failed}</p>}

      {text && (
        <>
          <p className="eyebrow mt-4">Sampling from it, mid-training</p>
          <p className="mt-1 font-mono text-sm break-all">“{text}”</p>
        </>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" onClick={() => setRunning((r) => !r)} disabled={step >= TOTAL}
          className="border border-plot bg-plot px-4 py-1.5 font-mono text-[0.6875rem] tracking-[0.14em] text-paper uppercase disabled:opacity-40">
          {step >= TOTAL ? "Trained" : running ? "Pause" : step === 0 ? `Train ${TOTAL} steps` : "Continue"}
        </button>
        <button type="button" onClick={reset}
          className="border px-4 py-1.5 font-mono text-[0.6875rem] tracking-[0.14em] text-graphite uppercase hairline hover:text-plot">
          Reset
        </button>
      </div>

      <p className="caption mt-4 max-w-[34rem]">
        The dashed riso line is the best any one-character model can score on
        the held-back tenth of this text. Watch the held-out curve cross under
        it — the first measurable proof that the context machinery earns its
        keep. Half a minute or so, live in this tab.
      </p>
    </div>
  );
}
