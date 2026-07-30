import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwind from "@tailwindcss/vite";

export default defineConfig({
  site: "https://learn.welldun.ai",
  integrations: [mdx(), react(), sitemap()],
  vite: { plugins: [tailwind()] },
});
