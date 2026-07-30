/**
 * Who publishes this, in one place.
 *
 * Every canonical, byline and structured-data entity is built from here, so a
 * name or handle is changed once rather than in nine templates.
 */
export const SITE = {
  /**
   * The wordmark, set in the rail. It reads the address aloud —
   * learn.welldun.ai — so the mark and the URL teach each other.
   */
  wordmark: "Learn. Well dun.",
  /** What the publication is called in titles and og:site_name. */
  name: "Welldun",
  tagline: "tutorials you can run",
  /** The organisation credited as publisher in structured data. */
  org: {
    name: "Welldun",
    url: "https://welldun.ai",
  },
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
