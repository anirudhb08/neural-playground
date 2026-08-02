/**
 * A small corpus for the figures on part one, written for the purpose so that
 * nothing here depends on someone else's licence.
 *
 * Fifteen hundred characters is far too little to build anything with, and that
 * is useful: it is small enough that the sparsity problem shows up immediately
 * rather than being something a reader has to take on trust. The figure states
 * the size on screen, so the smallness is part of the exhibit rather than a
 * weakness of it.
 */
export const CORPUS = `the cat sat on the mat and watched the rain come down the window in long slow lines. it had been raining since the morning and the garden had gone soft and dark. the cat did not mind the rain so long as it was on the other side of the glass. it liked to watch things move.

a language model does something not so different. it watches what has come before and works out what is likely to come next. given the letters t and h it will guess e, because in this language the letters t and h are followed by e more often than by anything else. given a longer run of letters it can do better, because more of the sentence is available to it and the number of things that could sensibly follow has shrunk.

the difficulty is that language has structure at every scale at once. letters make words, words make phrases, phrases carry meaning, and the meaning of a sentence can depend on a word that appeared much earlier. a model that looks only at the last letter can spell nothing. a model that looks at the last word can spell but cannot follow an argument. a model that looks at the whole page can do rather more than either, and the question of how to look at the whole page without drowning in it is the question this tutorial answers.

it is worth saying plainly that the task never changes. the model that finishes your text message and the model that writes an essay are doing the same thing, over and over, one symbol at a time. what separates them is how far back they can see and how well they judge which of the things they can see actually matters.`;

/** Every character the corpus contains, in a stable order. */
export const CORPUS_CHARS = [...new Set(CORPUS.split(""))].sort();

/**
 * How many distinct characters followed this exact run of text, anywhere in the
 * corpus, and how many times the run occurred at all.
 *
 * The second number is the one that matters, and the two move together rather
 * than in sequence: every character that narrows the answer also cuts the
 * evidence, and the evidence runs out first. That is the whole reason a lookup
 * table cannot be the model and something that generalises has to be.
 */
export function followers(context: string): {
  occurrences: number;
  next: Map<string, number>;
} {
  const next = new Map<string, number>();
  let occurrences = 0;
  if (!context) return { occurrences, next };

  let from = 0;
  for (;;) {
    const at = CORPUS.indexOf(context, from);
    if (at === -1) break;
    occurrences += 1;
    const after = CORPUS[at + context.length];
    if (after !== undefined) next.set(after, (next.get(after) ?? 0) + 1);
    from = at + 1;
  }
  return { occurrences, next };
}
