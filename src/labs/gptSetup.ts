import gptSource from "./gptModel.py?raw";
import { TRAINING_TEXT } from "./trainingText";
import { CORPUS } from "../lib/corpus";
import weights from "./gptWeights.json";
import { getPyodide } from "../lib/pyodide";

/**
 * Puts the assembled model into Python before every cell of the trained labs.
 *
 * The model's forward and gradients live in gptModel.py — one file, injected
 * verbatim, so the cells can stay about training rather than about seventy
 * lines of bookkeeping. The lab does not ask the reader to trust it: the same
 * file's gradients match torch autograd to 5.6e-17, and the second cell lets
 * the reader check one slope themselves by nudging a weight.
 *
 * Runs before every cell, so everything here must be safe to run twice:
 * function definitions and constant strings only.
 */
export async function prepareGpt(): Promise<void> {
  const py = await getPyodide();
  py.runPython(gptSource);
  py.globals.set("training_text", TRAINING_TEXT);
  py.globals.set("little_text", CORPUS);
  py.runPython("training_text = str(training_text); little_text = str(little_text)");
}

/**
 * The generation lab additionally gets the shipped weights — the parameters
 * the long run kept at its best held-out loss (1.6672, step 11,500). Loaded
 * into `trained`, reshaped by the same dims the model file declares.
 */
export async function prepareGptTrained(): Promise<void> {
  await prepareGpt();
  const py = await getPyodide();
  py.globals.set("weights_json", JSON.stringify(weights));
  py.runPython(`
import json as _json, numpy as _np
_w = _json.loads(str(weights_json))
_meta = _w.pop("_meta")
vocab = _meta["vocab"]
_V = len(vocab)
_shapes = {"tok": (_V, C), "pos": (T, C), "g1": (C,), "b1": (C,),
           "Wq": (HEADS, C, HS), "Wk": (HEADS, C, HS), "Wv": (HEADS, C, HS),
           "g2": (C,), "b2": (C,), "W1": (C, F), "W2": (F, C),
           "gf": (C,), "bf": (C,), "head": (C, _V)}
trained = {k: _np.array(v).reshape(_shapes[k]) for k, v in _w.items()}
trained_meta = _meta
`);
}
