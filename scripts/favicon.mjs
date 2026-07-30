import { readFile, writeFile, readdir } from "node:fs/promises";
import { Resvg } from "@resvg/resvg-js";
import { parse } from "yaml";

/**
 * The favicon is the plate mark, and the fit is exact: a trained scorecard is
 * 16 by 16, which is a favicon's native resolution. One weight, one pixel.
 *
 * It is the first tutorial's real trained weights, so the tab icon is the thing
 * the site teaches you to produce rather than a logo standing in for it.
 */

const PLOT_LIGHT = "#2e6a5c";
const RISO_LIGHT = "#ed3f72";
const PAPER_LIGHT = "#f2f3ed";
const PLOT_DARK = "#5fa393";
const RISO_DARK = "#ff5183";
const PAPER_DARK = "#1a221e";

/**
 * Near-binary, not a gamma curve.
 *
 * The page can afford a soft ramp because it draws the plate at 100 pixels. At
 * 16 the same ramp is a grey smear: a weight at two thirds of peak lands around
 * a quarter opacity and disappears. So everything below FLOOR is dropped and
 * everything above CEIL is drawn solid, which leaves the letterform the network
 * actually found and nothing else.
 */
const FLOOR = 0.34;
const CEIL = 0.7;
const ramp = (mag) =>
  Math.max(0, Math.min(1, (mag - FLOOR) / (CEIL - FLOOR)));

function cells(plate, plot, riso) {
  const peak = Math.max(...plate.map(Math.abs), 1);
  const out = [];
  for (let i = 0; i < plate.length; i++) {
    const v = plate[i];
    const alpha = ramp(Math.abs(v) / peak);
    if (alpha === 0) continue; // nothing to draw, and it keeps the file small
    out.push(
      `<rect x="${i % 16}" y="${Math.floor(i / 16)}" width="1" height="1" ` +
        `fill="${v >= 0 ? plot : riso}" opacity="${alpha.toFixed(3)}"/>`,
    );
  }
  return out.join("");
}

/** Scalable, and it follows the reader's theme where the browser allows it. */
function svg(plate) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
<style>
  .ground { fill: ${PAPER_LIGHT} }
  .light { display: block } .dark { display: none }
  @media (prefers-color-scheme: dark) {
    .ground { fill: ${PAPER_DARK} }
    .light { display: none } .dark { display: block }
  }
</style>
<rect class="ground" width="16" height="16"/>
<g class="light">${cells(plate, PLOT_LIGHT, RISO_LIGHT)}</g>
<g class="dark">${cells(plate, PLOT_DARK, RISO_DARK)}</g>
</svg>`;
}

/** Flat, for the raster sizes — a PNG cannot switch with the theme anyway. */
function flat(plate, pad = 0) {
  const size = 16 + pad * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
<rect width="${size}" height="${size}" fill="${PAPER_LIGHT}"/>
<g transform="translate(${pad} ${pad})">${cells(plate, PLOT_LIGHT, RISO_LIGHT)}</g>
</svg>`;
}

const png = (markup, width) =>
  new Resvg(markup, { fitTo: { mode: "width", value: width } }).render().asPng();

const dir = "src/content/tutorials";
const first = (await readdir(dir)).sort()[0];
const { plate } = parse(await readFile(`${dir}/${first}`, "utf8"));
if (!plate) throw new Error(`${first} has no plate to build a favicon from`);

await writeFile("public/favicon.svg", svg(plate));
await writeFile("public/favicon-32.png", png(flat(plate), 32));
await writeFile("public/favicon-180.png", png(flat(plate), 180));
// Home-screen icons get rounded off, so this one keeps a margin.
await writeFile("public/apple-touch-icon.png", png(flat(plate, 2), 180));

console.log("favicon: svg + 32, 180 and apple-touch from", first);
