/**
 * Generating text, in five cells.
 *
 * The weights are the long run's best — held-out loss 1.6672 at step 11,500 —
 * shipped with the site and loaded by the setup, and the first cell re-scores
 * them so the number is a receipt rather than a claim. Then the loop, written
 * out; temperature; the greedy trap; and the bigram set against the
 * transformer on the same text, which is the whole tutorial's closing
 * argument.
 *
 * 12-generating.mdx quotes the re-scored 1.667, the samples at each
 * temperature, the greedy loop, and the final confrontation. Pinned by the
 * seeds and the shipped weights.
 */
export const generateGptLab = () => [
  {
    title: "the weights arrive, with a receipt",
    lead: "Fourteen and a half thousand numbers, trained for eleven and a half thousand steps in the last part, shipped with this page. Do not take the label on the box — re-score them on the held-back tenth yourself.",
    code: `import numpy as np

data = np.array([vocab.index(c) for c in training_text])
val = data[int(len(data) * 0.9):]

def held_out_loss(p):
    starts = list(range(0, len(val) - T - 1, 3))
    tot = 0.0
    for i in range(0, len(starts), 64):
        ss = starts[i:i+64]
        idx = np.stack([val[j:j+T] for j in ss]); tgt = np.stack([val[j+1:j+T+1] for j in ss])
        logits, _ = forward(trained, idx)
        tot += loss_of(logits, tgt) * len(ss)
    return tot / len(starts)

print("numbers in the box:", sum(w.size for w in trained.values()))
print("label on the box  :", trained_meta["val"], "at step", trained_meta["step"])
print("re-scored here    :", round(held_out_loss(trained), 4))`,
  },
  {
    title: "the loop, written out",
    lead: "The bigram's generation loop with one upgrade: the model sees a window, so keep only the last sixteen characters of what exists so far. Read the last position's scores, soften to percentages, roll the die, append, repeat.",
    code: `rng = np.random.default_rng(7)

def speak(prompt, n, temperature=0.9):
    out = [vocab.index(c) for c in prompt]
    for _ in range(n):
        window = np.array([out[-T:]])              # crop: the model sees 16, at most
        logits, _ = forward(trained, window)
        z = logits[0, -1] / temperature            # the last position's opinion
        p = np.exp(z - z.max()); p /= p.sum()
        out.append(int(rng.choice(len(p), p=p)))
    return "".join(vocab[i] for i in out)

print(repr(speak("the model ", 180)))`,
  },
  {
    title: "temperature",
    lead: "Dividing the scores before softmax resharpens or flattens the percentages — the same lever the attention divisor pulled, now under your control. Low is timid, high is reckless.",
    code: `for temp in (0.3, 0.9, 1.6):
    rng = np.random.default_rng(7)
    print(f"t={temp}:", repr(speak("the model ", 90, temperature=temp)))
    print()`,
  },
  {
    title: "the greedy trap",
    lead: "Push temperature to nothing and sampling becomes always take the single most likely character. It sounds like a sensible policy, and it walks straight into a loop.",
    code: `out = [vocab.index(c) for c in "the model "]
for _ in range(120):
    logits, _ = forward(trained, np.array([out[-T:]]))
    out.append(int(np.argmax(logits[0, -1])))      # no die at all
print(repr("".join(vocab[i] for i in out)))

# The most likely continuation of a phrase can be the phrase that led to it.
# With no randomness there is no way out, so it orbits. A little temperature
# is not decoration - it is the exit.`,
  },
  {
    title: "the counted table gets its rematch",
    lead: "The bigram, counted from the same text, generating alongside the transformer. One character of memory against sixteen, and this time both were built by you.",
    code: `pairs = np.ones((len(vocab), len(vocab)))
for a, b in zip(data, data[1:]):
    pairs[a, b] += 1
P = pairs / pairs.sum(1, keepdims=True)

rng = np.random.default_rng(7)
ids = [vocab.index("t")]
for _ in range(150):
    ids.append(int(rng.choice(len(vocab), p=P[ids[-1]])))
print("bigram     :", repr("".join(vocab[i] for i in ids)))
print()
print("transformer:", repr(speak("t", 150)))`,
  },
];
