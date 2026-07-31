/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_NEWSLETTER_ACTION?: string;
  readonly PUBLIC_NEWSLETTER_FIELD?: string;
  readonly PUBLIC_POSTHOG_KEY?: string;
  readonly PUBLIC_POSTHOG_HOST?: string;
  readonly PUBLIC_CF_ANALYTICS_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
