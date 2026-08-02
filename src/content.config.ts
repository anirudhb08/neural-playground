import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

/**
 * A publication of long tutorials. Each tutorial is a post; each post is read
 * in ordered parts, because the subjects are sequential — you cannot train on
 * an alphabet before you have drawn one.
 *
 * Two collections rather than nested folders, so a part can be fetched, sorted
 * and linked without loading the tutorial it belongs to.
 */

const tutorials = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "./src/content/tutorials" }),
  schema: z.object({
    title: z.string(),
    /** One line for the index card and the meta description. */
    blurb: z.string(),
    /** What the reader can do at the end that they could not at the start. */
    outcome: z.string(),
    order: z.number(),
    published: z.coerce.date(),
    status: z.enum(["published", "draft"]).default("published"),
    /**
     * A real artefact from this tutorial's own subject, quantised to 256
     * signed integers and drawn as a 16x16 plate. Not decoration: for the
     * neural network it is a trained scorecard, and you can see the letter in
     * it. A tutorial with nothing real to show should show nothing.
     */
    plate: z.array(z.number()).length(256).optional(),
    plateCaption: z.string().optional(),
    /**
     * Parts that are intended but not written, listed so a reader can see where
     * a tutorial is going. Deliberately titles rather than content entries:
     * they generate no page, so there is nothing thin for a search engine to
     * index and no url that promises something it cannot deliver.
     */
    planned: z.array(z.string()).default([]),
  }),
});

const parts = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/parts" }),
  schema: z.object({
    tutorial: z.string(),
    order: z.number(),
    /** What the page calls itself. Short and editorial; it is a headline. */
    title: z.string(),
    /**
     * What the browser tab and the search result call it. The headline "Learning"
     * is right on the page and useless in a result list, so intent lives here
     * instead of being forced into the h1. Falls back to `title`.
     */
    searchTitle: z.string().optional(),
    /** Standalone summary — most readers arrive here from search, not part 1. */
    blurb: z.string(),
    /**
     * Meta description, when the blurb is too short to fill a snippet. Kept
     * separate so lengthening it for search cannot make the index card worse.
     */
    description: z.string().optional(),
    /** Terms this part is the first to demonstrate, for the tutorial index. */
    teaches: z.array(z.string()).default([]),
  }),
});

export const collections = { tutorials, parts };
