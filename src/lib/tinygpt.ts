/**
 * The assembled model in JavaScript — a line-for-line port of gptModel.py.
 *
 * Exists so the training widget and the generator can run the real model in
 * the page. The Python file stays the source of truth (its gradients are the
 * ones checked against torch to 5.6e-17); this port is verified behaviourally:
 * trained with the same recipe on the same split it reaches the same held-out
 * loss band the NumPy run does, which a port with a wrong gradient cannot.
 *
 * Everything is Float64Array and flat indexing. Shapes follow the Python:
 * comments name the line being mirrored.
 */
export const C = 32, T = 16, HEADS = 4, HS = C / HEADS, F = 4 * C;

export type Params = Record<string, Float64Array>;
export type Grads = Params;

export function mulberryGauss(seed: number) {
  let a = seed >>> 0;
  const rand = () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return () => {
    const u = Math.max(rand(), 1e-9);
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
  };
}

export function initParams(V: number, seed: number): Params {
  const g = mulberryGauss(seed);
  const arr = (n: number, s: number) => Float64Array.from({ length: n }, () => g() * s);
  const ones = (n: number) => new Float64Array(n).fill(1);
  const p: Params = {
    tok: arr(V * C, 0.08), pos: arr(T * C, 0.08),
    g1: ones(C), b1: new Float64Array(C),
    g2: ones(C), b2: new Float64Array(C),
    gf: ones(C), bf: new Float64Array(C),
    W1: arr(C * F, 1 / Math.sqrt(C)), W2: arr(F * C, 1 / Math.sqrt(F)),
    head: arr(C * V, 0.02),
  };
  for (let h = 0; h < HEADS; h++) {
    p["Wq" + h] = arr(C * HS, 1 / Math.sqrt(C));
    p["Wk" + h] = arr(C * HS, 1 / Math.sqrt(C));
    p["Wv" + h] = arr(C * HS, 1 / Math.sqrt(C));
  }
  return p;
}

/** out(m×n) = A(m×k) @ B(k×n) */
function mm(A: Float64Array, B: Float64Array, m: number, k: number, n: number, out: Float64Array) {
  out.fill(0);
  for (let i = 0; i < m; i++)
    for (let p_ = 0; p_ < k; p_++) {
      const a = A[i * k + p_];
      if (a === 0) continue;
      for (let j = 0; j < n; j++) out[i * n + j] += a * B[p_ * n + j];
    }
}
/** dB(k×n) += A(m×k)ᵀ @ dC(m×n) */
function mmAT(A: Float64Array, dC: Float64Array, m: number, k: number, n: number, dB: Float64Array) {
  for (let i = 0; i < m; i++)
    for (let p_ = 0; p_ < k; p_++) {
      const a = A[i * k + p_];
      if (a === 0) continue;
      for (let j = 0; j < n; j++) dB[p_ * n + j] += a * dC[i * n + j];
    }
}
/** dA(m×k) += dC(m×n) @ B(k×n)ᵀ */
function mmBT(dC: Float64Array, B: Float64Array, m: number, k: number, n: number, dA: Float64Array) {
  for (let i = 0; i < m; i++)
    for (let j = 0; j < n; j++) {
      const d = dC[i * n + j];
      if (d === 0) continue;
      for (let p_ = 0; p_ < k; p_++) dA[i * k + p_] += d * B[p_ * n + j];
    }
}

function lnForward(z: Float64Array, g: Float64Array, b: Float64Array, rows: number) {
  const out = new Float64Array(rows * C), xh = new Float64Array(rows * C), s = new Float64Array(rows);
  for (let r = 0; r < rows; r++) {
    let m = 0;
    for (let j = 0; j < C; j++) m += z[r * C + j];
    m /= C;
    let v = 0;
    for (let j = 0; j < C; j++) { const d = z[r * C + j] - m; v += d * d; }
    v /= C;
    const sd = Math.sqrt(v + 1e-5);
    s[r] = sd;
    for (let j = 0; j < C; j++) {
      const h = (z[r * C + j] - m) / sd;
      xh[r * C + j] = h;
      out[r * C + j] = h * g[j] + b[j];
    }
  }
  return { out, xh, s };
}
function lnBackward(dy: Float64Array, xh: Float64Array, s: Float64Array, g: Float64Array,
                    rows: number, dg: Float64Array, db: Float64Array) {
  const dz = new Float64Array(rows * C);
  for (let r = 0; r < rows; r++) {
    let mDxh = 0, mDxhXh = 0;
    for (let j = 0; j < C; j++) {
      const d = dy[r * C + j];
      dg[j] += d * xh[r * C + j];
      db[j] += d;
      const dxh = d * g[j];
      mDxh += dxh; mDxhXh += dxh * xh[r * C + j];
    }
    mDxh /= C; mDxhXh /= C;
    for (let j = 0; j < C; j++) {
      const dxh = dy[r * C + j] * g[j];
      dz[r * C + j] = (dxh - mDxh - xh[r * C + j] * mDxhXh) / s[r];
    }
  }
  return dz;
}

function softmaxRows(z: Float64Array, rows: number, n: number) {
  for (let r = 0; r < rows; r++) {
    let mx = -Infinity;
    for (let j = 0; j < n; j++) mx = Math.max(mx, z[r * n + j]);
    let tot = 0;
    for (let j = 0; j < n; j++) { const e = Math.exp(z[r * n + j] - mx); z[r * n + j] = e; tot += e; }
    for (let j = 0; j < n; j++) z[r * n + j] /= tot;
  }
}

/** Full loss + gradients for one batch. idx/targets are (B, t) int arrays. */
export function lossAndGrads(p: Params, idx: Int32Array, targets: Int32Array, B: number, t: number, V: number) {
  const R = B * t;
  // x = tok[idx] + pos[:t]
  const x = new Float64Array(R * C);
  for (let r = 0; r < R; r++) {
    const tokRow = idx[r] * C, posRow = (r % t) * C;
    for (let j = 0; j < C; j++) x[r * C + j] = p.tok[tokRow + j] + p.pos[posRow + j];
  }
  const L1 = lnForward(x, p.g1, p.b1, R);
  // attention per sample per head
  const sa = new Float64Array(R * C);
  const att: { Q: Float64Array; K: Float64Array; Vh: Float64Array; a: Float64Array }[][] = [];
  for (let b = 0; b < B; b++) {
    const h1 = L1.out.subarray(b * t * C, (b + 1) * t * C);
    const perHead = [];
    for (let h = 0; h < HEADS; h++) {
      const Q = new Float64Array(t * HS), K = new Float64Array(t * HS), Vh = new Float64Array(t * HS);
      mm(h1, p["Wq" + h], t, C, HS, Q); mm(h1, p["Wk" + h], t, C, HS, K); mm(h1, p["Wv" + h], t, C, HS, Vh);
      const a = new Float64Array(t * t);
      for (let i = 0; i < t; i++)
        for (let j = 0; j <= i; j++) {
          let s = 0;
          for (let d = 0; d < HS; d++) s += Q[i * HS + d] * K[j * HS + d];
          a[i * t + j] = s / Math.sqrt(HS);
        }
      for (let i = 0; i < t; i++) for (let j = i + 1; j < t; j++) a[i * t + j] = -Infinity;
      softmaxRows(a, t, t);
      for (let i = 0; i < t; i++)
        for (let d = 0; d < HS; d++) {
          let s = 0;
          for (let j = 0; j <= i; j++) s += a[i * t + j] * Vh[j * HS + d];
          sa[(b * t + i) * C + h * HS + d] = s;
        }
      perHead.push({ Q, K, Vh, a });
    }
    att.push(perHead);
  }
  // x2 = x + sa
  const x2 = new Float64Array(R * C);
  for (let i = 0; i < R * C; i++) x2[i] = x[i] + sa[i];
  const L2 = lnForward(x2, p.g2, p.b2, R);
  const pre = new Float64Array(R * F);
  mm(L2.out, p.W1, R, C, F, pre);
  const act = new Float64Array(R * F);
  for (let i = 0; i < R * F; i++) act[i] = Math.max(pre[i], 0);
  const ff = new Float64Array(R * C);
  mm(act, p.W2, R, F, C, ff);
  const x3 = new Float64Array(R * C);
  for (let i = 0; i < R * C; i++) x3[i] = x2[i] + ff[i];
  const L3 = lnForward(x3, p.gf, p.bf, R);
  const logits = new Float64Array(R * V);
  mm(L3.out, p.head, R, C, V, logits);

  // loss + dlogits
  softmaxRows(logits, R, V);
  let loss = 0;
  for (let r = 0; r < R; r++) loss -= Math.log(logits[r * V + targets[r]] + 1e-12);
  loss /= R;
  const dlogits = logits; // reuse: probs - 1 at target, / R
  for (let r = 0; r < R; r++) {
    dlogits[r * V + targets[r]] -= 1;
  }
  for (let i = 0; i < R * V; i++) dlogits[i] /= R;

  const g: Grads = {};
  for (const k of Object.keys(p)) g[k] = new Float64Array(p[k].length);

  mmAT(L3.out, dlogits, R, C, V, g.head);
  const dh3 = new Float64Array(R * C);
  mmBT(dlogits, p.head, R, C, V, dh3);
  const dx3 = lnBackward(dh3, L3.xh, L3.s, p.gf, R, g.gf, g.bf);

  mmAT(act, dx3, R, F, C, g.W2);
  const dact = new Float64Array(R * F);
  mmBT(dx3, p.W2, R, F, C, dact);
  for (let i = 0; i < R * F; i++) if (pre[i] <= 0) dact[i] = 0;
  mmAT(L2.out, dact, R, C, F, g.W1);
  const dh2 = new Float64Array(R * C);
  mmBT(dact, p.W1, R, C, F, dh2);
  const dx2 = lnBackward(dh2, L2.xh, L2.s, p.g2, R, g.g2, g.b2);
  for (let i = 0; i < R * C; i++) dx2[i] += dx3[i];      // residual lane

  // attention backward
  const dh1 = new Float64Array(R * C);
  for (let b = 0; b < B; b++) {
    const h1 = L1.out.subarray(b * t * C, (b + 1) * t * C);
    for (let h = 0; h < HEADS; h++) {
      const { Q, K, Vh, a } = att[b][h];
      const dout = new Float64Array(t * HS);
      for (let i = 0; i < t; i++)
        for (let d = 0; d < HS; d++) dout[i * HS + d] = dx2[(b * t + i) * C + h * HS + d];
      const dV = new Float64Array(t * HS), da = new Float64Array(t * t);
      for (let i = 0; i < t; i++)
        for (let j = 0; j <= i; j++) {
          let s = 0;
          for (let d = 0; d < HS; d++) s += dout[i * HS + d] * Vh[j * HS + d];
          da[i * t + j] = s;
          for (let d = 0; d < HS; d++) dV[j * HS + d] += a[i * t + j] * dout[i * HS + d];
        }
      const ds = new Float64Array(t * t);
      for (let i = 0; i < t; i++) {
        let dot = 0;
        for (let j = 0; j <= i; j++) dot += da[i * t + j] * a[i * t + j];
        for (let j = 0; j <= i; j++) ds[i * t + j] = (a[i * t + j] * (da[i * t + j] - dot)) / Math.sqrt(HS);
      }
      const dQ = new Float64Array(t * HS), dK = new Float64Array(t * HS);
      for (let i = 0; i < t; i++)
        for (let j = 0; j <= i; j++) {
          const d = ds[i * t + j];
          if (d === 0) continue;
          for (let e = 0; e < HS; e++) {
            dQ[i * HS + e] += d * K[j * HS + e];
            dK[j * HS + e] += d * Q[i * HS + e];
          }
        }
      mmAT(h1, dQ, t, C, HS, g["Wq" + h]); mmAT(h1, dK, t, C, HS, g["Wk" + h]); mmAT(h1, dV, t, C, HS, g["Wv" + h]);
      const dh1b = dh1.subarray(b * t * C, (b + 1) * t * C);
      mmBT(dQ, p["Wq" + h], t, C, HS, dh1b);
      mmBT(dK, p["Wk" + h], t, C, HS, dh1b);
      mmBT(dV, p["Wv" + h], t, C, HS, dh1b);
    }
  }
  const dx = lnBackward(dh1, L1.xh, L1.s, p.g1, R, g.g1, g.b1);
  for (let i = 0; i < R * C; i++) dx[i] += dx2[i];       // the other residual lane

  for (let r = 0; r < R; r++) {
    const tokRow = idx[r] * C, posRow = (r % t) * C;
    for (let j = 0; j < C; j++) {
      g.tok[tokRow + j] += dx[r * C + j];
      g.pos[posRow + j] += dx[r * C + j];
    }
  }
  return { loss, g };
}

export function sgdStep(p: Params, g: Grads, lr: number) {
  for (const k of Object.keys(p)) {
    const pk = p[k], gk = g[k];
    for (let i = 0; i < pk.length; i++) pk[i] -= lr * gk[i];
  }
}

/** Forward only, single sequence, returns last position's probabilities. */
export function nextProbs(p: Params, ids: number[], V: number, temperature = 1): Float64Array {
  const t = Math.min(ids.length, T);
  const window = ids.slice(-t);
  const R = t;
  const x = new Float64Array(R * C);
  for (let r = 0; r < R; r++)
    for (let j = 0; j < C; j++) x[r * C + j] = p.tok[window[r] * C + j] + p.pos[r * C + j];
  const L1 = lnForward(x, p.g1, p.b1, R);
  const sa = new Float64Array(R * C);
  for (let h = 0; h < HEADS; h++) {
    const Q = new Float64Array(R * HS), K = new Float64Array(R * HS), Vh = new Float64Array(R * HS);
    mm(L1.out, p["Wq" + h], R, C, HS, Q); mm(L1.out, p["Wk" + h], R, C, HS, K); mm(L1.out, p["Wv" + h], R, C, HS, Vh);
    const a = new Float64Array(R * R);
    for (let i = 0; i < R; i++) {
      for (let j = 0; j <= i; j++) {
        let s = 0;
        for (let d = 0; d < HS; d++) s += Q[i * HS + d] * K[j * HS + d];
        a[i * R + j] = s / Math.sqrt(HS);
      }
      for (let j = i + 1; j < R; j++) a[i * R + j] = -Infinity;
    }
    softmaxRows(a, R, R);
    for (let i = 0; i < R; i++)
      for (let d = 0; d < HS; d++) {
        let s = 0;
        for (let j = 0; j <= i; j++) s += a[i * R + j] * Vh[j * HS + d];
        sa[i * C + h * HS + d] = s;
      }
  }
  const x2 = new Float64Array(R * C);
  for (let i = 0; i < R * C; i++) x2[i] = x[i] + sa[i];
  const L2 = lnForward(x2, p.g2, p.b2, R);
  const pre = new Float64Array(R * F);
  mm(L2.out, p.W1, R, C, F, pre);
  for (let i = 0; i < R * F; i++) pre[i] = Math.max(pre[i], 0);
  const ff = new Float64Array(R * C);
  mm(pre, p.W2, R, F, C, ff);
  const x3 = new Float64Array(R * C);
  for (let i = 0; i < R * C; i++) x3[i] = x2[i] + ff[i];
  const L3 = lnForward(x3, p.gf, p.bf, R);
  const z = new Float64Array(V);
  const lastRow = L3.out.subarray((R - 1) * C, R * C);
  for (let j = 0; j < V; j++) {
    let s = 0;
    for (let d = 0; d < C; d++) s += lastRow[d] * p.head[d * V + j];
    z[j] = s / Math.max(temperature, 1e-6);
  }
  softmaxRows(z, 1, V);
  return z;
}
