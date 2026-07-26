import { GRID } from "../types";

/** Alpha above this counts as ink when finding the drawing's bounding box. */
const INK_THRESHOLD = 8;
/** Cells of blank margin kept around the glyph after centring. */
const MARGIN = 1;

/**
 * How the drawing was cropped and scaled to fill the grid. Keeping this lets
 * the interface point back from any grid cell to the exact patch of the
 * drawing it measured.
 */
export type Placement = {
  minX: number;
  minY: number;
  /** Source pixels per grid cell. */
  scale: number;
  /** Where the glyph starts inside the grid, in cells. */
  offX: number;
  offY: number;
};

export type RasterResult = {
  /** GRID * GRID ink values, row-major, 0-255. */
  pixels: number[];
  placement: Placement | null;
};

const BLANK: RasterResult = {
  pixels: new Array(GRID * GRID).fill(0),
  placement: null,
};

const blank = (): RasterResult => ({ ...BLANK, pixels: [...BLANK.pixels] });

/**
 * Reduce a drawing to GRID x GRID ink values.
 *
 * The glyph is cropped to its bounding box, scaled to fill the grid, and
 * centred — so "small and low-left" and "big and centred" versions of the
 * same character reach the network as the same shape.
 */
export function rasterize(source: HTMLCanvasElement): RasterResult {
  const ctx = source.getContext("2d", { willReadFrequently: true });
  if (!ctx) return blank();

  const { width: w, height: h } = source;
  const data = ctx.getImageData(0, 0, w, h).data;

  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > INK_THRESHOLD) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0) return blank();

  const boxW = maxX - minX + 1;
  const boxH = maxY - minY + 1;
  const target = GRID - MARGIN * 2;
  const cellsPerSourcePixel = target / Math.max(boxW, boxH);
  const drawW = boxW * cellsPerSourcePixel;
  const drawH = boxH * cellsPerSourcePixel;
  const offX = (GRID - drawW) / 2;
  const offY = (GRID - drawH) / 2;

  // Downscaling ~300px straight to 16px aliases badly in most browsers, so
  // step down through an intermediate size first.
  const midSize = GRID * 4;
  const mid = document.createElement("canvas");
  mid.width = midSize;
  mid.height = midSize;
  const midCtx = mid.getContext("2d", { willReadFrequently: true });
  if (!midCtx) return blank();
  midCtx.imageSmoothingEnabled = true;
  midCtx.imageSmoothingQuality = "high";
  midCtx.drawImage(
    source,
    minX,
    minY,
    boxW,
    boxH,
    offX * 4,
    offY * 4,
    drawW * 4,
    drawH * 4,
  );

  const out = document.createElement("canvas");
  out.width = GRID;
  out.height = GRID;
  const outCtx = out.getContext("2d", { willReadFrequently: true });
  if (!outCtx) return blank();
  outCtx.imageSmoothingEnabled = true;
  outCtx.imageSmoothingQuality = "high";
  outCtx.drawImage(mid, 0, 0, midSize, midSize, 0, 0, GRID, GRID);

  const raw = outCtx.getImageData(0, 0, GRID, GRID).data;
  const pixels: number[] = new Array(GRID * GRID);
  for (let i = 0; i < GRID * GRID; i++) {
    pixels[i] = raw[i * 4 + 3];
  }

  return {
    pixels,
    placement: { minX, minY, scale: 1 / cellsPerSourcePixel, offX, offY },
  };
}

/** The patch of the source drawing that a given grid cell measured. */
export function cellToSourceRect(
  placement: Placement,
  row: number,
  col: number,
) {
  const { minX, minY, scale, offX, offY } = placement;
  return {
    x: minX + (col - offX) * scale,
    y: minY + (row - offY) * scale,
    width: scale,
    height: scale,
  };
}

export function isBlank(pixels: number[]): boolean {
  return pixels.every((value) => value === 0);
}
