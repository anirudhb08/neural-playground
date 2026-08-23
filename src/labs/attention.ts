/**
 * One head of self-attention, in six cells.
 *
 * Six rather than the usual five because this is the biggest idea in the
 * architecture and every step of it is a place people lose the thread: the
 * averaging that nearly works, the three matrices, the grid of scores, the
 * mask, the divisor, and the blend that comes out.
 *
 * Nothing here is trained. That is deliberate and the prose says so — with
 * random weights the *pattern* of attention is arbitrary, and what the cells
 * demonstrate is the machinery: that the grid is lower triangular, that every
 * row sums to one, that position zero's output is exactly its own value, and
 * that the divisor does what it claims.
 *
 * Comments inside `code` gloss what each line does, for the reader. See
 * labs/bigram.ts for why that is the opposite of this repo's usual rule.
 *
 * 07-attention.mdx quotes the scaling table from the last cell and the
 * position-zero check from the fourth. Both are pinned by the seed.
 */
export const attentionLab = () => [
  {
    title: "averaging everything, which nearly works",
    lead: "The model sees one character. The obvious repair is to let it see the whole window by averaging what is there — strictly more information than before. Watch what that average actually says.",
    code: `import numpy as np
rng = np.random.default_rng(0)

T, C = 6, 8          # six positions, eight numbers describing each
x = rng.normal(0, 1, (T, C))    # what the embedding table handed over

# Position i averages itself and everything before it.
avg = np.stack([x[: i + 1].mean(axis=0) for i in range(T)])

print("position 3 averaged over", 4, "positions")
print(np.round(avg[3], 3))

# Every earlier position contributed exactly the same amount: 1/4 each.
# That is the problem. Predicting after "the cat sat on the m", the m
# matters enormously and "the" from twenty characters back does not,
# and a plain average cannot tell them apart.`,
  },
  {
    title: "the failure, then the three matrices that fix it",
    lead: "Weights have to come from the content, and the obvious comparison is each row dotted with the others. Run it: matching yourself scores high, matching anyone else scores nothing, because x·x is your own length squared. The fix is to compare through two different learned matrices — and to hand over a third thing entirely.",
    code: `# The obvious comparison: every row dotted with every row.
self_scores = x @ x.T / np.sqrt(C)
print("score for matching yourself:", round(float(np.diag(self_scores).mean()), 2))
print("score for anyone else      :", round(float(self_scores[~np.eye(T, dtype=bool)].mean()), 2))
# Positive and about the square root of the width for yourself, zero for
# strangers — so untrained attention would mostly listen to itself.

head = C   # how wide the three vectors are

W_q = rng.normal(0, 1, (C, head))   # what am I looking for?
W_k = rng.normal(0, 1, (C, head))   # what do I contain?
W_v = rng.normal(0, 1, (C, head))   # what do I pass on if chosen?

Q = x @ W_q
K = x @ W_k
V = x @ W_v

print("Q, K, V shapes:", Q.shape, K.shape, V.shape)
print()
print("position 0's three vectors, from one identical input:")
print("  query:", np.round(Q[0][:4], 2), "...")
print("  key  :", np.round(K[0][:4], 2), "...")
print("  value:", np.round(V[0][:4], 2), "...")

# Same input, three different rulebooks, three genuinely different vectors.`,
  },
  {
    title: "every query against every key",
    lead: "How much should position i take from position j? Compare i's query with j's key. A dot product is the whole comparison — large when the two point the same way, negative when they oppose.",
    code: `scores = Q @ K.T          # (T, T): row i, column j = how much i wants j

print("the grid, rounded:")
print(np.round(scores, 1))
print()
print("shape:", scores.shape, "— one number for every pair of positions")

# Row 3 says how interested position 3 is in each position, itself
# included. Nothing yet stops it being interested in position 5, which
# has not happened yet. That is the next cell.`,
  },
  {
    title: "no reading ahead",
    lead: "Position i is being asked to predict what comes after it. If it can see position i+1, it can simply read the answer — and it will, because copying is easier than predicting. So everything above the diagonal is forbidden.",
    code: `future = np.triu(np.ones((T, T), dtype=bool), 1)   # strictly above the diagonal
masked = np.where(future, -np.inf, scores)

def softmax(z, axis=-1):
    z = z - z.max(axis=axis, keepdims=True)
    e = np.exp(z)
    return e / e.sum(axis=axis, keepdims=True)

weights = softmax(masked)

print("attention weights:")
print(np.round(weights, 3))
print()
# -inf becomes exp(-inf) = 0 exactly, so forbidden positions get no
# weight at all, and the allowed ones keep their relative sizes.
print("nothing leaks from the future:", (weights[future] == 0).all())
print("every row sums to 1:", np.allclose(weights.sum(-1), 1))

out = weights @ V
print("position 0 sees only itself, so its output is exactly V[0]:",
      np.allclose(out[0], V[0]))

# Look at those rows before moving on. Almost every one is a single 1.0
# with zeros beside it — each position picked exactly one other and
# ignored the rest. That is not attention working, it is attention
# collapsed, and the next cell is about why.`,
  },
  {
    title: "why divide by the square root",
    lead: "Those one-hot rows are the symptom. A dot product adds up head-many products, so the wider the vectors the larger the scores get — for no reason connected to the language — and softmax turns large scores into a spike. Here is that growth, measured.",
    code: `print(f"{'head width':>11} {'spread of scores':>18} {'after dividing':>16}")
for d in (2, 8, 32, 128):
    a = rng.normal(0, 1, (20000, d))
    b = rng.normal(0, 1, (20000, d))
    dots = (a * b).sum(1)
    print(f"{d:>11} {dots.std():>18.2f} {(dots / np.sqrt(d)).std():>16.2f}")

# The spread grows like sqrt(head width), so dividing by exactly that
# cancels it. Skip it and a wide head produces huge scores, softmax turns
# them into a one-hot spike, and almost every gradient becomes zero.`,
  },
  {
    title: "the whole head, together",
    lead: "Six lines, and every one of them has now been seen on its own. What comes out is one vector per position — no longer that character alone, but that character having read everything before it.",
    code: `def head_forward(x, W_q, W_k, W_v):
    Q, K, V = x @ W_q, x @ W_k, x @ W_v
    scores = Q @ K.T / np.sqrt(W_q.shape[1])          # compare, then scale
    scores = np.where(np.triu(np.ones_like(scores, dtype=bool), 1), -np.inf, scores)
    weights = softmax(scores)                         # shares that sum to 1
    return weights @ V                                # the weighted blend

result = head_forward(x, W_q, W_k, W_v)

print("in :", x.shape, " out:", result.shape, "— same shape, different content")
print()
print("position 0 in :", np.round(x[0][:4], 2), "...")
print("position 0 out:", np.round(result[0][:4], 2), "...")
print()
print("position 0's output still equals its own value vector:",
      np.allclose(result[0], V[0]))
print()

# And the rows are shares again rather than spikes, because of the divisor.
scaled = softmax(np.where(np.triu(np.ones((T, T), dtype=bool), 1),
                          -np.inf, Q @ K.T / np.sqrt(head)))
print("row 5, unscaled:", np.round(weights[5], 3))
print("row 5, scaled  :", np.round(scaled[5], 3))`,
  },
];
