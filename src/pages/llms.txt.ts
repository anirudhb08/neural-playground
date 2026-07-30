import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

/**
 * A plain-text index of the site for language models.
 *
 * A proposed convention rather than a standard — nothing is obliged to read
 * it. It costs one build-time route, and unlike the sitemap it says what each
 * page is *for*, which is the part a model needs to decide whether to fetch.
 */
export const GET: APIRoute = async ({ site }) => {
  const base = site?.href.replace(/\/$/, "") ?? "";
  const tutorials = (await getCollection("tutorials"))
    .filter((t) => t.data.status === "published")
    .sort((a, b) => a.data.order - b.data.order);
  const parts = (await getCollection("parts")).sort(
    (a, b) => a.data.order - b.data.order,
  );

  const lines = [
    "# Neulearn",
    "",
    "> Long, interactive tutorials on how machine learning actually works.",
    "> Every one runs in the browser with every number visible, nothing hidden",
    "> behind a library, and every term demonstrated before it is named.",
    "",
    "Free to read, no account, no paywall. Append `.md` to any page URL for",
    "clean markdown of that page.",
    "",
  ];

  for (const t of tutorials) {
    lines.push(`## ${t.data.title}`, "");
    lines.push(`${base}/${t.id}/ — ${t.data.blurb.replace(/\s+/g, " ")}`, "");
    for (const p of parts.filter((p) => p.data.tutorial === t.id)) {
      const slug = p.id.split("/").pop();
      lines.push(
        `- [${p.data.title}](${base}/${t.id}/${slug}/): ${p.data.blurb.replace(/\s+/g, " ")}`,
      );
    }
    lines.push("");
  }

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
