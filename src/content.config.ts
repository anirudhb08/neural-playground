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
  }),
});

const parts = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/parts" }),
  schema: z.object({
    tutorial: z.string(),
    order: z.number(),
    title: z.string(),
    /** Standalone summary — most readers arrive here from search, not part 1. */
    blurb: z.string(),
    /** Terms this part is the first to demonstrate, for the tutorial index. */
    teaches: z.array(z.string()).default([]),
  }),
});

export const collections = { tutorials, parts };
