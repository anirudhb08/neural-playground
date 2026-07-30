import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

/**
 * Refreshes the TrueType the card generator needs. Not part of the build.
 *
 * The three files are committed under scripts/fonts, so a deploy never depends
 * on a third-party API being up — a build that reaches out to fonts.googleapis
 * fails for reasons that have nothing to do with the commit being built. Run
 * this by hand if a face ever changes.
 *
 * A bare "Mozilla/5.0" is what makes the API answer with truetype; a modern
 * agent gets woff2, which satori cannot read, and an ancient one gets EOT.
 */
const UA = "Mozilla/5.0";
const API =
  "https://fonts.googleapis.com/css?family=Archivo:800|Instrument+Sans:400|IBM+Plex+Mono:500";
const DIR = "scripts/fonts";

if (!existsSync(DIR)) await mkdir(DIR, { recursive: true });

const css = await (await fetch(API, { headers: { "User-Agent": UA } })).text();
for (const [, family, weight, url] of css.matchAll(
  /font-family: '([^']+)';[\s\S]*?font-weight: (\d+);[\s\S]*?src: url\((https:\/\/[^)]+)\)/g,
)) {
  const path = `${DIR}/${family.replaceAll(" ", "")}-${weight}.ttf`;
  const buf = Buffer.from(
    await (await fetch(url, { headers: { "User-Agent": UA } })).arrayBuffer(),
  );
  if (buf.subarray(0, 4).toString("hex") !== "00010000") {
    throw new Error(`${path}: not TrueType — the API answered with another format`);
  }
  await writeFile(path, buf);
  console.log(`fonts: ${path} (${Math.round(buf.length / 1024)} kB)`);
}
