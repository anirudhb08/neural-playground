/**
 * The training loop, in five cells.
 *
 * No autograd anywhere, and not as a stunt. For this model the derivative of
 * the loss with respect to a score is (probability − 1 if it was the answer),
 * which is one line — so the gradient can be shown honestly rather than
 * summoned by a library call the reader has to take on faith. The library
 * version is named at the end, once there is nothing left to hide.
 *
 * Comments inside `code` gloss what each line does, for the reader. See
 * labs/bigram.ts for why that is the opposite of this repo's usual rule.
 *
 * 06-training.mdx quotes the baseline, the floor, the printed losses and the
 * final comparison. All are pinned by `text`, the seed, and the learning rate.
 * Rerun if any of them changes.
 */
export const trainingLab = () => [
  {
    title: "everything needed, in one place",
    lead: "The vocabulary, the batching function and the loss, all from earlier, gathered so the loop below has something to run against. Nothing new here.",
    code: `import numpy as np
rng = np.random.default_rng(0)

text = "the cat sat on the mat and the dog sat on the log"
chars = sorted(set(text)); V = len(chars)
stoi = {c: i for i, c in enumerate(chars)}
data = np.array([stoi[c] for c in text])

def softmax(z, axis=-1):
    z = z - z.max(axis=axis, keepdims=True)
    e = np.exp(z)
    return e / e.sum(axis=axis, keepdims=True)

def get_batch(batch_size=4, block_size=8):
    s = rng.integers(0, len(data) - block_size, batch_size)
    x = np.stack([data[i : i + block_size] for i in s])
    y = np.stack([data[i + 1 : i + block_size + 1] for i in s])
    return x, y

table = np.zeros((V, V))     # knows nothing, and knows it evenly
print("vocabulary:", V, "| table:", table.shape)`,
  },
  {
    title: "which way is downhill?",
    lead: "The gradient is the answer to one question, asked of every number in the table: if I nudge you up a little, does the loss go up or down, and how sharply? For this model it comes out in a single line, with no library required.",
    code: `def gradient(table, xb, yb):
    probs = softmax(table[xb])
    flat = probs.reshape(-1, V)
    answers = yb.reshape(-1)
    N = len(answers)

    # The rule from the page: every wrong character is pushed down by
    # the share it holds, and the right answer is pulled up by the share
    # it lacks. d holds the slopes; subtracting them does the pushing.
    d = flat.copy()
    d[np.arange(N), answers] -= 1
    d /= N

    # Carry each prediction's slopes back to the row they were read from.
    # A row used twice in one batch collects both, which is what add.at is for.
    grad = np.zeros_like(table)
    np.add.at(grad, xb.reshape(-1), d)
    return grad

xb, yb = get_batch()
g = gradient(table, xb, yb)
print("gradient shape:", g.shape, "— one number per number in the table")
print("largest single nudge:", round(float(np.abs(g).max()), 4))`,
  },
  {
    title: "the loop itself",
    lead: "Take a batch, work out which way is downhill, take a small step that way, repeat. That is the whole of training — every model in this tutorial, and every model anywhere, is this loop with something more elaborate in the middle.",
    code: `def loss_over_text(table):
    # The honest measure: every position in the text, not one lucky batch.
    p = softmax(table[data[:-1]])
    return -np.log(p[np.arange(len(data) - 1), data[1:]]).mean()

learning_rate = 1.0
print("step     loss")
print(f"{0:>4}   {loss_over_text(table):.4f}")

for step in range(1, 601):
    xb, yb = get_batch()
    table -= learning_rate * gradient(table, xb, yb)   # downhill, a little
    if step in (10, 25, 50, 100, 200, 400, 600):
        print(f"{step:>4}   {loss_over_text(table):.4f}")`,
  },
  {
    title: "how good is that?",
    lead: "A number falling is not the same as a number being good. Two marks to measure against, both from the text itself.",
    code: `# Knowing nothing: every character equally likely.
print("knowing nothing       :", round(float(np.log(V)), 4))

# The floor: the counted table's own loss. Count the pairs, turn each row
# into true shares, then score those shares on every position of the text.
pairs = np.zeros((V, V))
for a, b in zip(data, data[1:]):
    pairs[a, b] += 1
rows = pairs.sum(1, keepdims=True)
P = np.divide(pairs, rows, out=np.zeros_like(pairs), where=rows > 0)
floor = -np.log(P[data[:-1], data[1:]]).mean()
print("the counted table     :", round(float(floor), 4))
print("what training reached :", round(float(loss_over_text(table)), 4))`,
  },
  {
    title: "and what it learned",
    lead: "Compare the trained table against the one built by counting. Nobody told the loop to count anything — it only ever saw a wrongness score and which way to move.",
    code: `t = stoi["t"]
learned = softmax(table[t])
counted = P[t]

print("after 't', as percentages")
print(f"{'':>4} {'learned':>9} {'counted':>9}")
for j, ch in enumerate(chars):
    if learned[j] > 0.01 or counted[j] > 0.01:
        print(f"{ch!r:>4} {learned[j] * 100:>8.1f}% {counted[j] * 100:>8.1f}%")`,
  },
];
