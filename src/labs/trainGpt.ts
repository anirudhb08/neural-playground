/**
 * Training the assembled model, in five cells.
 *
 * Two acts with the same model and the same loop: a small text it memorises,
 * and ten times the text where the held-out loss finally beats the best any
 * one-character model can do. The gradients come from the injected
 * gptModel.py (see gptSetup.ts); cell 2 is the reader's own check on them.
 *
 * 11-training-properly.mdx quotes the finite-difference pair, both acts'
 * numbers, the two bigram floors, and the sample. Pinned by the seeds. The
 * two training cells take real time — about half a minute and a minute — and
 * their leads say so.
 */
export const trainGptLab = () => [
  {
    title: "two corpora and a split",
    lead: "The little corpus is the one the tutorial has used for figures; the big one is sixteen thousand characters of this tutorial's own prose, flattened. Both get the same treatment: hold the last tenth back, and never train on it.",
    code: `import numpy as np

def load(text):
    chars = sorted(set(text))
    data = np.array([{c: i for i, c in enumerate(chars)}[c] for c in text])
    cut = int(len(data) * 0.9)
    return chars, data[:cut], data[cut:]

lc, ltrain, lval = load(little_text)
bc, btrain, bval = load(training_text)
print(f"little text: {len(ltrain)} to train on, {len(lval)} held back, vocab {len(lc)}")
print(f"big text   : {len(btrain)} to train on, {len(bval)} held back, vocab {len(bc)}")

def batch(rng, d, B=16):
    s = rng.integers(0, len(d) - T - 1, B)
    return (np.stack([d[i:i+T] for i in s]), np.stack([d[i+1:i+T+1] for i in s]))

def eval_loss(p, d, stride=3):
    starts = list(range(0, len(d) - T - 1, stride))
    tot = 0.0
    for i in range(0, len(starts), 64):
        ss = starts[i:i+64]
        idx = np.stack([d[j:j+T] for j in ss]); tgt = np.stack([d[j+1:j+T+1] for j in ss])
        logits, _ = forward(p, idx)
        tot += loss_of(logits, tgt) * len(ss)
    return tot / len(starts)

def bigram_floor(train_d, val_d, V):
    pairs = np.ones((V, V))          # one phantom count, so nothing scores zero
    for a, b in zip(train_d, train_d[1:]): pairs[a, b] += 1
    P = pairs / pairs.sum(1, keepdims=True)
    return float(-np.log(P[val_d[:-1], val_d[1:]]).mean())

print("model file loaded:", callable(loss_and_grads), "| window", T, "| lane", C)`,
  },
  {
    title: "trust, then verify",
    lead: "The slopes for all 12,800-odd numbers come from the injected file, hand-written and matched against torch autograd to 5.6 × 10⁻¹⁷. Here is a check you can run yourself: nudge one weight up and down by a whisker, and the loss should move at exactly the slope the file claims.",
    code: `rng = np.random.default_rng(0)
p = init_params(len(bc), rng)
xb, yb = batch(rng, btrain)

loss, grads = loss_and_grads(p, xb, yb)
claimed = grads["W1"][3, 7]

eps = 1e-5
p["W1"][3, 7] += eps
up = loss_of(forward(p, xb)[0], yb)
p["W1"][3, 7] -= 2 * eps
down = loss_of(forward(p, xb)[0], yb)
p["W1"][3, 7] += eps                     # put it back

measured = (up - down) / (2 * eps)
print("slope the file claims :", f"{claimed:.10f}")
print("slope measured by nudging:", f"{measured:.10f}")`,
  },
  {
    title: "act one: a small text, memorised",
    lead: "Train on the little corpus and watch both numbers. The training loss dives; the held-back loss turns and climbs past what a counted bigram scores. Takes about half a minute.",
    code: `rng = np.random.default_rng(1)
p_small = init_params(len(lc), rng)
print("bigram on the held-back tenth:", round(bigram_floor(ltrain, lval, len(lc)), 3))
print(" step   train    held-back")
for step in range(1, 1001):
    x, y = batch(rng, ltrain)
    _, g = loss_and_grads(p_small, x, y)
    sgd_step(p_small, g, 0.1)
    if step in (200, 600, 1000):
        print(f"{step:>5}   {eval_loss(p_small, ltrain, 11):.3f}    {eval_loss(p_small, lval):.3f}")

# The training number is a mirror; the held-back number is a window. By the
# end the mirror says expert and the window says worse than counting pairs.`,
  },
  {
    title: "act two: ten times the text",
    lead: "The same model, the same loop, the same learning recipe — only the amount of text changes. A minute, maybe two.",
    code: `rng = np.random.default_rng(1)
p_big = init_params(len(bc), rng)
print("bigram on the held-back tenth:", round(bigram_floor(btrain, bval, len(bc)), 3))
print(" step   train    held-back")
for step in range(1, 1501):
    x, y = batch(rng, btrain)
    _, g = loss_and_grads(p_big, x, y)
    sgd_step(p_big, g, 0.3)
    if step in (250, 500, 1000, 1500):
        print(f"{step:>5}   {eval_loss(p_big, btrain, 11):.3f}    {eval_loss(p_big, bval):.3f}")

# Under the bigram floor on text it has never seen: the context machinery
# is, at last, measurably earning its keep.`,
  },
  {
    title: "and it speaks",
    lead: "Fifteen hundred steps in, sample from it. Character by character, sixteen characters of context, nothing else.",
    code: `ids = generate(p_big, [bc.index(c) for c in "the model "], 160,
               np.random.default_rng(7), temperature=0.9)
print(repr("".join(bc[i] for i in ids)))`,
  },
];
