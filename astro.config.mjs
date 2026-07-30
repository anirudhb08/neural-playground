import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwind from "@tailwindcss/vite";

export default defineConfig({
  site: "https://learn.welldun.ai",
  integrations: [
    mdx(),
    react(),
    // The 404 is a real route, so it is prerendered — but it is not a page
    // anyone should be sent to from a search result.
    sitemap({ filter: (page) => !page.endsWith("/404") }),
  ],
  vite: { plugins: [tailwind()] },
});
