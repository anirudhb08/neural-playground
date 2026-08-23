# The assembled tiny GPT and its gradients, in NumPy.
#
# This file is the single source of truth for the trained parts of the
# tutorial: the notebook cells inject it verbatim (via ?raw import), the
# training widget is a line-for-line JS port of it, and the shipped weights
# were produced by running it directly. Functions only, no state — the lab
# machinery re-runs this before every cell, so anything defined here must be
# safe to define twice.
#
# The gradients are hand-written, which is why every backward step carries the
# forward line it undoes. They are checked two ways: against torch autograd
# (scripts/check_gpt_grads.py, max difference reported in the tutorial) and by
# the finite-difference cell in the lab, which any reader can run.
import numpy as np

C, T, HEADS = 32, 16, 4
HS = C // HEADS          # width of one head
F = 4 * C                # width of the feed-forward middle


def init_params(V, rng):
    """Small random start. LN scales are born 1, shifts 0, so both layer
    norms begin as pure standardisers. The lm_head starts near zero so the
    untrained model's logits are near zero — honest ignorance, loss ln(V)."""
    n = rng.normal
    return {
        "tok": n(0, 0.08, (V, C)),
        "pos": n(0, 0.08, (T, C)),
        "g1": np.ones(C), "b1": np.zeros(C),
        "Wq": n(0, 1/np.sqrt(C), (HEADS, C, HS)),
        "Wk": n(0, 1/np.sqrt(C), (HEADS, C, HS)),
        "Wv": n(0, 1/np.sqrt(C), (HEADS, C, HS)),
        "g2": np.ones(C), "b2": np.zeros(C),
        "W1": n(0, 1/np.sqrt(C), (C, F)),
        "W2": n(0, 1/np.sqrt(F), (F, C)),
        "gf": np.ones(C), "bf": np.zeros(C),
        "head": n(0, 0.02, (C, V)),
    }


def _ln(z, g, b):
    m = z.mean(-1, keepdims=True)
    v = ((z - m) ** 2).mean(-1, keepdims=True)
    xh = (z - m) / np.sqrt(v + 1e-5)
    return xh * g + b, xh, np.sqrt(v + 1e-5)


def _softmax(z):
    z = z - z.max(-1, keepdims=True)
    e = np.exp(z)
    return e / e.sum(-1, keepdims=True)


def forward(p, idx):
    """idx (B, t) of token ids, t <= T. Returns logits (B, t, V) and the
    cache of everything the backward pass needs to undo it."""
    B, t = idx.shape
    x = p["tok"][idx] + p["pos"][:t]                      # (B, t, C)

    h1, xh1, s1 = _ln(x, p["g1"], p["b1"])                # tidy
    mask = np.triu(np.ones((t, t), dtype=bool), 1)
    att, heads_out = [], []
    for i in range(HEADS):                                # gather
        Q = h1 @ p["Wq"][i]; K = h1 @ p["Wk"][i]; V_ = h1 @ p["Wv"][i]
        s = Q @ K.transpose(0, 2, 1) / np.sqrt(HS)
        a = _softmax(np.where(mask, -np.inf, s))
        att.append((Q, K, V_, a))
        heads_out.append(a @ V_)
    sa = np.concatenate(heads_out, axis=-1)
    x2 = x + sa                                           # add

    h2, xh2, s2 = _ln(x2, p["g2"], p["b2"])               # tidy
    pre = h2 @ p["W1"]
    act = np.maximum(pre, 0)
    x3 = x2 + act @ p["W2"]                               # think, add

    h3, xh3, s3 = _ln(x3, p["gf"], p["bf"])               # final tidy
    logits = h3 @ p["head"]
    cache = (idx, x, h1, xh1, s1, mask, att, x2, h2, xh2, s2, pre, act, x3, h3, xh3, s3)
    return logits, cache


def loss_of(logits, targets):
    B, t, V = logits.shape
    probs = _softmax(logits).reshape(-1, V)
    return float(-np.log(probs[np.arange(B * t), targets.reshape(-1)] + 1e-12).mean())


def _ln_back(dy, xh, s, g):
    dg = (dy * xh).sum((0, 1))
    db = dy.sum((0, 1))
    dxh = dy * g
    dz = (dxh - dxh.mean(-1, keepdims=True) - xh * (dxh * xh).mean(-1, keepdims=True)) / s
    return dz, dg, db


def loss_and_grads(p, idx, targets):
    """One batch: loss plus the slope of the loss for every parameter.
    Each step below undoes one forward line, most recent first."""
    logits, cache = forward(p, idx)
    (idx, x, h1, xh1, s1, mask, att, x2, h2, xh2, s2, pre, act, x3, h3, xh3, s3) = cache
    B, t, V = logits.shape
    N = B * t
    g = {}

    # the loss: percentages, minus 1 at the answer, averaged
    d = _softmax(logits)
    d.reshape(-1, V)[np.arange(N), targets.reshape(-1)] -= 1
    dlogits = d / N

    g["head"] = h3.reshape(-1, C).T @ dlogits.reshape(-1, V)
    dh3 = dlogits @ p["head"].T
    dx3, g["gf"], g["bf"] = _ln_back(dh3, xh3, s3, p["gf"])

    # x3 = x2 + act @ W2
    g["W2"] = act.reshape(-1, F).T @ dx3.reshape(-1, C)
    dact = dx3 @ p["W2"].T
    dpre = dact * (pre > 0)                               # the bend's gradient
    g["W1"] = h2.reshape(-1, C).T @ dpre.reshape(-1, F)
    dh2 = dpre @ p["W1"].T
    dx2, g["g2"], g["b2"] = _ln_back(dh2, xh2, s2, p["g2"])
    dx2 = dx2 + dx3                                       # the residual lane

    # x2 = x + concat(heads)
    dsa = dx2
    dh1 = np.zeros_like(h1)
    g["Wq"] = np.zeros_like(p["Wq"]); g["Wk"] = np.zeros_like(p["Wk"]); g["Wv"] = np.zeros_like(p["Wv"])
    for i in range(HEADS):
        Q, K, V_, a = att[i]
        dout = dsa[..., i * HS:(i + 1) * HS]
        dV = a.transpose(0, 2, 1) @ dout
        da = dout @ V_.transpose(0, 2, 1)
        ds = a * (da - (da * a).sum(-1, keepdims=True))   # softmax backward
        ds = np.where(mask, 0, ds) / np.sqrt(HS)
        dQ = ds @ K
        dK = ds.transpose(0, 2, 1) @ Q
        g["Wq"][i] = h1.reshape(-1, C).T @ dQ.reshape(-1, HS)
        g["Wk"][i] = h1.reshape(-1, C).T @ dK.reshape(-1, HS)
        g["Wv"][i] = h1.reshape(-1, C).T @ dV.reshape(-1, HS)
        dh1 += dQ @ p["Wq"][i].T + dK @ p["Wk"][i].T + dV @ p["Wv"][i].T
    dx, g["g1"], g["b1"] = _ln_back(dh1, xh1, s1, p["g1"])
    dx = dx + dx2                                         # the other residual lane

    # x = tok[idx] + pos[:t]
    g["tok"] = np.zeros_like(p["tok"])
    np.add.at(g["tok"], idx.reshape(-1), dx.reshape(-1, C))
    g["pos"] = np.zeros_like(p["pos"])
    g["pos"][:t] = dx.sum(0)

    return loss_of(logits, targets), g


def sgd_step(p, g, lr):
    for k in p:
        p[k] -= lr * g[k]


def generate(p, prompt_ids, n, rng, temperature=1.0):
    """Sample n tokens: crop to the last T, read the last position, draw."""
    out = list(prompt_ids)
    for _ in range(n):
        window = np.array([out[-T:]])
        logits, _ = forward(p, window)
        z = logits[0, -1] / max(temperature, 1e-6)
        probs = _softmax(z[None, :])[0]
        out.append(int(rng.choice(len(probs), p=probs)))
    return out
