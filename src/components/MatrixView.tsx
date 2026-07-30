import { useState } from "react";
import { GRID } from "../types";

type Props = {
  pixels: number[];
  onHover: (cell: { row: number; col: number } | null) => void;
};

export function MatrixView({ pixels, onHover }: Props) {
  const [showNumbers, setShowNumbers] = useState(false);
  const [hovered, setHovered] = useState<{ row: number; col: number } | null>(
    null,
  );

  function enter(row: number, col: number) {
    const cell = { row, col };
    setHovered(cell);
    onHover(cell);
  }

  function leave() {
    setHovered(null);
    onHover(null);
  }

  const hoveredValue =
    hovered === null ? null : pixels[hovered.row * GRID + hovered.col];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className="eyebrow">What the network sees</p>
        <button
          type="button"
          onClick={() => setShowNumbers((v) => !v)}
          className="mono-note tracking-wider text-plot uppercase underline underline-offset-4 hover:text-riso"
        >
          {showNumbers ? "Shading" : "Numbers"}
        </button>
      </div>

      <div
        onMouseLeave={leave}
        className="grid w-full gap-px border bg-plot/25 hairline"
        style={{ gridTemplateColumns: `repeat(${GRID}, minmax(0, 1fr))` }}
      >
        {pixels.map((value, index) => {
          const row = Math.floor(index / GRID);
          const col = index % GRID;
          const isHovered =
            hovered !== null && hovered.row === row && hovered.col === col;
          return (
            <div
              key={index}
              onMouseEnter={() => enter(row, col)}
              title={`row ${row}, column ${col} = ${value}`}
              className="grid aspect-square place-items-center"
              style={{
                // Opaque blend from blank paper to full ink, so the 1px gaps
                // stay the only thing the grid colour shows through.
                backgroundColor: `color-mix(in srgb, var(--color-plot) ${
                  (value / 255) * 100
                }%, var(--color-paper-raised))`,
                boxShadow: isHovered ? "inset 0 0 0 2px var(--color-riso)" : undefined,
              }}
            >
              {showNumbers && (
                <span
                  className="font-mono leading-none"
                  style={{
                    fontSize: "clamp(5px, 0.55vw, 8px)",
                    color: value > 140 ? "var(--color-paper-raised)" : "var(--color-graphite)",
                  }}
                >
                  {value}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <p className="font-mono text-xs text-graphite" aria-live="polite">
        {hovered === null ? (
          `${GRID} × ${GRID} = ${GRID * GRID} numbers — point at one to find it on your drawing`
        ) : (
          <>
            <span className="text-plot">
              row {hovered.row}, col {hovered.col}
            </span>
            {" = "}
            <span className="font-semibold text-ink">{hoveredValue}</span>
            <span className="text-graphite">
              {" "}
              — {hoveredValue === 0 ? "blank paper" : "ink, 0 to 255"}
            </span>
          </>
        )}
      </p>
    </div>
  );
}
