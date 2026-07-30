/** The Learning part's notebook, lifted out of the page so MDX prose and the
  * island can share one copy of the cells. */
import { INPUTS } from "../lib/network";

export const learningTorch = (classes: number) => `import torch.nn as nn, torch.optim as optim

layer = nn.Linear(${INPUTS}, ${classes})
loss_fn = nn.CrossEntropyLoss()                 # the surprise, from part 05
optimiser = optim.SGD(layer.parameters(), lr=0.5)

for step in range(400):
    loss = loss_fn(layer(X), y)   # how wrong are we?
    loss.backward()               # work out every nudge
    optimiser.step()              # move every number
    optimiser.zero_grad()         # forget the nudges, ready for next time`;

export const learningLab = (classes: number) => [
  {
    title: "how far off is every guess?",
    lead: "Subtract what it should have said from what it did say. Positive means too keen on that character, negative means not keen enough. This single table drives everything else.",
    code: `import numpy as np

def shares(s):
    lifted = np.exp(s - s.max(axis=1, keepdims=True))
    return lifted / lifted.sum(axis=1, keepdims=True)

P = shares(X @ W + b)
should_be = np.eye(len(names))[y]   # 1 for the right character, 0 for the rest
error = P - should_be

print("said:      ", np.round(P[0], 3))
print("should say:", should_be[0])
print("off by:    ", np.round(error[0], 3))`,
  },
  {
    title: `turn that into a nudge for all ${INPUTS * classes + classes} numbers`,
    lead: "X.T @ error is the whole update rule: for every square and every character, how much ink was there multiplied by how far off that character was — added up over every drawing. The head start belongs to no square, so there is nothing to multiply it by: its nudge is the error on its own.",
    code: `nudge_W = X.T @ error / len(y)
nudge_b = error.mean(axis=0)

print("nudge_W:", nudge_W.shape, "— one number per square, per character")
print("biggest single nudge:", round(float(np.abs(nudge_W).max()), 5))

# belief has to total 100%, so what one character gains the others lose
print("do the nudges cancel out across characters?",
      np.allclose(nudge_W.sum(axis=1), 0))`,
  },
  {
    title: "take one step",
    lead: "Move every number a fraction of the way along its nudge, then measure again. One step, and the loss has already come down.",
    code: `def loss_now(W, b):
    P = shares(X @ W + b)
    return -np.log(P[np.arange(len(y)), y]).mean()

print("before:", round(float(loss_now(W, b)), 4))

rate = 0.5
W = W - rate * nudge_W
b = b - rate * nudge_b

print("after: ", round(float(loss_now(W, b)), 4))`,
  },
  {
    title: "now do it four hundred times",
    lead: "That is the entire training loop. Everything else in machine learning is a variation on these five lines.",
    code: `for step in range(400):
    P = shares(X @ W + b)
    error = P - np.eye(len(names))[y]
    W = W - 0.5 * (X.T @ error / len(y))
    b = b - 0.5 * error.mean(axis=0)

    if step % 100 == 0 or step == 399:
        P = shares(X @ W + b)
        truth = P[np.arange(len(y)), y]
        print(f"step {step:3d}   loss {-np.log(truth).mean():.4f}"
              f"   right {(P.argmax(1) == y).mean():.0%}"
              f"   sure {truth.mean():.0%}")`,
  },
];
