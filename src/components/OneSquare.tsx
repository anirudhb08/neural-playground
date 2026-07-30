import { GRID } from "../types";
import { InkGrid, WeightMap } from "./Grids";

type Props = {
  pixels: number[];
  weights: number[];
  label: string;
  square: number;
};

/** The whole idea, worked through for a single square before anything moves. */
export function OneSquare({ pixels, weights, label, square }: Props) {
  // Rounded before multiplying, so the product below is exactly what a reader
  // gets from typing the two figures on screen into a calculator.
  const ink = Number((pixels[square] / 255).toFixed(4));
  const weight = Number(weights[square].toFixed(4));
  const contribution = ink * weight;
  const row = Math.floor(square / GRID);
  const column = square % GRID;

  return (
    <div className="border bg-paper-raised p-5 hairline">
      <div className="flex flex-wrap items-start gap-x-8 gap-y-6">
        <figure className="w-40">
          <figcaption className="eyebrow pb-2">Your drawing</figcaption>
          <InkGrid pixels={pixels} highlight={square} />
          <p className="pt-2 mono-note text-graphite">
            square {square} (row {row}, col {column})
          </p>
        </figure>

        <figure className="w-40">
          <figcaption className="eyebrow pb-2">{label}'s scorecard</figcaption>
          <WeightMap weights={weights} highlight={square} />
          <p className="pt-2 mono-note text-graphite">
            same square, same place
          </p>
        </figure>

        <div className="min-w-[16rem] flex-1">
          <p className="eyebrow">What that one square is worth</p>
          <dl className="mt-3 flex flex-col gap-2 font-mono text-xs">
            <div className="flex justify-between gap-4 border-b pb-2 hairline">
              <dt className="text-graphite">ink in this square</dt>
              <dd>{ink.toFixed(4)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b pb-2 hairline">
              <dt className="text-graphite">
                what {label}'s scorecard says here
              </dt>
              <dd className={weight >= 0 ? "text-plot" : "text-riso"}>
                {weight >= 0 ? "+" : ""}
                {weight.toFixed(4)}
              </dd>
            </div>
            <div className="flex justify-between gap-4 pt-1">
              <dt className="text-graphite">
                {ink.toFixed(4)} × {weight.toFixed(4)}
              </dt>
              <dd
                className={`font-semibold ${contribution >= 0 ? "text-plot" : "text-riso"}`}
              >
                {contribution >= 0 ? "+" : ""}
                {contribution.toFixed(4)}
              </dd>
            </div>
          </dl>
          <p className="mt-4 caption">
            That is this one square's entire say in the matter: it pushes{" "}
            {label}'s total {contribution >= 0 ? "up" : "down"} by{" "}
            {Math.abs(contribution).toFixed(4)}. Now do that 255 more times and
            add it all up.
          </p>
        </div>
      </div>
    </div>
  );
}
