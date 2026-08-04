import { useState } from "react";
import { RunnerConnect } from "./RunnerConnect";
import {
  runOnRunner,
  type RunnerConnection,
  type RunnerEnvironment,
} from "../lib/runner";

/**
 * Cells that run on the reader's own PyTorch instead of in the page.
 *
 * Deliberately not a variant of PythonLab. That component reveals one cell at
 * a time because its cells are a lesson with an order; these are the library
 * equivalent of something the reader has already understood, so all of them
 * are visible from the start and any one can be run on its own.
 *
 * The code is readable and copyable whether or not anything is connected. A
 * reader with no runner should still be able to take the snippet to their own
 * editor, so a disconnected panel shows everything except the ability to press
 * Run.
 */
export type TorchCell = {
  title: string;
  lead: string;
  code: string;
};

type Props = {
  cells: readonly TorchCell[];
};

export function TorchLab({ cells }: Props) {
  const [connection, setConnection] = useState<RunnerConnection | null>(null);
  const [env, setEnv] = useState<RunnerEnvironment | null>(null);
  const [results, setResults] = useState<Record<number, { out: string; error: string | null }>>({});
  const [running, setRunning] = useState<number | null>(null);

  function onChange(next: RunnerConnection | null, info: RunnerEnvironment | null) {
    setConnection(next);
    setEnv(info);
  }

  async function run(index: number) {
    if (!connection) return;
    setRunning(index);
    try {
      const result = await runOnRunner(connection, cells[index].code);
      setResults((r) => ({ ...r, [index]: { out: result.stdout, error: result.error } }));
    } catch (error) {
      setResults((r) => ({
        ...r,
        [index]: { out: "", error: error instanceof Error ? error.message : String(error) },
      }));
    } finally {
      setRunning(null);
    }
  }

  // Connected to a runner that has no torch: the cells will all fail on their
  // import, so say it once here rather than five times in five tracebacks.
  const missingTorch = Boolean(connection && env && !env.torch);

  return (
    <div className="flex flex-col gap-6">
      <RunnerConnect connection={connection} onChange={onChange} />

      {missingTorch && (
        <p className="caption max-w-[34rem] text-riso">
          That runner is working but has no PyTorch. Install it there with{" "}
          <code>pip install torch</code> and restart the runner.
        </p>
      )}

      {cells.map((cell, i) => {
        const result = results[i];
        return (
          <div key={cell.title}>
            <p className="eyebrow">{cell.title}</p>
            <p className="caption measure mt-2">{cell.lead}</p>

            <pre className="mt-3 overflow-x-auto rounded-[2px] bg-ink/90 p-4 font-mono text-[0.8125rem] leading-[1.7] text-paper">
              <code>{cell.code}</code>
            </pre>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => run(i)}
                disabled={!connection || running !== null}
                className="border border-plot bg-plot px-4 py-1.5 font-mono text-[0.6875rem] tracking-[0.14em] text-paper uppercase disabled:cursor-not-allowed disabled:opacity-40"
                title={connection ? undefined : "Connect a runner to run this here"}
              >
                {running === i ? "Running…" : "Run"}
              </button>
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(cell.code)}
                className="mono-note text-graphite underline underline-offset-4 hover:text-plot"
              >
                copy
              </button>
              {!connection && (
                <span className="mono-note text-graphite/70">
                  no runner connected — copy it instead
                </span>
              )}
            </div>

            {result && (
              <div className="mt-3">
                <p className="eyebrow">{result.error ? "Error" : "Output"}</p>
                <pre
                  className={`mt-1 overflow-x-auto border p-3 font-mono text-[0.8125rem] leading-[1.7] hairline ${
                    result.error ? "text-riso" : ""
                  }`}
                >
                  <code>{result.error ?? result.out.trimEnd() ?? ""}</code>
                </pre>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
