import { useEffect, useRef } from "react";
import { GRID } from "../types";

/** A saved drawing, at its true size, blown up with hard pixel edges. */
export function Thumb({ pixels }: { pixels: number[] }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    const image = ctx.createImageData(GRID, GRID);
    for (let i = 0; i < GRID * GRID; i++) {
      // Oxidised plotter teal, opacity carrying the ink value.
      image.data[i * 4] = 46;
      image.data[i * 4 + 1] = 106;
      image.data[i * 4 + 2] = 92;
      image.data[i * 4 + 3] = pixels[i];
    }
    ctx.putImageData(image, 0, 0);
  }, [pixels]);

  return (
    <canvas
      ref={ref}
      width={GRID}
      height={GRID}
      className="h-full w-full"
      style={{ imageRendering: "pixelated" }}
    />
  );
}
