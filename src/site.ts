/**
 * Who publishes this, in one place.
 *
 * The analytics key and the form endpoint are committed on purpose. Both have
 * to reach the browser to do anything, so they sit in the built HTML whatever
 * is done with them — they are write-only ingest identifiers, not credentials,
 * and nothing can be read with one. Committing them means a fresh clone works
 * and a deploy cannot half-succeed with the subscribe form silently missing.
 *
 * Each can still be overridden by a PUBLIC_ environment variable, which is
 * what a preview deployment pointing at a separate project would use.
 *
 * A value that genuinely must stay secret cannot be PUBLIC_, and cannot live
 * in a static site at all; it needs a server.
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
    action:
      import.meta.env.PUBLIC_NEWSLETTER_ACTION ??
      "https://app.kit.com/forms/9748100/subscriptions",
    /**
     * The field name the provider expects, which is not the same everywhere:
     * Buttondown and MailerLite take `email`, Kit and EmailOctopus take
     * `email_address`. Copy it from the provider's own raw-HTML embed rather
     * than guessing — a wrong name posts successfully and subscribes nobody.
     */
    field: import.meta.env.PUBLIC_NEWSLETTER_FIELD ?? "email_address",
  },

  /**
   * Cloudflare Web Analytics token. Counts page views and nothing else.
   *
   * Redundant if PostHog is on — pick one rather than paying for two
   * third-party requests on every page. Empty means no script is sent.
   */
  analyticsToken: import.meta.env.PUBLIC_CF_ANALYTICS_TOKEN ?? "",

  /**
   * PostHog, deliberately configured so that nothing persists.
   *
   * The site promises no cookie and no per-visitor record, and that promise is
   * worth more than cross-session funnels — so persistence is memory-only,
   * profiles are never created for anonymous readers, and session replay is
   * off. Nothing survives the tab closing, which is exactly why no consent
   * banner is owed.
   *
   * Autocapture is off too. It is not a privacy matter: the figures here are
   * grids of 256 clickable cells, and recording every click would bury the
   * three events that answer anything under a landslide of noise.
   *
   * Empty key means no script is sent at all.
   */
  posthog: {
    key:
      import.meta.env.PUBLIC_POSTHOG_KEY ??
      "phc_sue9jZjMfAJhyUUkLVKG68uFWDsaaRRuQcAiwBdHUx3Y",
    /** us.i.posthog.com or eu.i.posthog.com — must match the project region,
     * because the wrong one accepts the request and drops the event. */
    host: import.meta.env.PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
  },
} as const;

/** Everything the site claims as the same author, for `sameAs`. */
export const SAME_AS = [SITE.x, SITE.github];
