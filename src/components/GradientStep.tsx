import { useEffect, useRef, useState } from "react";

/**
 * One row of the grid, learning from one fact at a time.
 *
 * The page derives the push/pull rule; this is where the reader gets to feel
 * it. Two buttons, one per fact the text actually contains about `t` (four
 * occurrences say h, four say space). Pressing one applies a single gradient
 * step to the row for `t` and nothing else — deterministic, no seed, so two
 * readers pressing the same buttons see the same numbers.
 *
 * What it exists to demonstrate: show the row only t→h and it climbs toward
 * certainty, because it believes the only fact it has seen. Alternate the two
 * and h and space squeeze everything else out, then trade a band around 50%
 * between themselves — the pushes only balance where the shares match how
 * often each answer occurs, which is why training lands where counting lands.
 *
 * The learning rate here is 0.5, not the loop's 1.0. Measured: at 1.0 a
 * single alternating example seesaws between 33% and 64%, which buries the
 * equilibrium under the oscillation. At 0.5 the band is 42–57% and the story
 * is readable. The caption states the rate so the lab's numbers, which use
 * 1.0 on full batches, are not expected to match.
 */
const TEXT = "the cat sat on the mat and the dog sat on the log";
const CHARS = [...new Set(TEXT)].sort();
const V = CHARS.length;
const IDX = new Map(CHARS.map((c, i) => [c, i] as const));
const H = IDX.get("h")!;
const SP = IDX.get(" ")!;
const LR = 0.5;

const show = (c: string) => (c === " " ? "␣" : c);

function softmax(z: number[]): number[] {
  const m = Math.max(...z);
  const e = z.map((v) => Math.exp(v - m));
  const total = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / total);
}

export function GradientStep() {
  const [scores, setScores] = useState<number[]>(() => Array(V).fill(0));
  const [presses, setPresses] = useState(0);
  const [lastAnswer, setLastAnswer] = useState<number | null>(null);
  /** −LR × slope per character: what the last press actually did to each score. */
  const [lastNudge, setLastNudge] = useState<number[] | null>(null);
  const [lastLoss, setLastLoss] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const timer = useRef<number | null>(null);

  const shares = softmax(scores);

  function press(answer: number, from?: number[]): number[] {
    const base = from ?? scores;
    const p = softmax(base);
    const slope = p.slice();
    slope[answer] -= 1;
    const next = base.map((s, i) => s - LR * slope[i]);
    setScores(next);
    setLastNudge(slope.map((s) => -LR * s));
    setLastAnswer(answer);
    setLastLoss(-Math.log(p[answer]));
    setPresses((n) => n + 1);
    return next;
  }

  function alternate() {
    // 60 presses, h then space, animated so the squeeze is watchable.
    setRunning(true);
    let i = 0;
    let current = scores;
    timer.current = window.setInterval(() => {
      current = press(i % 2 === 0 ? H : SP, current);
      i += 1;
      if (i >= 60 && timer.current !== null) {
        clearInterval(timer.current);
        setRunning(false);
      }
    }, 45);
  }

  function reset() {
    if (timer.current !== null) clearInterval(timer.current);
    setRunning(false);
    setScores(Array(V).fill(0));
    setPresses(0);
    setLastAnswer(null);
    setLastNudge(null);
    setLastLoss(null);
  }

  useEffect(() => () => {
    if (timer.current !== null) clearInterval(timer.current);
  }, []);

  const btn =
    "border border-plot bg-plot px-4 py-1.5 font-mono text-[0.6875rem] tracking-[0.14em] text-paper uppercase disabled:opacity-40";
  const btnQuiet =
    "border px-4 py-1.5 font-mono text-[0.6875rem] tracking-[0.14em] text-graphite uppercase hairline hover:text-plot disabled:opacity-40";

  return (
    <div className="border bg-paper-raised p-5 hairline">
      <p className="eyebrow">The row for “t”, one fact at a time</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => press(H)} disabled={running} className={btn}>
          show it t → h
        </button>
        <button type="button" onClick={() => press(SP)} disabled={running} className={btn}>
          show it t → ␣
        </button>
        <button type="button" onClick={alternate} disabled={running} className={btnQuiet}>
          alternate ×60
        </button>
        <button type="button" onClick={reset} disabled={running} className={btnQuiet}>
          reset
        </button>
      </div>

      <ul className="mt-5 flex list-none flex-col gap-1 p-0">
        {CHARS.map((c, i) => (
          <li key={c} className="flex items-center gap-2">
            <span className="w-4 shrink-0 text-right font-mono text-[0.6875rem] text-graphite">
              {show(c)}
            </span>
            <span
              className={`h-3 shrink-0 ${i === lastAnswer ? "bg-riso/70" : "bg-plot/70"}`}
              style={{ width: `${shares[i] * 55}%`, transition: "width 120ms" }}
            />
            <span className="w-12 shrink-0 font-mono text-[0.6875rem] text-graphite">
              {(shares[i] * 100).toFixed(1)}%
            </span>
            {lastNudge && Math.abs(lastNudge[i]) >= 0.0005 && (
              <span
                className={`font-mono text-[0.6875rem] ${lastNudge[i] > 0 ? "text-riso" : "text-graphite/70"}`}
              >
                {lastNudge[i] > 0 ? "▲" : "▼"} {Math.abs(lastNudge[i]).toFixed(2)}
              </span>
            )}
          </li>
        ))}
      </ul>

      <dl className="mt-5 flex flex-wrap gap-x-10 gap-y-3 border-t pt-4 hairline">
        <div>
          <dt className="eyebrow">Facts shown</dt>
          <dd className="mt-0.5 font-mono text-sm">{presses}</dd>
        </div>
        <div>
          <dt className="eyebrow">Chance on h</dt>
          <dd className="mt-0.5 font-mono text-sm">{(shares[H] * 100).toFixed(1)}%</dd>
        </div>
        <div>
          <dt className="eyebrow">Chance on ␣</dt>
          <dd className="mt-0.5 font-mono text-sm">{(shares[SP] * 100).toFixed(1)}%</dd>
        </div>
        {lastLoss !== null && (
          <div>
            <dt className="eyebrow">Loss of that showing</dt>
            <dd className="mt-0.5 font-mono text-sm text-riso">{lastLoss.toFixed(3)}</dd>
          </div>
        )}
      </dl>

      <p className="caption mt-4 max-w-[34rem]">
        Two experiments. Press only <em>t → h</em> and the row heads toward
        certainty — it believes the only fact it has been shown. Then reset and
        press <em>alternate</em>: h and ␣ squeeze everything else out and end up
        trading a band around 50% between them, because the pushes only balance
        where the shares match how often each answer occurs. Learning rate 0.5;
        ▲▼ are the nudges to the scores, the bars the shares they produce.
      </p>
    </div>
  );
}
