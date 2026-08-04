/**
 * The bigram model, written out by hand in four cells.
 *
 * Plain Python and NumPy rather than the PyTorch the build notes used, for two
 * reasons: PyTorch is far too large to load in a browser, and this model has no
 * parameters and no gradients, so there is nothing PyTorch would be doing here
 * anyway. The arithmetic is identical.
 */
export const bigramLab = () => [
  {
    title: "count every pair",
    lead: "A bigram model has no parameters to train. You read the text once, tally which character follows which, and the tally is the model. Nothing here learns anything.",
    code: `text = "the cat sat on the mat"

counts = {}
for prev, next_char in zip(text, text[1:]):
    counts.setdefault(prev, {})
    counts[prev][next_char] = counts[prev].get(next_char, 0) + 1

for ch in sorted(counts):
    print(repr(ch), "->", counts[ch])`,
  },
  {
    title: "turn counts into probabilities",
    lead: "Divide each row by its own total and it becomes a distribution: for a given character, what fraction of the time did each other character follow it. Every row now sums to 1.",
    code: `probs = {}
for prev, row in counts.items():
    total = sum(row.values())
    probs[prev] = {ch: n / total for ch, n in row.items()}

print("after 't':", probs["t"])
print("after 'a':", probs["a"])
print("after ' ':", probs[" "])
print()
print("every row sums to 1:",
      all(abs(sum(r.values()) - 1) < 1e-9 for r in probs.values()))`,
  },
  {
    title: "sample from a distribution",
    lead: "The model reports a distribution; picking one is a separate act. Draw a number in [0, 1), walk the probabilities keeping a running total, and take the first that pushes the total past your draw. PyTorch spells these six lines torch.multinomial.",
    code: `import random
random.seed(7)

def sample_next(row):
    draw = random.random()
    running = 0.0
    for ch, p in sorted(row.items()):
        running += p
        if draw < running:
            return ch, draw
    return ch, draw

for _ in range(6):
    ch, draw = sample_next(probs["t"])
    print(f"draw {draw:.3f} -> {ch!r}")`,
  },
  {
    title: "feed it back in",
    lead: "Sample, append, use the new character as the next input, repeat. Run it a few times: the same starting character gives different text, because sampling is a die rather than a lookup.",
    code: `def generate(start, length):
    out = start
    for _ in range(length):
        row = probs.get(out[-1])
        if not row:
            break
        ch, _ = sample_next(row)
        out += ch
    return out

for _ in range(5):
    print(repr(generate("t", 20)))`,
  },
];
