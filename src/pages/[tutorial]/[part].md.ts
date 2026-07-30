import type { APIRoute, GetStaticPaths } from "astro";
import { getCollection } from "astro:content";

/**
 * The markdown twin of every part: /neural-networks/06-learning.md
 *
 * Defensible regardless of any convention being adopted, because it is just a
 * URL serving clean text. A model fetching this gets the prose without the
 * navigation chrome, the island markup or the stylesheet — and the interactive
 * figures, which it could not run anyway, are named rather than silently
 * dropped, so the gap in the transcript is visible.
 */
export const getStaticPaths: GetStaticPaths = async () => {
  const parts = await getCollection("parts");
  return parts.map((entry) => ({
    params: { tutorial: entry.data.tutorial, part: entry.id.split("/").pop()! },
    props: { entry },
  }));
};

export const GET: APIRoute = async ({ props, site }) => {
  const { entry } = props as {
    entry: Awaited<ReturnType<typeof getCollection<"parts">>>[number];
  };
  const slug = entry.id.split("/").pop();
  const url = `${site?.href.replace(/\/$/, "")}/${entry.data.tutorial}/${slug}/`;

  const prose = entry.body
    ?.replace(/^import .*$/gm, "")
    // Figures cannot be rendered as text; name them so the omission is legible.
    .replace(
      /<div[^>]*><Widget name="([^"]+)"[^>]*\/><\/div>/g,
      "> **[interactive figure: $1]** — needs a browser; see $&".replace(
        "$&",
        url,
      ),
    )
    .replace(/<\/?(?:div|aside|p|span)[^>]*>/g, "")
    // Inline HTML the prose uses for emphasis has a markdown equivalent.
    .replace(/<code>([\s\S]*?)<\/code>/g, "`$1`")
    .replace(/<(?:em|i)>([\s\S]*?)<\/(?:em|i)>/g, "*$1*")
    .replace(/<(?:strong|b)>([\s\S]*?)<\/(?:strong|b)>/g, "**$1**")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const body = [
    `# ${entry.data.title}`,
    "",
    `Part ${entry.data.order} of the tutorial "${entry.data.tutorial}".`,
    `Canonical: ${url}`,
    "",
    entry.data.blurb.replace(/\s+/g, " "),
    "",
    "---",
    "",
    prose ?? "",
    "",
  ].join("\n");

  return new Response(body, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
};
