import { useEffect, useRef, useState } from "react";
import { nextProbs, C, T, HEADS, HS, F, type Params } from "../lib/tinygpt";
import weightsJson from "../labs/gptWeights.json";

/**
 * The trained model, speaking on demand.
 *
 * Forward passes only — the weights are the long run's best (held-out 1.6672
 * at step 11,500), shipped as JSON and loaded here. The widget exists to make
 * two things feel true at once: the model writes character by character with
 * sixteen characters of sight, and every draw comes from a distribution you
 * can watch — the bars under the text are the five characters it weighed most
 * for the pick it just made.
 *
 * The prompt is checked against the vocabulary before anything runs, because
 * the tokenizer part's rule never went away: a character the model was not
 * trained on has no number, and the honest response is to say so, not to
 * substitute.
 */
const META = (weightsJson as Record<string, unknown>)._meta as { vocab: string; val: number; step: number };
const VOCAB = META.vocab;
const V = VOCAB.length;

const PARAMS: Params = (() => {
  const w = weightsJson as unknown as Record<string, number[]>;
  const p: Params = {};
  for (const k of ["tok", "pos", "g1", "b1", "g2", "b2", "gf", "bf", "W1", "W2", "head"])
    p[k] = Float64Array.from(w[k]);
  for (const name of ["Wq", "Wk", "Wv"]) {
    const flat = w[name];
    for (let h = 0; h < HEADS; h++)
      p[name + h] = Float64Array.from(flat.slice(h * C * HS, (h + 1) * C * HS));
  }
  return p;
})();

export function GenerateGPT() {
  const [prompt, setPrompt] = useState("the model ");
  const [temp, setTemp] = useState(0.9);
  const [text, setText] = useState("");
  const [top, setTop] = useState<[string, number][]>([]);
  const [running, setRunning] = useState(false);
  const ids = useRef<number[]>([]);
  const rand = useRef(() => Math.random());
  const timer = useRef<number | null>(null);

  const bad = [...new Set([...prompt])].filter((c) => !VOCAB.includes(c));

  function start() {
    if (bad.length > 0 || prompt.length === 0) return;
    stop();
    ids.current = [...prompt].map((c) => VOCAB.indexOf(c));
    setText(prompt);
    setRunning(true);
    let n = 0;
    // mulberry32, seeded per press so runs differ but characters stream deterministically within one
    let a = (Date.now() % 100000) >>> 0;
    rand.current = () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    timer.current = window.setInterval(() => {
      const probs = nextProbs(PARAMS, ids.current, V, temp);
      const order = [...probs.keys()].sort((x, y) => probs[y] - probs[x]).slice(0, 5);
      setTop(order.map((j) => [VOCAB[j] === " " ? "␣" : VOCAB[j], probs[j]]));
      let r = rand.current(), pick = V - 1;
      for (let j = 0; j < V; j++) { r -= probs[j]; if (r < 0) { pick = j; break; } }
      ids.current.push(pick);
      setText((t) => t + VOCAB[pick]);
      n += 1;
      if (n >= 160) stop();
    }, 24);
  }
  function stop() {
    if (timer.current !== null) clearInterval(timer.current);
    timer.current = null;
    setRunning(false);
  }
  useEffect(() => () => { if (timer.current !== null) clearInterval(timer.current); }, []);

  return (
    <div className="border bg-paper-raised p-5 hairline">
      <p className="eyebrow">
        The trained model — held-out loss {META.val}, kept at step {META.step.toLocaleString()}
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-3">
        <label className="min-w-[14rem] flex-1">
          <span className="mono-note text-graphite">prompt — vocabulary characters only</span>
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value.toLowerCase())}
            spellCheck={false}
            className="mt-1 w-full border bg-paper px-3 py-2 font-mono text-sm hairline focus:outline-none"
            aria-label="Prompt"
          />
        </label>
        <label className="w-44">
          <span className="mono-note text-graphite">temperature: {temp.toFixed(1)}</span>
          <input type="range" min={0.2} max={1.6} step={0.1} value={temp}
            onChange={(e) => setTemp(Number(e.target.value))}
            className="mt-2 w-full accent-riso" aria-label="Temperature" />
        </label>
        <button type="button" onClick={running ? stop : start} disabled={bad.length > 0}
          className="border border-plot bg-plot px-4 py-2 font-mono text-[0.6875rem] tracking-[0.14em] text-paper uppercase disabled:opacity-40">
          {running ? "Stop" : "Generate"}
        </button>
      </div>

      {bad.length > 0 && (
        <p className="caption mt-2 text-riso">
          No number for {bad.map((c) => `'${c}'`).join(", ")} — the model was never
          trained on {bad.length === 1 ? "it" : "them"}. The vocabulary is:{" "}
          <span className="font-mono">{VOCAB.replace(" ", "␣")}</span>
        </p>
      )}

      {text && (
        <p className="mt-5 border-l-2 pl-4 font-mono text-sm leading-relaxed break-words hairline">
          {text}
          {running && <span className="text-riso">▌</span>}
        </p>
      )}

      {top.length > 0 && (
        <div className="mt-4 border-t pt-3 hairline">
          <p className="eyebrow">What it weighed for that last character</p>
          <ul className="mt-2 flex list-none flex-col gap-1 p-0">
            {top.map(([c, p_]) => (
              <li key={c} className="flex items-center gap-2">
                <span className="w-4 shrink-0 text-right font-mono text-[0.6875rem] text-graphite">{c}</span>
                <span className="h-3 shrink-0 bg-plot/70" style={{ width: `${p_ * 55}%`, transition: "width 60ms" }} />
                <span className="font-mono text-[0.6875rem] text-graphite">{(p_ * 100).toFixed(0)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="caption mt-4 max-w-[34rem]">
        Sixteen characters of sight, one character out at a time, a fresh draw
        per press. Turn the temperature down toward 0.2 and it plays only its
        favourites — turn it past 1.2 and the bars flatten until almost
        anything can come out.
      </p>
    </div>
  );
}
