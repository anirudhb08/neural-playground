/** The Into numbers part's notebook, shared by its prose and its island. */
import { GRID } from "../types";
import { INPUTS } from "../lib/network";

const SIZE = INPUTS;

export function intoNumbersLab(count: number) {
  return [
    {
      title: "what actually arrived",
      lead: `Your drawings reach Python as one long line of ink values — all ${count} of them laid end to end, with nothing marking where one drawing stops and the next begins.`,
      code: `len(drawings)`,
    },
    {
      title: "a look at the raw values",
      lead: "These are the numbers themselves. Long stretches of 0 are the blank paper around your mark.",
      code: `drawings[:20]`,
    },
    {
      title: "reshape — deciding where to cut the line",
      lead: `This is the step worth slowing down on. reshape does not change a single number, and it does not throw anything away. It only decides where that one long line gets cut into rows. Ask for ${count} rows of ${SIZE} and your drawings come back, one per row.`,
      code: `import numpy as np

flat = np.array(drawings, dtype=np.float32)
print("one long line:", flat.shape)

X = flat.reshape(len(labels), ${SIZE})
print("cut into rows:", X.shape)
print("still the same amount of numbers:", flat.size, "vs", X.size)`,
    },
    {
      title: "one row is one drawing",
      lead: `Row 0 is your first drawing, flattened: the top row of the grid, then the next, and so on, ${GRID} squares at a time.`,
      code: `print("numbers in row 0:", X[0].shape)
print("darkest square in it:", X[0].max())
print("its first ${GRID} values (the top row of the grid):")
print(X[0][:${GRID}])`,
    },
    {
      title: "squeezing 0-255 down to 0-1",
      lead: "Networks behave badly when their inputs are large. Dividing every value by 255 keeps the picture identical and just changes the units — 128 becomes roughly 0.5.",
      code: `X = X / 255.0
print("now runs from", X.min(), "to", X.max())`,
    },
    {
      title: "the answer key",
      lead: "X is what the network will look at. y is what it will be marked against — one number per row, saying which character that row really is.",
      code: `y = np.array(labels, dtype=np.int32)
print("y:", y)
print("names:", names)
print("X is", X.shape, "and y is", y.shape)`,
    },
  ];
}
