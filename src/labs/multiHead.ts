/**
 * Multi-head attention, in six cells.
 *
 * The argument runs: a head's answer is a weighted average, and averaging is
 * irreversible — cell 2 shows two different pasts leaving identical blends.
 * The repair is several complete heads run side by side, glued on the feature
 * axis, and the rest of the cells check the properties the page claims: the
 * patterns differ per head, the glue axis matters, the parameter budget is
 * unchanged, and each head's lane survives the glue untouched.
 *
 * Comments inside `code` gloss what each line does, for the reader. See
 * labs/bigram.ts for why that is the opposite of this repo's usual rule.
 *
 * 08-multi-head.mdx quotes the [1, 1] blends, the 192 = 192 budget, and the
 * (6, 8) versus (24, 2) shapes. All pinned by the seed. Rerun if it changes.
 */
export const multiHeadLab = () => [
  {
    title: "the head from before, packed into a function",
    lead: "Nothing new. The six lines from the last part become a function, plus a maker for fresh W matrices at any width, so several heads can be stamped out.",
    code: `import numpy as np
rng = np.random.default_rng(0)

T, C = 6, 8
x = rng.normal(0, 1, (T, C))

def softmax(z, axis=-1):
    z = z - z.max(axis=axis, keepdims=True)
    e = np.exp(z)
    return e / e.sum(axis=axis, keepdims=True)

def head(x, W_q, W_k, W_v):
    Q, K, V = x @ W_q, x @ W_k, x @ W_v
    scores = Q @ K.T / np.sqrt(W_q.shape[1])
    scores = np.where(np.triu(np.ones_like(scores, dtype=bool), 1), -np.inf, scores)
    return softmax(scores) @ V

def make_head(width):
    s = 1 / np.sqrt(C)
    return tuple(rng.normal(0, s, (C, width)) for _ in range(3))

W = make_head(C)
print("one full-width head:", head(x, *W).shape)`,
  },
  {
    title: "why one head is not enough",
    lead: "A head's answer is a weighted average of value notes, and averaging shreds. Two completely different pairs of notes, same blend — whatever runs afterwards cannot tell the two worlds apart.",
    code: `shares = np.array([0.5, 0.5])     # a head attending equally to two positions

blend = lambda a, b: shares @ np.stack([a, b])

A, B = np.array([2.0, 0.0]), np.array([0.0, 2.0])
C_, D = np.array([1.0, 1.0]), np.array([1.0, 1.0])

print("blend of A and B:", blend(A, B))
print("blend of C and D:", blend(C_, D))

# Identical. Now keep them side by side instead of averaging:
print("A and B, side by side:", np.concatenate([A, B]))
print("C and D, side by side:", np.concatenate([C_, D]))`,
  },
  {
    title: "two heads, two opinions, one input",
    lead: "Each head gets its own three matrices, so each has its own idea of who should listen to whom. Same x into both — nothing trained, so neither pattern means anything, but they differ, and that is the machinery.",
    code: `def head_shares(W_q, W_k):
    scores = (x @ W_q) @ (x @ W_k).T / np.sqrt(W_q.shape[1])
    scores = np.where(np.triu(np.ones_like(scores, dtype=bool), 1), -np.inf, scores)
    return softmax(scores)

h1, h2 = make_head(2), make_head(2)

print("last position's shares, head one:", np.round(head_shares(h1[0], h1[1])[-1], 2))
print("last position's shares, head two:", np.round(head_shares(h2[0], h2[1])[-1], 2))`,
  },
  {
    title: "gluing the answers, and the axis that matters",
    lead: "Four heads of width two, glued side by side along the feature axis, rebuild the original width of eight. Glue on the wrong axis and nothing crashes — you get four head-answers stacked as if they were twenty-four positions, and the crash happens later, somewhere else.",
    code: `heads = [make_head(2) for _ in range(4)]
answers = [head(x, *w) for w in heads]

print("one head's answer   :", answers[0].shape)
print("glued on axis -1    :", np.concatenate(answers, axis=-1).shape)
print("glued on the default:", np.concatenate(answers).shape)   # axis 0`,
  },
  {
    title: "the price of specialists",
    lead: "Four heads sounds like four times the model. Count the numbers.",
    code: `one_wide    = 3 * C * C        # W_q, W_k, W_v at full width
four_narrow = 4 * 3 * C * 2    # four heads, each a quarter as wide

print("one full-width head:", one_wide, "numbers")
print("four quarter heads :", four_narrow, "numbers")
print("same budget:", one_wide == four_narrow)`,
  },
  {
    title: "multi-head attention, complete",
    lead: "Every head runs the unchanged code from before; the only new line is the glue. And the lanes survive it — the first columns of the output are head one's answer, untouched by the other three.",
    code: `def multi_head(x, heads):
    return np.concatenate([head(x, *w) for w in heads], axis=-1)

out = multi_head(x, heads)
print("in :", x.shape, "  out:", out.shape)

print("first two columns are head one, untouched:",
      np.allclose(out[:, :2], head(x, *heads[0])))`,
  },
];
