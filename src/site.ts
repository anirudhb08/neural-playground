/**
 * Who publishes this, in one place.
 *
 * Every canonical, byline and structured-data entity is built from here, so a
 * name or handle is changed once rather than in nine templates.
 */
export const SITE = {
  name: "Neulearn",
  tagline: "tutorials you can run",
  /**
   * The byline, and the Person entity on every part's structured data. Named
   * human authorship is weighed on explanatory technical writing, so this is
   * a real signal rather than decoration.
   */
  author: {
    name: "Anirudh",
    url: "https://x.com/welldunai",
  },
  x: "https://x.com/welldunai",
  xHandle: "@welldunai",
  github: "https://github.com/anirudh-valyx/neural-playground",
} as const;

/** Everything the site claims as the same author, for `sameAs`. */
export const SAME_AS = [SITE.x, SITE.github];
