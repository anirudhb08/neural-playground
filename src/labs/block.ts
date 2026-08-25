/**
 * The transformer block, in six cells.
 *
 * The order is the argument: gathering exists (packed from the two attention
 * parts), thinking does not — so build the feed-forward, show why its bend is
 * compulsory, then make stacking survivable (replace dies, add drifts, tidy
 * holds) and close the four-line block that stacks.
 *
 * Comments inside `code` gloss what each line does, for the reader. See
 * labs/bigram.ts for why that is the opposite of this repo's usual rule.
 *
 * 09-block.mdx quotes cell 4's decay (0.7083 → 0.0004), cell 5's drift and
 * the tidy holding 1.00, and the True/False pair from cell 3. All pinned by
 * the seed. Rerun if it changes.
 */
export const blockLab = () => [
  {
    title: "the gathering, packed",
    lead: "Attention from the last two parts, condensed into functions. Nothing new here — this part is about what happens after the gathering.",
    code: `import numpy as np
rng = np.random.default_rng(0)

T, C, HEADS = 6, 32, 4
x = rng.normal(0, 1, (T, C))

def softmax(z, axis=-1):
    z = z - z.max(axis=axis, keepdims=True)
    e = np.exp(z)
    return e / e.sum(axis=axis, keepdims=True)

def make_head(width):
    s = 1 / np.sqrt(C)
    return tuple(rng.normal(0, s, (C, width)) for _ in range(3))

def head(x, W_q, W_k, W_v):
    Q, K, V = x @ W_q, x @ W_k, x @ W_v
    scores = Q @ K.T / np.sqrt(W_q.shape[1])
    scores = np.where(np.triu(np.ones_like(scores, dtype=bool), 1), -np.inf, scores)
    return softmax(scores) @ V

def multi_head(x, heads):
    return np.concatenate([head(x, *w) for w in heads], axis=-1)

heads = [make_head(C // HEADS) for _ in range(HEADS)]
print("gathered:", multi_head(x, heads).shape)`,
  },
  {
    title: "one if, then a bank of them",
    lead: "A single middle unit is an if: it fires in proportion to how well the gathered vector matches its pattern, and stays silent otherwise. The feed-forward is 128 of these asking at once, each adding its contribution if it fired. No position sees another here — that is attention's job, exclusively.",
    code: `w = np.array([1.0, -1.0])                  # one learned pattern
for probe in ([0.8, -0.6], [-0.8, 0.6], [0.5, 0.5]):
    z = float(np.dot(probe, w))
    print(f"{str(probe):>13}  raw {z:+.1f}   after the bend {max(z, 0.0):.1f}")

H = 4 * C     # the bank: conventionally four times the model width

W1 = rng.normal(0, 1/np.sqrt(C), (C, H))   # 128 patterns, one per column
W2 = rng.normal(0, 1/np.sqrt(H), (H, C))   # each unit's contribution if it fires

def feed_forward(z):
    return np.maximum(z @ W1, 0) @ W2

print("in :", x.shape, " out:", feed_forward(x).shape)

# Per position by construction — row 2 alone gives the same answer.
print("row 2 alone matches:", np.allclose(feed_forward(x)[2], feed_forward(x[2:3])[0]))`,
  },
  {
    title: "why the bend is compulsory",
    lead: "Two linear layers collapse into one matrix, so without the bend, depth buys nothing at all. maximum(…, 0) clips negatives to zero — one kink, and the collapse is gone.",
    code: `two_layers = (x @ W1) @ W2
one_matrix = x @ (W1 @ W2)
print("two linear layers == one matrix:", np.allclose(two_layers, one_matrix))

with_bend = np.maximum(x @ W1, 0) @ W2
print("with the bend, still equal    :", np.allclose(with_bend, one_matrix))`,
  },
  {
    title: "replace, and the stack dies",
    lead: "Blocks are going to be stacked. Make each of 24 layers just slightly timid — multiply by about 0.7 — and let each one replace what it was given. Timidity compounds.",
    code: `gain = 0.7
Ws = [rng.normal(0, gain/np.sqrt(C), (C, C)) for _ in range(24)]

signal = rng.normal(0, 1, C)
for k, W in enumerate(Ws, 1):
    signal = signal @ W               # each layer REPLACES the signal
    if k in (1, 6, 12, 24):
        print(f"after layer {k:>2}: size {signal.std():.4f}")

print("0.7 ** 24 =", round(0.7 ** 24, 6))`,
  },
  {
    title: "add, then tidy",
    lead: "Adding instead of replacing keeps every earlier note — nothing can be erased. But because every layer adds, the size drifts without limit, so each position is rewritten to a standard size after: mean 0, spread 1, information kept.",
    code: `def layer_norm(z):
    m = z.mean(-1, keepdims=True)
    v = ((z - m) ** 2).mean(-1, keepdims=True)
    return (z - m) / np.sqrt(v + 1e-5)    # 1e-5 so a flat row cannot divide by 0

adding = rng.normal(0, 1, C)
tidied = adding.copy()
for k, W in enumerate(Ws, 1):
    adding = adding + adding @ W          # add only
    tidied = layer_norm(tidied + tidied @ W)   # add, then tidy
    if k in (6, 24):
        print(f"layer {k:>2}:  add only {adding.std():>6.2f}    add then tidy {tidied.std():.2f}")

print("tidied: mean", round(float(tidied.mean()), 6), "  spread", round(float(tidied.std()), 2))`,
  },
  {
    title: "the block",
    lead: "Four lines: tidy, gather, add; tidy, think, add. Shape in equals shape out, and that property is the whole trick — a unit that keeps its shape stacks as deep as you can afford.",
    code: `def block(z, heads, W1, W2):
    z = z + multi_head(layer_norm(z), heads)           # tidy, gather, add
    z = z + np.maximum(layer_norm(z) @ W1, 0) @ W2     # tidy, think, add
    return z

out = block(x, heads, W1, W2)
print("in :", x.shape, " out:", out.shape)

deep = x
for _ in range(3):     # same weights reused — only the shape matters here
    deep = block(deep, heads, W1, W2)
print("three blocks deep:", deep.shape, "— still the same shape, so it stacks")`,
  },
];
