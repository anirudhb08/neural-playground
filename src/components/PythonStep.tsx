import { useState } from "react";
import { runPython, type RunResult } from "../lib/pyodide";
import { CodeEditor } from "./CodeEditor";

/**
 * Worked out on demand, not at import. The pages are prerendered, so module
 * bodies are evaluated by the build where there is no navigator to ask.
 */
function runHint() {
  if (typeof navigator === "undefined") return "Ctrl + Enter to run";
  return /Mac|iPhone|iPad/.test(navigator.userAgent)
    ? "⌘ + Return to run"
    : "Ctrl + Enter to run";
}

type Props = {
  index: number;
  title: string;
  lead: string;
  initialCode: string;
  /** Puts the learner's drawings into Python before their code runs. */
  prepare: () => Promise<void>;
  /** Hands out the next execution number, notebook style. */
  nextExecution: () => number;
  onFirstRun: () => void;
};

export function PythonStep({
  index,
  title,
  lead,
  initialCode,
  prepare,
  nextExecution,
  onFirstRun,
}: Props) {
  const [code, setCode] = useState(initialCode);
  const [result, setResult] = useState<RunResult | null>(null);
  const [execution, setExecution] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const edited = code !== initialCode;

  async function run() {
    if (busy) return;
    setBusy(true);
    setResult(null);
    setExecution(nextExecution());
    try {
      await prepare();
      const next = await runPython(code, setStatus);
      setResult(next);
      if (!next.error) onFirstRun();
    } catch (error) {
      setResult({
        printed: "",
        value: null,
        error: error instanceof Error ? error.message : "Python could not start",
      });
    } finally {
      setStatus(null);
      setBusy(false);
    }
  }

  const output = result
    ? [result.printed, result.value].filter(Boolean).join("\n")
    : "";

  return (
    <section className="border-t pt-8 hairline">
      <p className="eyebrow">
        Step {index} — {title}
      </p>
      <p className="mt-2 body-text">{lead}</p>

      <div className="mt-5 border hairline">
        <div className="flex items-center justify-between gap-4 border-b bg-paper px-3 py-1.5 hairline">
          <span className="mono-note text-plot">
            In [{busy ? "*" : (execution ?? " ")}]
          </span>
          <span className="mono-note text-graphite">
            {status ?? runHint()}
          </span>
        </div>

        <CodeEditor value={code} onChange={setCode} onRun={run} />

        <div className="flex flex-wrap items-center gap-4 border-t bg-paper px-3 py-2 hairline">
          <button
            type="button"
            onClick={run}
            disabled={busy}
            className="bg-plot px-4 py-1.5 mono-note tracking-[0.14em] text-paper uppercase transition-colors hover:bg-ink disabled:opacity-40"
          >
            {busy ? "Running" : "Run"}
          </button>
          {edited && (
            <button
              type="button"
              onClick={() => setCode(initialCode)}
              className="mono-note text-graphite underline underline-offset-4 hover:text-riso"
            >
              Put it back
            </button>
          )}
        </div>
      </div>

      {result && (
        <div className="mt-3 flex gap-3">
          <span
            className={`shrink-0 pt-3 mono-note ${
              result.error ? "text-riso" : "text-graphite"
            }`}
          >
            Out [{execution}]
          </span>
          <pre
            className={`min-w-0 flex-1 overflow-x-auto border p-3 font-mono text-xs leading-relaxed ${
              result.error
                ? "border-riso bg-riso/8"
                : "bg-paper-raised hairline"
            }`}
          >
            {result.error || output || "(nothing printed)"}
          </pre>
        </div>
      )}
    </section>
  );
}
