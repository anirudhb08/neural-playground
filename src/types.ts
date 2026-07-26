/** Every drawing is reduced to a GRID x GRID square of ink values, 0-255. */
export const GRID = 16;

export type Glyph = {
  id: string;
  /**
   * What the inventor calls it. There is deliberately no typed symbol — an
   * invented character has no key on any keyboard, so its drawings are the
   * only thing that represents it.
   */
  label: string;
};

export type Specimen = {
  id: string;
  glyphId: string;
  /** GRID * GRID ink values, row-major, 0 (blank) to 255 (solid). */
  pixels: number[];
  createdAt: number;
};

export type Dataset = {
  glyphs: Glyph[];
  specimens: Specimen[];
};

export const EMPTY_DATASET: Dataset = { glyphs: [], specimens: [] };
