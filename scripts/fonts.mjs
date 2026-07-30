import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

/**
 * TrueType for the card generator, fetched on demand.
 *
 * satori cannot read woff2, and these are build-only, so they are not
 * committed. A bare "Mozilla/5.0" is what makes the Google Fonts API answer
 * with truetype rather than woff2 or — with a very old agent — EOT.
 */
const UA = "Mozilla/5.0";
const API =
  "https://fonts.googleapis.com/css?family=Archivo:800|Instrument+Sans:400|IBM+Plex+Mono:500";

if (!existsSync(".fonts")) await mkdir(".fonts");

const css = await (await fetch(API, { headers: { "User-Agent": UA } })).text();
const faces = [
  ...css.matchAll(
    /font-family: '([^']+)';[\s\S]*?font-weight: (\d+);[\s\S]*?src: url\((https:\/\/[^)]+)\)/g,
  ),
];

for (const [, family, weight, url] of faces) {
  const path = `.fonts/${family.replaceAll(" ", "")}-${weight}.ttf`;
  if (existsSync(path)) continue;
  const buf = Buffer.from(
    await (await fetch(url, { headers: { "User-Agent": UA } })).arrayBuffer(),
  );
  if (buf.subarray(0, 4).toString("hex") !== "00010000") {
    throw new Error(`${path}: not TrueType — the API answered with another format`);
  }
  await writeFile(path, buf);
  console.log(`fonts: ${path} (${Math.round(buf.length / 1024)} kB)`);
}
