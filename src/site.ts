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

  /**
   * Where the subscribe form posts. Any provider that accepts a plain form
   * POST works — Buttondown, Kit, MailerLite — so this stays a URL rather than
   * an SDK, and the site keeps no backend and no list of its own.
   *
   * Empty means the form is not rendered at all. A form that silently drops
   * addresses is worse than no form.
   */
  newsletter: {
    action: "https://app.kit.com/forms/9748100/subscriptions",
    /**
     * The field name the provider expects, which is not the same everywhere:
     * Buttondown and MailerLite take `email`, Kit and EmailOctopus take
     * `email_address`. Copy it from the provider's own raw-HTML embed rather
     * than guessing — a wrong name posts successfully and subscribes nobody.
     */
    field: "email_address",
  },

  /**
   * Cloudflare Web Analytics token. Cookieless, no per-visitor identity, so it
   * needs no consent banner — which is why it is the one that fits a site that
   * promises to keep out of the reader's way.
   *
   * Empty means no script is sent. Pages can also inject this from the
   * dashboard, in which case leave it empty and let Cloudflare do it.
   */
  analyticsToken: "",
} as const;

/** Everything the site claims as the same author, for `sameAs`. */
export const SAME_AS = [SITE.x, SITE.github];
