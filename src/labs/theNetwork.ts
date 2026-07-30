/** The The network part's notebook, shared by its prose and its island. */
import { INPUTS } from "../lib/network";

export const theNetworkTorch = (classes: number) => `import torch.nn as nn

# ${classes} scorecards, ${INPUTS} numbers each
layer = nn.Linear(${INPUTS}, ${classes})

layer.weight   # the scorecards themselves
layer.bias     # each character's head start

scores = layer(drawing)`;

export function theNetworkLab(classes: number) {
  return [
    {
      title: "the scorecards, as numbers",
      lead: `W is every scorecard side by side: ${INPUTS} squares down, ${classes} characters across. b is one extra number per character — a head start added to its total before any ink is counted, so a character can be favoured or held back on its own. Together they are the whole network.`,
      code: `print("W:", W.shape, " that is", W.size, "numbers")
print("b:", b.shape)
print("what hook's scorecard says about the first 4 squares:")
print(W[:4, 0])`,
    },
    {
      title: "one drawing, counted the slow way",
      lead: "This is the loop you just watched: multiply each square's ink by the scorecard's number for that square, and add it all up.",
      code: `drawing = X[0]

for c, name in enumerate(names):
    total = 0.0
    for square in range(${INPUTS}):
        total += drawing[square] * W[square, c]
    total += b[c]
    print(name, "scores", round(float(total), 4))`,
    },
    {
      title: "the same thing, without the loop",
      lead: "Nobody writes that loop. X @ W does the identical arithmetic for every drawing and every character at once — that is all a matrix multiply is.",
      code: `scores = X @ W + b
print("scores:", scores.shape)
print("first drawing:", scores[0])
print("winner:", names[scores[0].argmax()])`,
    },
    {
      title: "how often is it right?",
      lead: "argmax takes the highest score for each drawing. Compare against y and you have the network's report card before it has learned anything.",
      code: `guesses = scores.argmax(axis=1)

print("guessed: ", guesses)
print("actually:", y)
print("right:", int((guesses == y).sum()), "of", len(y))
print("that is", round(float((guesses == y).mean()) * 100), "percent")`,
    },
  ];
}
