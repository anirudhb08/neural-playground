/**
 * Real CPython + NumPy, compiled to WebAssembly, running in the browser.
 *
 * The learner can edit and run this code, so the bridge from Python back into
 * the browser is switched off at startup. That stops a snippet someone pasted
 * in from reading their saved drawings or calling out to the network. It is a
 * speed bump rather than a sandbox — deliberately so, since everything here is
 * client-side and there is nothing of anyone else's to reach.
 */

declare global {
  interface Window {
    loadPyodide?: (options: { indexURL: string }) => Promise<PyodideRuntime>;
  }
}

export type PyodideRuntime = {
  runPython: (code: string) => unknown;
  loadPackage: (names: string | string[]) => Promise<void>;
  globals: { set: (name: string, value: unknown) => void };
  setStdout?: (options: { batched: (text: string) => void }) => void;
  setStderr?: (options: { batched: (text: string) => void }) => void;
};

const VERSION = "0.27.7";
const CDN = `https://cdn.jsdelivr.net/pyodide/v${VERSION}/full/`;

/** Cut Python's route back into the page before any user code can run. */
const HARDEN = `
import sys
for _module in ("js", "pyodide_js"):
    sys.modules[_module] = None
`;

let runtime: Promise<PyodideRuntime> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Could not fetch ${src}`));
    document.head.appendChild(script);
  });
}

export function getPyodide(
  onStatus?: (status: string) => void,
): Promise<PyodideRuntime> {
  if (!runtime) {
    runtime = (async () => {
      onStatus?.("Fetching Python…");
      await loadScript(`${CDN}pyodide.js`);
      if (!window.loadPyodide) {
        throw new Error("Pyodide loaded but did not register itself");
      }
      onStatus?.("Starting Python…");
      const py = await window.loadPyodide({ indexURL: CDN });
      onStatus?.("Loading NumPy…");
      await py.loadPackage("numpy");
      py.runPython(HARDEN);
      onStatus?.("Ready");
      return py;
    })().catch((error) => {
      // Let the next attempt start over rather than caching a failure.
      runtime = null;
      throw error;
    });
  }
  return runtime;
}

export type RunResult = {
  printed: string;
  /** Value of the final expression, when there is one. */
  value: string | null;
  error: string | null;
};

/** Trim Python's traceback down to the part that names the problem. */
function readableError(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  const lines = text.trimEnd().split("\n");
  const culprit = lines.findIndex((line) => /^\w*(Error|Exception)/.test(line));
  return culprit === -1 ? lines.slice(-3).join("\n") : lines.slice(culprit).join("\n");
}

export async function runPython(
  code: string,
  onStatus?: (status: string) => void,
): Promise<RunResult> {
  const py = await getPyodide(onStatus);
  const printed: string[] = [];
  py.setStdout?.({ batched: (text) => printed.push(text) });
  py.setStderr?.({ batched: (text) => printed.push(text) });

  try {
    const value = py.runPython(code);
    return {
      printed: printed.join("\n"),
      value: value === undefined || value === null ? null : String(value),
      error: null,
    };
  } catch (error) {
    return { printed: printed.join("\n"), value: null, error: readableError(error) };
  }
}

/** Rebuilds X and y, for pages that need them without teaching them again. */
export async function seedMatrices(inputs: number): Promise<void> {
  const py = await getPyodide();
  // float64 throughout, so a cell's arithmetic matches the page's to the digit.
  py.runPython(`
import numpy as np
X = np.array(drawings, dtype=np.float64).reshape(len(labels), ${inputs}) / 255.0
y = np.array(labels, dtype=np.int32)
`);
}

/** Gives Python the very same weights the page has drawn on screen. */
export async function seedNetwork(
  weights: number[][],
  biases: number[],
): Promise<void> {
  const py = await getPyodide();
  py.globals.set("network_json", JSON.stringify({ weights, biases }));
  py.runPython(`
import json as _json, numpy as np
_net = _json.loads(network_json)
# held here as one row per character; the arithmetic wants one column per character
W = np.array(_net["weights"], dtype=np.float64).T
b = np.array(_net["biases"], dtype=np.float64)
`);
}

/** Hands the learner's drawings to Python as plain lists. */
export async function seedDrawings(payload: {
  drawings: number[];
  labels: number[];
  names: string[];
}): Promise<void> {
  const py = await getPyodide();
  py.globals.set("payload_json", JSON.stringify(payload));
  py.runPython(`
import json as _json
_payload = _json.loads(payload_json)
drawings = _payload["drawings"]
labels = _payload["labels"]
names = _payload["names"]
`);
}
