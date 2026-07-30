import { useMemo, type ReactNode } from "react";
import { useDataset } from "../../store";
import { AveragingNudges } from "../AveragingNudges";
import { OneNudge } from "../OneNudge";
import { TrainOneDrawing } from "../TrainOneDrawing";
import { TrainingRun } from "../TrainingRun";
import { PythonLab } from "../PythonLab";
import {
  createNetwork,
  holdOneOfEachBack,
  INPUTS,
  type Sample,
} from "../../lib/network";
import { seedDrawings, seedMatrices, seedNetwork } from "../../lib/pyodide";
import { learningLab } from "../../labs/learning";

/**
 * One interactive figure, dropped into prose.
 *
 * Parts are written as MDX so the teaching text is static HTML a crawler can
 * read without running anything. The figures cannot be — they are all derived
 * from drawings held in the reader's own browser — so each one mounts here
 * instead, keeping the client-side surface to the pieces that genuinely need
 * it rather than the whole page.
 */
type Props = { name: string; rate?: number };

function NeedsAlphabet({ children }: { children: ReactNode }) {
  return (
    <div className="border bg-paper-raised p-6 hairline">
      <p className="eyebrow">Nothing to show yet</p>
      <p className="body-text mt-2">{children}</p>
      <a
        href="/neural-networks/02-your-alphabet/"
        className="mt-5 inline-block bg-ink px-5 py-2.5 font-mono text-xs tracking-[0.14em] text-paper uppercase no-underline transition-colors hover:bg-plot"
      >
        Draw an alphabet
      </a>
    </div>
  );
}

export function Widget({ name, rate = 0.5 }: Props) {
  const { dataset } = useDataset();
  const classes = dataset.glyphs.length;

  const samples: Sample[] = useMemo(
    () =>
      dataset.specimens.map((s) => ({
        pixels: s.pixels,
        label: dataset.glyphs.findIndex((g) => g.id === s.glyphId),
      })),
    [dataset],
  );
  const start = useMemo(
    () => createNetwork(Math.max(classes, 1)),
    [classes],
  );
  const { train, held } = useMemo(
    () => holdOneOfEachBack(samples, classes),
    [samples, classes],
  );

  if (samples.length < 4 || classes < 2) {
    return (
      <NeedsAlphabet>
        This figure is drawn from your own handwriting, and there is none saved
        in this browser yet. It needs at least two characters with a few
        drawings of each.
      </NeedsAlphabet>
    );
  }

  const first = samples[0];
  const inked = first.pixels.findIndex((v) => v > 120);

  switch (name) {
    case "one-nudge":
      return (
        <OneNudge
          sample={first}
          glyphs={dataset.glyphs}
          network={start}
          square={inked === -1 ? 0 : inked}
          rate={rate}
        />
      );
    case "train-one-drawing":
      return (
        <TrainOneDrawing
          sample={first}
          other={samples.find((s) => s.label !== first.label) ?? samples[1]}
          glyphs={dataset.glyphs}
          start={start}
        />
      );
    case "averaging-nudges":
      return (
        <AveragingNudges
          samples={samples.filter((s) => s.label === first.label)}
          glyph={dataset.glyphs[first.label]}
          classIndex={first.label}
          network={start}
        />
      );
    case "training-run":
      return (
        <TrainingRun
          start={start}
          train={train}
          held={held}
          glyphs={dataset.glyphs}
        />
      );
    case "learning-lab":
      return (
        <PythonLab
          steps={learningLab(classes)}
          closing="That loop is the whole of it. Next: draw something it has never seen, and find out whether any of this worked."
          prepare={async () => {
            const index = new Map(dataset.glyphs.map((g, i) => [g.id, i]));
            await seedDrawings({
              drawings: dataset.specimens.flatMap((s) => s.pixels),
              labels: dataset.specimens.map((s) => index.get(s.glyphId) ?? -1),
              names: dataset.glyphs.map((g) => g.label),
            });
            await seedMatrices(INPUTS);
            await seedNetwork(start.weights, start.biases);
          }}
        />
      );
    default:
      return null;
  }
}
