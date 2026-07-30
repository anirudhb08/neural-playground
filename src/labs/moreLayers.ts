/** The More layers part's notebook, shared by its prose and its island. */
import { INPUTS } from "../lib/network";

/** Hidden units in the two-layer network — the same 8 the page builds. */
export const UNITS = 8;

export const moreLayersTorch = (classes: number) => `import torch.nn as nn

net = nn.Sequential(
    nn.Linear(${INPUTS}, ${UNITS}),   # the ${UNITS} units, each with its own picture
    nn.ReLU(),           # negatives become zero
    nn.Linear(${UNITS}, ${classes}),     # the vote at the end
)

loss = loss_fn(net(X), y)
loss.backward()          # this one line is the whole of backpropagation`;

export const moreLayersLab = (classes: number) => [
  {
    title: "two sets of numbers instead of one",
    lead: `W1 holds one picture per hidden unit. W2 holds each character's opinion of each unit. The drawing never reaches W2 — only what the units reported.`,
    code: `import numpy as np
rng = np.random.default_rng(11)

W1 = rng.normal(0, np.sqrt(2 / ${INPUTS}), (${INPUTS}, ${UNITS}))
b1 = np.zeros(${UNITS})
W2 = rng.normal(0, np.sqrt(2 / ${UNITS}), (${UNITS}, ${classes}))
b2 = np.zeros(${classes})

print("W1:", W1.shape, " W2:", W2.shape)
print("numbers in total:", W1.size + b1.size + W2.size + b2.size)`,
  },
  {
    title: "forwards, through both",
    lead: "Total up the first layer, set negatives to zero, then total up the second. Two multiply-and-adds with a bend in between.",
    code: `raw = X @ W1 + b1
reported = np.maximum(0, raw)        # this is ReLU, in full
scores = reported @ W2 + b2

print("raw:      ", raw.shape)
print("switched off:", int((raw <= 0).sum()), "of", raw.size, "unit readings")
print("scores:   ", scores.shape)`,
  },
  {
    title: "backwards — the chain rule, without the name",
    lead: "The error lands on the output layer. It is handed back to the units in proportion to how much the output leaned on them, and units that were off are struck out.",
    code: `def shares(s):
    e = np.exp(s - s.max(axis=1, keepdims=True))
    return e / e.sum(axis=1, keepdims=True)

error = shares(scores) - np.eye(len(names))[y]        # blame at the output

blame_at_units = error @ W2.T                # handed backwards
blame_at_units = blame_at_units * (raw > 0)  # off means blameless

print("blame at the output:", error.shape)
print("blame at the units: ", blame_at_units.shape)
print("struck out:", int((blame_at_units == 0).sum()), "of", blame_at_units.size)`,
  },
  {
    title: "both layers, nudged",
    lead: "Each layer now uses the same rule as before — what came in, times how far off it was. The only new idea was working out that second blame.",
    code: `rate = 0.5
n = len(y)

W2 -= rate * (reported.T @ error / n)
b2 -= rate * error.mean(axis=0)
W1 -= rate * (X.T @ blame_at_units / n)
b1 -= rate * blame_at_units.mean(axis=0)

print("both layers moved.")
print("that is backpropagation, in four lines.")`,
  },
];
