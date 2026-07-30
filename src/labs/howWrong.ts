/** The How wrong is it? part's notebook, shared by its prose and its island. */

export const howWrongLab = [
  {
    title: "scores are not answers",
    lead: "One drawing's scores, converted by hand. Raise e to the power of each one so they are all positive, add those up, then divide each by that total. Nothing else happens.",
    code: `import numpy as np

scores = X @ W + b
row = scores[0]
print("raw scores: ", np.round(row, 3))

lifted = np.exp(row)              # e to the power of each score
total = lifted.sum()

print("e^score:    ", np.round(lifted, 3))
print("their total:", round(float(total), 3))

shares = lifted / total
print("as shares:  ", np.round(shares, 3))
print("summing to: ", round(float(shares.sum()), 3))`,
  },
  {
    title: "why the real version subtracts the biggest score",
    lead: "Adding the same amount to every score cannot change the shares. That is fortunate, because exp() runs out of room quickly, and subtracting the largest score first is what keeps it in range. The last two lines are what that is protecting you from.",
    code: `bumped = np.exp(row + 100)
print("shares after +100:", np.round(bumped / bumped.sum(), 3))
print("identical to before:", np.allclose(bumped / bumped.sum(), shares))

# So: subtract the largest score first. Same answer, nothing enormous.
safe = np.exp(row - row.max())
print("shares, safely:   ", np.round(safe / safe.sum(), 3))

# Here is what that is protecting you from.
print("e^800 is", np.exp(800.0))

lost = np.exp(row + 800)
print("shares without it:", lost / lost.sum())`,
  },
  {
    title: "the same thing for every drawing at once",
    lead: "Both moves again, on all your drawings in one go, with the max subtracted for the reason above. keepdims=True is the only fiddly part: it keeps the result shaped so NumPy divides each row by its own total rather than by one number.",
    code: `lifted = np.exp(scores - scores.max(axis=1, keepdims=True))
P = lifted / lifted.sum(axis=1, keepdims=True)

print("P:", P.shape)
print("every row sums to 1:", np.allclose(P.sum(axis=1), 1))
print("first drawing:", P[0])`,
  },
  {
    title: "how much did it believe the right answer?",
    lead: "y says which character each drawing really is. This picks out, for every drawing, the share the network gave to that answer — and ignores the rest.",
    code: `truth = P[np.arange(len(y)), y]

print("belief in the right answer, per drawing:")
print(np.round(truth, 3))
print("worst:", round(float(truth.min()), 3))
print("best: ", round(float(truth.max()), 3))`,
  },
  {
    title: "one number for the whole set",
    lead: "Take the cost of each drawing, then average. A network that knows nothing lands on log(number of characters). That is the number to beat.",
    code: `cost = -np.log(truth)
loss = cost.mean()

print("cost per drawing:", np.round(cost, 3))
print("loss:", round(float(loss), 4))
print("a network that knows nothing:", round(float(np.log(len(names))), 4))`,
  },
];
