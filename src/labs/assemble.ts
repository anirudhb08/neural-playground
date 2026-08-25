/**
 * Assembling the model, in six cells.
 *
 * The cells build the whole forward pass from the pieces the tutorial already
 * owns, in the order the problems appear: prove the stack cannot see order,
 * fix it with the position table, bridge back to vocabulary scores, then
 * count every number and check the untrained loss says "knowing nothing".
 *
 * Comments inside `code` gloss what each line does, for the reader. See
 * labs/bigram.ts for why that is the opposite of this repo's usual rule.
 *
 * 10-assembling.mdx quotes the True/False blindness pair, the census total of
 * 12,800, and the untrained loss printed by the last cell. Pinned by the
 * seed. Rerun if it changes.
 */
export const assembleLab = () => [
  {
    title: "every piece, on the bench",
    lead: "Nothing new — the head, the glue, the feed-forward, the tidy and the block, condensed from the last three parts, plus the sentence as numbers.",
    code: `import numpy as np
rng = np.random.default_rng(0)

text = "the cat sat on the mat and the dog sat on the log"
chars = sorted(set(text)); V = len(chars)
stoi = {ch: i for i, ch in enumerate(chars)}
data = np.array([stoi[ch] for ch in text])

T, C, HEADS = 16, 32, 4          # window, model width, heads
HS, F = C // HEADS, 4 * C        # head width, thinking width

def softmax(z, axis=-1):
    z = z - z.max(axis=axis, keepdims=True)
    e = np.exp(z)
    return e / e.sum(axis=axis, keepdims=True)

def layer_norm(z, g, b):
    m = z.mean(-1, keepdims=True)
    v = ((z - m) ** 2).mean(-1, keepdims=True)
    return (z - m) / np.sqrt(v + 1e-5) * g + b

def attention(h, Wq, Wk, Wv):          # all heads of one block
    outs = []
    t = h.shape[1]
    mask = np.triu(np.ones((t, t), dtype=bool), 1)
    for i in range(HEADS):
        Q, K, Va = h @ Wq[i], h @ Wk[i], h @ Wv[i]
        s = Q @ K.transpose(0, 2, 1) / np.sqrt(HS)
        outs.append(softmax(np.where(mask, -np.inf, s)) @ Va)
    return np.concatenate(outs, axis=-1)

n = rng.normal
params = {
    "tok": n(0, 0.08, (V, C)),   "pos": n(0, 0.08, (T, C)),
    "g1": np.ones(C), "b1": np.zeros(C),
    "Wq": n(0, 1/np.sqrt(C), (HEADS, C, HS)),
    "Wk": n(0, 1/np.sqrt(C), (HEADS, C, HS)),
    "Wv": n(0, 1/np.sqrt(C), (HEADS, C, HS)),
    "g2": np.ones(C), "b2": np.zeros(C),
    "W1": n(0, 1/np.sqrt(C), (C, F)), "W2": n(0, 1/np.sqrt(F), (F, C)),
    "gf": np.ones(C), "bf": np.zeros(C),
    "head": n(0, 0.02, (C, V)),      # near zero, for the last cell
}
print("pieces ready — vocabulary", V, "| window", T, "| model width", C)`,
  },
  {
    title: "the stack cannot see order",
    lead: "Run the block on a window, then on the same window with everything before the last character shuffled. Compare what the last position concludes.",
    code: `def block(z, p):
    z = z + attention(layer_norm(z, p["g1"], p["b1"]), p["Wq"], p["Wk"], p["Wv"])
    z = z + np.maximum(layer_norm(z, p["g2"], p["b2"]) @ p["W1"], 0) @ p["W2"]
    return z

seq  = np.array([[stoi[ch] for ch in "the cat "]])
perm = np.array([[stoi[ch] for ch in "he tcat "]])   # prefix shuffled, last kept

out1 = block(params["tok"][seq],  params)
out2 = block(params["tok"][perm], params)
print("last position identical under prefix shuffle:", np.allclose(out1[0, -1], out2[0, -1]))

# Shares are computed pair by pair and summed. Shuffle the prefix and the
# same pairs are summed in a different order — the blend cannot tell.`,
  },
  {
    title: "a second table, read by seat",
    lead: "The fix is one more table, as wide as the first, looked up by slot rather than by character, and added. The same character at two seats now arrives as two different vectors.",
    code: `x = params["tok"][np.array([[stoi["t"], stoi["h"], stoi["t"]]])]
print("t at seat 0 and seat 2, token rows only:", np.allclose(x[0, 0], x[0, 2]))

x = x + params["pos"][:3]
print("after adding the seat rows            :", np.allclose(x[0, 0], x[0, 2]))

out1 = block(params["tok"][seq]  + params["pos"][:8], params)
out2 = block(params["tok"][perm] + params["pos"][:8], params)
print("blindness, retested:", np.allclose(out1[0, -1], out2[0, -1]))`,
  },
  {
    title: "the whole model",
    lead: "Embed by character, add the seat, one block, final tidy, and one last matrix to turn each position's 32-number description back into 13 vocabulary scores.",
    code: `def forward(idx, p):
    t = idx.shape[1]
    z = p["tok"][idx] + p["pos"][:t]           # who, plus where
    z = block(z, p)                            # gather, think
    z = layer_norm(z, p["gf"], p["bf"])        # final tidy
    return z @ p["head"]                       # description -> scores

starts = rng.integers(0, len(data) - T - 1, 4)
xb = np.stack([data[i:i+T] for i in starts])
yb = np.stack([data[i+1:i+T+1] for i in starts])

logits = forward(xb, params)
print("batch in:", xb.shape, " logits out:", logits.shape)`,
  },
  {
    title: "the census",
    lead: "Count every number that training will be allowed to touch.",
    code: `total = 0
for name, w in params.items():
    total += w.size
    print(f"{name:>4}  {str(w.shape):>14}  {w.size:>6}")
print(f"{'':>4}  {'total':>14}  {total:>6}")`,
  },
  {
    title: "it starts honestly ignorant",
    lead: "The head was born near zero, so every logit is near zero, so softmax hands out nearly even shares — and the loss should sit at the knowing-nothing baseline before a single step of training.",
    code: `def loss_of(logits, targets):
    B, t, V_ = logits.shape
    probs = softmax(logits).reshape(-1, V_)
    return -np.log(probs[np.arange(B * t), targets.reshape(-1)]).mean()

print("untrained loss :", round(float(loss_of(forward(xb, params), yb)), 4))
print("knowing nothing:", round(float(np.log(V)), 4))`,
  },
];
