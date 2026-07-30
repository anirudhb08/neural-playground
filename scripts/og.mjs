import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { parse } from "yaml";

/**
 * One social card per page, generated at build time.
 *
 * A single shared og.jpg means every link anyone shares says the same thing,
 * whichever part it points at. These are the site's own materials — the plate
 * mark, the palette, the three faces — so a card is recognisably from here
 * before the title is read.
 *
 * Run by `pnpm build` before astro, writing straight into public/og/.
 */

const PAPER = "#e7e9e1";
const RAISED = "#f2f3ed";
const INK = "#15201b";
const PLOT = "#2e6a5c";
const RISO = "#ed3f72";
const GRAPHITE = "#77806f";

/** Kept in step with SITE.wordmark in src/site.ts. */
const WORDMARK = "Learn. Well dun.";

const fonts = [
  { name: "Archivo", data: await readFile("scripts/fonts/Archivo-800.ttf"), weight: 800, style: "normal" },
  { name: "Instrument Sans", data: await readFile("scripts/fonts/InstrumentSans-400.ttf"), weight: 400, style: "normal" },
  { name: "IBM Plex Mono", data: await readFile("scripts/fonts/IBMPlexMono-500.ttf"), weight: 500, style: "normal" },
];

/** The 16x16 plate, same contrast curve the site uses so they match. */
function plate(values, cell) {
  if (!values) return null;
  const peak = Math.max(...values.map(Math.abs), 1);
  return {
    type: "div",
    props: {
      style: { display: "flex", flexWrap: "wrap", width: cell * 16, height: cell * 16 },
      children: values.map((v) => ({
        type: "div",
        props: {
          style: {
            width: cell,
            height: cell,
            backgroundColor: v >= 0 ? PLOT : RISO,
            opacity: Math.pow(Math.abs(v) / peak, 1.7),
          },
        },
      })),
    },
  };
}

const text = (content, style) => ({ type: "div", props: { style, children: content } });

/**
 * Trim to fit without cutting a word in half.
 *
 * Prefers ending on a full stop — a card that ends mid-sentence with an
 * ellipsis reads as broken, whereas one complete sentence reads as deliberate.
 */
function fit(s, limit) {
  const flat = s.trim().split(/\s+/).join(" ");
  if (flat.length <= limit) return flat;
  const head = flat.slice(0, limit);
  const stop = head.lastIndexOf(". ");
  if (stop > limit * 0.5) return head.slice(0, stop + 1);
  return head.slice(0, head.lastIndexOf(" ")) + "…";
}

function card({ eyebrow, title, blurb, values }) {
  return {
    type: "div",
    props: {
      style: {
        width: 1200,
        height: 630,
        display: "flex",
        backgroundColor: PAPER,
        fontFamily: "Instrument Sans",
        padding: 64,
        alignItems: "center",
        gap: 56,
      },
      children: [
        {
          type: "div",
          props: {
            style: { display: "flex", flexDirection: "column", flex: 1, height: "100%", justifyContent: "space-between" },
            children: [
              text(eyebrow, {
                fontFamily: "IBM Plex Mono", fontSize: 22, letterSpacing: 3,
                textTransform: "uppercase", color: RISO, display: "flex",
              }),
              {
                type: "div",
                props: {
                  style: { display: "flex", flexDirection: "column", gap: 22 },
                  children: [
                    text(title, {
                      fontFamily: "Archivo", fontWeight: 800, fontSize: title.length > 46 ? 58 : 68,
                      lineHeight: 1.06, letterSpacing: -2, color: INK, display: "flex",
                    }),
                    text(blurb, { fontSize: 26, lineHeight: 1.45, color: GRAPHITE, display: "flex" }),
                  ],
                },
              },
              text("learn.welldun.ai", {
                fontFamily: "IBM Plex Mono", fontSize: 22, color: PLOT, display: "flex",
              }),
            ],
          },
        },
        {
          type: "div",
          props: {
            style: { display: "flex", padding: 18, backgroundColor: RAISED, border: `1px solid ${PLOT}44` },
            children: [plate(values, 26)],
          },
        },
      ].filter(Boolean),
    },
  };
}

async function render(spec, out) {
  const svg = await satori(card(spec), { width: 1200, height: 630, fonts });
  const png = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } }).render().asPng();
  await writeFile(out, png);
  return png.length;
}

// ---- content ----------------------------------------------------------

const tutorialDir = "src/content/tutorials";
const partsDir = "src/content/parts";
const outDir = "public/og";
if (!existsSync(outDir)) await mkdir(outDir, { recursive: true });

const frontmatter = (raw) => parse(raw.split("---")[1]);

let count = 0;
for (const file of await readdir(tutorialDir)) {
  const slug = file.replace(/\.yaml$/, "");
  const t = parse(await readFile(`${tutorialDir}/${file}`, "utf8"));

  count += await render(
    { eyebrow: WORDMARK, title: t.title, blurb: fit(t.blurb, 150), values: t.plate },
    `${outDir}/${slug}.png`,
  ) && 1;

  const parts = (await readdir(`${partsDir}/${slug}`)).filter((f) => f.endsWith(".mdx")).sort();
  for (const p of parts) {
    const d = frontmatter(await readFile(`${partsDir}/${slug}/${p}`, "utf8"));
    await render(
      {
        eyebrow: `Part ${String(d.order).padStart(2, "0")} of ${parts.length} · ${WORDMARK}`,
        title: d.searchTitle ?? d.title,
        blurb: fit(d.description ?? d.blurb, 150),
        values: t.plate,
      },
      `${outDir}/${slug}-${p.replace(/\.mdx$/, "")}.png`,
    );
    count++;
  }
}

// The index card carries no tutorial's plate — it is not about one of them.
await render(
  {
    eyebrow: "learn.welldun.ai",
    title: "Tutorials you can run",
    blurb: "Long, interactive explanations of how machine learning actually works. Every number visible, all of it in your browser.",
  },
  `${outDir}/index.png`,
);
count++;

console.log(`og: ${count} cards written to ${outDir}/`);
