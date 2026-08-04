/**
 * The bigram model, written out by hand in four cells.
 *
 * Plain Python and NumPy rather than the PyTorch the build notes used, for two
 * reasons: PyTorch is far too large to load in a browser, and this model has no
 * parameters and no gradients, so there is nothing PyTorch would be doing here
 * anyway. The arithmetic is identical.
 *
 * The comments inside `code` are for the reader, and follow the opposite rule
 * to the rest of this repo: they say *what* a line does, because for someone
 * meeting `zip(text, text[1:])` or `setdefault` for the first time the what is
 * the hard part. The `lead` above each cell carries the why.
 *
 * 02-counting-pairs.mdx quotes the third line the last cell prints, verbatim.
 * It is pinned by `text` and by `random.seed(7)` together, so changing either
 * one — or the order of the random() calls above it — silently makes the prose
 * describe output nobody will see. Rerun the cells and update the quote.
 */
export const bigramLab = () => [
  {
    title: "count every pair",
    lead: "A bigram model has no parameters to train. You read the text once, tally which character follows which, and the tally is the model. Nothing here learns anything.",
    code: `text = "the cat sat on the mat"

counts = {}
# text against itself shifted one along, which gives every
# neighbouring pair: (t,h), (h,e), (e,' '), (' ',c) and so on.
for prev, next_char in zip(text, text[1:]):
    counts.setdefault(prev, {})    # first sighting of prev: start an empty row for it
    counts[prev][next_char] = counts[prev].get(next_char, 0) + 1   # add one to this pair

for ch in sorted(counts):
    print(repr(ch), "->", counts[ch])   # repr, so a space shows up as ' '`,
  },
  {
    title: "turn counts into probabilities",
    lead: "Divide each row by its own total and it becomes a distribution: for a given character, what fraction of the time did each other character follow it. Every row now sums to 1.",
    code: `probs = {}
for prev, row in counts.items():
    total = sum(row.values())      # how many times prev was followed by anything at all
    # every count rewritten as its share of that total
    probs[prev] = {ch: n / total for ch, n in row.items()}

print("after 't':", probs["t"])
print("after 'a':", probs["a"])
print("after ' ':", probs[" "])
print()
# Dividing rarely lands exactly on 1.0, so this asks whether each row is
# within a billionth of it rather than equal to it.
print("every row sums to 1:",
      all(abs(sum(r.values()) - 1) < 1e-9 for r in probs.values()))`,
  },
  {
    title: "sample from a distribution",
    lead: "The model reports a distribution; picking one is a separate act. Draw a number in [0, 1), walk the probabilities keeping a running total, and take the first that pushes the total past your draw. PyTorch spells these six lines torch.multinomial.",
    code: `import random
random.seed(7)     # fixes the draws, so your output matches the page. Delete it to vary.

def sample_next(row):
    draw = random.random()          # the pin: from 0 up to, but never, 1
    running = 0.0
    for ch, p in sorted(row.items()):
        running += p                # the right-hand edge of this character's stretch
        if draw < running:          # the pin landed before that edge, so it is this one
            return ch, draw
    return ch, draw                 # only reached if rounding left the last edge short

for _ in range(6):
    ch, draw = sample_next(probs["t"])
    print(f"draw {draw:.3f} -> {ch!r}")   # watch the same row give different answers`,
  },
  {
    title: "feed it back in",
    lead: "Sample, append, use the new character as the next input, repeat. Run it a few times: the same starting character gives different text, because sampling is a die rather than a lookup.",
    code: `def generate(start, length):
    out = start
    for _ in range(length):
        row = probs.get(out[-1])    # out[-1] is the last character written so far
        if not row:                 # nothing was ever seen after it, so stop here
            break
        ch, _ = sample_next(row)
        out += ch                   # append it, and it becomes the next input
    return out

for _ in range(5):
    print(repr(generate("t", 20)))   # same seed, five different runs`,
  },
];
