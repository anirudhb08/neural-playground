/**
 * Context windows and the shift-by-one trick, in five cells.
 *
 * NumPy arrives here rather than in part 03 because this is the first part
 * where shape is the subject. A batch is a rectangle of integers and the whole
 * lesson of the last two cells is what its two numbers mean, which is hard to
 * see in a list of lists.
 *
 * Comments inside `code` gloss what each line does, for the reader. See
 * labs/bigram.ts for why that is the opposite of this repo's usual rule.
 *
 * 04-context-windows.mdx quotes the eight pairs the third cell prints and the
 * shapes the fourth one reports. Both are pinned by `text` and by block_size,
 * and the batch is pinned by the seed as well. Rerun these if any of them
 * changes.
 */
export const contextWindowLab = () => [
  {
    title: "the whole text, as one long line of numbers",
    lead: "Characters are integers now. Do that to a whole text at once and the training data is a single flat sequence — no examples, no labels, no structure. Cutting it into examples is this part's whole job.",
    code: `text = "the cat sat on the mat and the dog sat on the log"

chars = sorted(set(text))
stoi = {ch: i for i, ch in enumerate(chars)}

data = [stoi[ch] for ch in text]

print(len(data), "characters")
print("first twelve:", data[:12])`,
  },
  {
    title: "one chunk, cut two ways",
    lead: "Take block_size + 1 characters — one more than the window. Everything but the last is the input; everything but the first is the answer. The two overlap almost completely, which is the point.",
    code: `block_size = 8
start = 0

chunk = data[start : start + block_size + 1]   # nine characters

x = chunk[:block_size]    # the first eight
y = chunk[1:]             # the last eight — the same run, shifted one along

print("chunk:", chunk)
print("x:    ", x)
print("y:    ", y)
print()
print("x as text:", repr("".join(chars[c] for c in x)))
print("y as text:", repr("".join(chars[c] for c in y)))`,
  },
  {
    title: "eight examples hiding in one chunk",
    lead: "This is the step worth slowing down on. y[i] is the character that followed everything in x up to and including position i — so a chunk of nine characters is not one training example. It is eight.",
    code: `for i in range(block_size):
    context = x[: i + 1]      # everything up to AND INCLUDING i
    target = y[i]             # the character that came next
    shown = "".join(chars[c] for c in context)
    print(f"{shown!r:>12}  ->  {chars[target]!r}")

# Nobody wrote those answers down. Every one of them was already in the text,
# and shifting by one is the whole of how they were extracted.`,
  },
  {
    title: "a batch is several chunks at once",
    lead: "Rows are independent: different random positions in the text, stacked into a rectangle only because hardware would rather do sixty-four of something than one. Nothing flows between them.",
    code: `import numpy as np

rng = np.random.default_rng(0)
arr = np.array(data)

def get_batch(batch_size, block_size):
    highest = len(arr) - block_size        # exclusive: see the next cell
    starts = rng.integers(0, highest, batch_size)
    x = np.stack([arr[s : s + block_size] for s in starts])
    y = np.stack([arr[s + 1 : s + block_size + 1] for s in starts])
    return x, y

xb, yb = get_batch(4, 8)

print("x shape:", xb.shape)   # (rows, characters per row)
print("y shape:", yb.shape)   # the same shape, always
print()
print(xb)`,
  },
  {
    title: "the boundary, and what getting it wrong looks like",
    lead: "y reaches one character further than x, so the last legal starting point is one earlier than you would guess. Off-by-ones here are silent — they do not crash, they just quietly train on the wrong thing — so it is worth doing the arithmetic once.",
    code: `block_size = 8
highest = len(arr) - block_size      # randint's upper bound is exclusive
last_start = highest - 1

print("characters:", len(arr))
print("largest start:", last_start)
print("y for that row ends at index", last_start + block_size, "and the last index is", len(arr) - 1)

# One too generous, and the final row runs off the end. NumPy does not
# complain about the short slice — it complains later, about the shape.
try:
    bad = len(arr) - block_size + 1
    np.stack([arr[s + 1 : s + block_size + 1] for s in range(bad - 2, bad)])
except ValueError as why:
    print("\\noff by one:", why)`,
  },
];
