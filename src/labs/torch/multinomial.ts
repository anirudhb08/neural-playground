import type { TorchCell } from "../../components/TorchLab";

/**
 * The claims on /pytorch/multinomial/, as cells the reader can run.
 *
 * Every one of these corresponds to a sentence on that page that was measured
 * once, by me, and then written down — which is the weakest kind of evidence
 * this site publishes. With a runner attached the reader stops taking my word
 * for any of it.
 */
export const multinomialCells: readonly TorchCell[] = [
  {
    title: "It returns positions, not values",
    lead: "The page says the result is an index into your list rather than a probability. Here is the type and the value.",
    code: `import torch

probs = torch.tensor([0.5, 0.2, 0.2, 0.1])
draw = torch.multinomial(probs, 1)

print("value:", draw)
print("dtype:", draw.dtype)     # int64 — a position
print("that option's probability was:", probs[draw].item())`,
  },
  {
    title: "The weights need not sum to 1",
    lead: "The page claims [1.0, 6.0, 3.0] behaves exactly like [0.1, 0.6, 0.3]. Twenty thousand draws from each, side by side.",
    code: `import torch

N = 20000
normalised = torch.tensor([0.1, 0.6, 0.3])
raw        = torch.tensor([1.0, 6.0, 3.0])

for name, weights in (("sums to 1  ", normalised), ("sums to 10 ", raw)):
    draws = torch.multinomial(weights, N, replacement=True)
    shares = [round((draws == i).float().mean().item(), 3) for i in range(3)]
    print(name, shares)`,
  },
  {
    title: "It draws without replacement by default",
    lead: "replacement=False is the default, so asking for more draws than there are options is an error rather than a repeat.",
    code: `import torch

probs = torch.tensor([0.5, 0.2, 0.2, 0.1])

try:
    torch.multinomial(probs, 5)          # 5 draws from 4 options
except RuntimeError as why:
    print("RuntimeError:", why)

print("with replacement:", torch.multinomial(probs, 5, replacement=True))`,
  },
  {
    title: "It refuses input it cannot sample",
    lead: "A negative weight, or a list that sums to zero, raises rather than quietly picking something. This is the error that means a softmax went missing upstream.",
    code: `import torch

for label, bad in (("all zero", [0.0, 0.0, 0.0]), ("a negative", [-1.0, 2.0, 1.0])):
    try:
        torch.multinomial(torch.tensor(bad), 1)
    except RuntimeError as why:
        print(f"{label:>10}: {why}")`,
  },
  {
    title: "The six lines and the library agree",
    lead: "The comparison table on this page, recomputed on your machine. The two columns should track each other to about a thousandth, and neither should hit the stated probabilities exactly.",
    code: `import random, torch

probs = [0.5, 0.2, 0.2, 0.1]
N = 200000

def ruler(probs, r):
    total = 0.0
    for i, p in enumerate(probs):
        total += p
        if r < total:
            return i
    return len(probs) - 1

random.seed(7)
mine = [0] * 4
for _ in range(N):
    mine[ruler(probs, random.random())] += 1

torch.manual_seed(7)
drawn = torch.multinomial(torch.tensor(probs), N, replacement=True)

print(f"{'idx':>3} {'stated':>7} {'six lines':>10} {'torch':>8}")
for i in range(4):
    print(f"{i:>3} {probs[i]:>7} {mine[i]/N:>10.4f} {(drawn == i).float().mean():>8.4f}")`,
  },
];
