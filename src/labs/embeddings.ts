/**
 * The learned lookup table, and what it costs to be wrong, in five cells.
 *
 * The model built here is a bigram again — one character of context, exactly
 * like part 02 — and that is the point. The table has the same shape as the one
 * counted there. Only where its numbers come from has changed.
 *
 * Comments inside `code` gloss what each line does, for the reader. See
 * labs/bigram.ts for why that is the opposite of this repo's usual rule.
 *
 * 05-embeddings.mdx quotes the vocabulary size, both losses from the fourth
 * cell, and the three rows of the fifth. All are pinned by `text` and by the
 * seed. Rerun if either changes.
 */
export const embeddingsLab = () => [
  {
    title: "one row per character, instead of one number",
    lead: "Every character already has an integer, and the integer means nothing. Here each one gets a whole row of numbers instead — as wide as the vocabulary, so a row can hold a score for every character that might come next.",
    code: `import numpy as np
rng = np.random.default_rng(0)

text = "the cat sat on the mat and the dog sat on the log"
chars = sorted(set(text))
stoi = {ch: i for i, ch in enumerate(chars)}
data = np.array([stoi[ch] for ch in text])
V = len(chars)

# V rows, V columns. Row i belongs to character i and holds one score
# for each character that could follow it. Random, because nothing has
# been learned yet. This is the counted bigram table, unlearned.
table = rng.normal(0, 1, (V, V))

print("vocabulary:", V)
print("table shape:", table.shape)
print("the row for 't':", np.round(table[stoi["t"]], 2))`,
  },
  {
    title: "looking up a whole batch at once",
    lead: "The batch is a rectangle of integers. Indexing the table with the whole rectangle replaces every integer with its row, in one expression — no loop, and this is exactly what a library's embedding layer does inside.",
    code: `block_size, batch_size = 8, 4
starts = rng.integers(0, len(data) - block_size, batch_size)
xb = np.stack([data[s : s + block_size] for s in starts])
yb = np.stack([data[s + 1 : s + block_size + 1] for s in starts])

logits = table[xb]   # (4, 8) integers in -> (4, 8, V) scores out

print("xb shape:    ", xb.shape, "  integers")
print("logits shape:", logits.shape, "scores")
print()
print("scores the model gives after the first character of row 0:")
print(np.round(logits[0, 0], 2))

# Any real number, positive or negative, and they do not add up to
# anything in particular. That is deliberate — see the next cell.`,
  },
  {
    title: "scores into probabilities",
    lead: "Softmax, which you met in the other tutorial: make everything positive by exponentiating, then divide by the total. What is new here is the shape — this has to happen along the last axis only, separately for every position in every row.",
    code: `def softmax(z, axis=-1):
    # axis=-1 means "work across the last number in the shape" — the
    # thirteen — leaving the four and the eight alone. Every position
    # gets its own percentages and nothing mixes between positions.
    #
    # Subtracting the largest score first changes no answer and stops
    # exp() overflowing on large numbers. Worth doing always.
    z = z - z.max(axis=axis, keepdims=True)
    e = np.exp(z)
    # keepdims=True is the one with the sharp edge. There are 32 totals,
    # one per position, and they have to stay shaped (4, 8, 1) — one
    # parked behind each position — so NumPy can tell which total belongs
    # to which group. Without it they come back flat as (4, 8), NumPy
    # cannot match them against (4, 8, 13), and the division fails here.
    return e / e.sum(axis=axis, keepdims=True)

probs = softmax(logits)

print("probs shape:", probs.shape)
print("first position, as percentages:", np.round(probs[0, 0] * 100, 1))
print("every position sums to 1:", np.allclose(probs.sum(-1), 1))`,
  },
  {
    title: "how wrong is it?",
    lead: "Cross-entropy looks only at the probability given to the character that actually came next, and ignores the rest of the distribution entirely. A table of zeros gives every character the same chance, which is the score to beat.",
    code: `def loss_of(table):
    probs = softmax(table[xb])
    flat = probs.reshape(-1, V)          # 32 independent predictions
    answers = yb.reshape(-1)             # the 32 right answers
    # Paired indexing: row i, column answers[i] — one number per row.
    right = flat[np.arange(len(answers)), answers]
    return -np.log(right).mean()

print("a table of zeros :", round(float(loss_of(np.zeros((V, V)))), 4))
print("ln(V)            :", round(float(np.log(V)), 4))
print("the random table :", round(float(loss_of(table)), 4))

# Zeros score exactly ln(V) because every character gets 1/V. The random
# table does worse: random confidence is sometimes confidently wrong, and
# the next cell is about how much that costs.`,
  },
  {
    title: "why -log, and not simply 1 - p",
    lead: "Both are zero for a perfect answer, so why the logarithm? Watch what each one does as a wrong answer gets more confident — that difference is the whole reason cross-entropy is the loss everyone uses.",
    code: `for p in (0.9, 0.4, 0.01):
    print(f"p = {p:<5}   1 - p = {1 - p:.2f}      -log p = {-np.log(p):.2f}")

unsure, confident = 0.4, 0.01
print()
print("going from unsure to confidently wrong:")
print(f"  1 - p    grows {(1 - confident) / (1 - unsure):.2f} times")
print(f"  -log p   grows {np.log(confident) / np.log(unsure):.2f} times")

# 1 - p can never exceed 1, so it barely reacts to a disaster. -log has no
# ceiling, so a confident mistake produces a correspondingly large push.`,
  },
];
