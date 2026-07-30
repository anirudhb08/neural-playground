import { GRID } from "../types";

type Common = {
  /** Square to ring, if any. */
  highlight?: number | null;
  /** Squares already visited, drawn dimmer than the ones still to come. */
  upTo?: number | null;
  className?: string;
};

function cellRing(isCursor: boolean, seen: boolean) {
  if (isCursor) return "inset 0 0 0 2px var(--color-riso)";
  return seen
    ? undefined
    : "inset 0 0 0 999px color-mix(in srgb, var(--color-paper) 62%, transparent)";
}

/** A drawing: how much ink is in each square. */
export function InkGrid({
  pixels,
  highlight = null,
  upTo = null,
  onPick,
  className = "",
}: Common & {
  pixels: number[];
  /** Makes every square clickable, for pages that work one out at a time. */
  onPick?: (index: number) => void;
}) {
  return (
    <div
      className={`grid w-full gap-px border bg-plot/20 hairline ${className}`}
      style={{ gridTemplateColumns: `repeat(${GRID}, minmax(0, 1fr))` }}
    >
      {pixels.map((value, i) => (
        <div
          key={i}
          role={onPick ? "button" : undefined}
          tabIndex={onPick ? -1 : undefined}
          onClick={onPick ? () => onPick(i) : undefined}
          title={onPick ? `square ${i}: ink ${(value / 255).toFixed(4)}` : undefined}
          className={`aspect-square ${onPick ? "cursor-pointer" : ""}`}
          style={{
            backgroundColor: `color-mix(in srgb, var(--color-plot) ${(value / 255) * 100}%, var(--color-paper-raised))`,
            boxShadow: cellRing(i === highlight, upTo === null || i < upTo),
          }}
        />
      ))}
    </div>
  );
}

/**
 * One character's scorecard: what each square is worth to it.
 * Teal counts for the character, pink counts against, white is indifferent.
 */
export function WeightMap({
  weights,
  scale,
  highlight = null,
  upTo = null,
  onPick,
  className = "",
}: Common & {
  weights: number[];
  scale?: number;
  /** Makes every square clickable, for pages that let you edit one. */
  onPick?: (index: number) => void;
}) {
  const range = scale ?? Math.max(...weights.map(Math.abs)) ?? 1;

  return (
    <div
      className={`grid w-full gap-px border bg-plot/20 hairline ${className}`}
      style={{ gridTemplateColumns: `repeat(${GRID}, minmax(0, 1fr))` }}
    >
      {weights.map((weight, i) => (
        <div
          key={i}
          role={onPick ? "button" : undefined}
          tabIndex={onPick ? -1 : undefined}
          onClick={onPick ? () => onPick(i) : undefined}
          title={onPick ? `square ${i}: ${weight.toFixed(4)}` : undefined}
          className={`aspect-square ${onPick ? "cursor-pointer" : ""}`}
          style={{
            backgroundColor: `color-mix(in srgb, ${
              weight >= 0 ? "var(--color-plot)" : "var(--color-riso)"
            } ${(Math.abs(weight) / (range || 1)) * 100}%, var(--color-paper-raised))`,
            boxShadow: cellRing(i === highlight, upTo === null || i < upTo),
          }}
        />
      ))}
    </div>
  );
}

/** Explains the two colours once, so the maps above stop being decoration. */
export function WeightLegend() {
  const swatch = "inline-block h-3.5 w-3.5 border align-[-2px] hairline";
  return (
    <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
      <li>
        <span className={swatch} style={{ backgroundColor: "var(--color-plot)" }} /> teal —
        ink here counts <strong className="font-semibold">for</strong> this
        character
      </li>
      <li>
        <span className={swatch} style={{ backgroundColor: "var(--color-riso)" }} /> pink —
        ink here counts <strong className="font-semibold">against</strong> it
      </li>
      <li>
        <span className={swatch} style={{ backgroundColor: "var(--color-paper-raised)" }} />{" "}
        blank — this square makes no difference
      </li>
    </ul>
  );
}
