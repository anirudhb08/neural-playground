import { GRID, type Dataset, type Glyph, type Specimen } from "../types";
import { rasterize } from "./raster";

/** Matches the drawing canvas, so samples travel the identical pipeline. */
const CANVAS = 300;

type Point = [number, number];
type Design = { label: string; strokes: Point[][] };

/**
 * Three invented marks, distinct enough to tell apart but not so distinct that
 * the later stages become trivial. Coordinates are fractions of the canvas.
 */
const DESIGNS: Design[] = [
  {
    label: "hook",
    strokes: [
      [
        [0.36, 0.18],
        [0.35, 0.5],
        [0.37, 0.74],
        [0.72, 0.75],
      ],
    ],
  },
  {
    label: "arch",
    strokes: [
      [
        [0.24, 0.79],
        [0.25, 0.46],
        [0.5, 0.24],
        [0.75, 0.46],
        [0.76, 0.79],
      ],
    ],
  },
  {
    label: "cross",
    strokes: [
      [
        [0.28, 0.26],
        [0.72, 0.74],
      ],
      [
        [0.72, 0.26],
        [0.28, 0.74],
      ],
    ],
  },
];

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Draws one wobbly instance of a design. The point of the wobble is that no
 * two come out the same — the later stages have nothing to teach if every
 * drawing of a character is identical.
 */
function render(
  ctx: CanvasRenderingContext2D,
  design: Design,
  random: () => number,
) {
  const spread = (amount: number) => (random() - 0.5) * 2 * amount;

  ctx.clearRect(0, 0, CANVAS, CANVAS);
  ctx.save();
  ctx.translate(CANVAS / 2 + spread(18), CANVAS / 2 + spread(18));
  ctx.rotate(spread(0.18));
  const scale = 0.85 + random() * 0.25;
  ctx.scale(scale, scale);
  ctx.translate(-CANVAS / 2, -CANVAS / 2);

  ctx.strokeStyle = "#15201b";
  ctx.lineWidth = 17 + random() * 9;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (const stroke of design.strokes) {
    ctx.beginPath();
    stroke.forEach(([x, y], i) => {
      const px = (x + spread(0.022)) * CANVAS;
      const py = (y + spread(0.022)) * CANVAS;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * A ready-made alphabet, drawn on the fly rather than shipped as data, so it
 * goes through exactly the same cropping and scaling as anything hand-drawn.
 */
export function buildSampleDataset(perCharacter = 8): Dataset {
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS;
  canvas.height = CANVAS;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { glyphs: [], specimens: [] };

  const random = mulberry32(2718);
  const glyphs: Glyph[] = [];
  const specimens: Specimen[] = [];

  for (const design of DESIGNS) {
    const glyph: Glyph = { id: crypto.randomUUID(), label: design.label };
    glyphs.push(glyph);
    for (let i = 0; i < perCharacter; i++) {
      render(ctx, design, random);
      const { pixels } = rasterize(canvas);
      if (pixels.length !== GRID * GRID) continue;
      specimens.push({
        id: crypto.randomUUID(),
        glyphId: glyph.id,
        pixels,
        createdAt: Date.now(),
      });
    }
  }

  return { glyphs, specimens };
}
