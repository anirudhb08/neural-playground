import { useMemo, type ReactNode } from "react";
import { useDataset } from "../../store";
import { buildSampleDataset } from "../../lib/sample";
import {
  applyNudge,
  createNetwork,
  holdOneOfEachBack,
  INPUTS,
  nudgeFor,
  score,
  toShares,
  type Sample,
} from "../../lib/network";
import { createDeep } from "../../lib/deep";
import { seedDrawings, seedMatrices, seedNetwork } from "../../lib/pyodide";

import { AveragingNudges } from "../AveragingNudges";
import { BlameFlow } from "../BlameFlow";
import { OneNudge } from "../OneNudge";
import { OneSquare } from "../OneSquare";
import { PythonLab } from "../PythonLab";
import { ScorecardFlow } from "../ScorecardFlow";
import { Scorecards } from "./Scorecards";
import { SoftmaxSteps } from "../SoftmaxSteps";
import { StarveIt } from "../StarveIt";
import { SurpriseCurve } from "../SurpriseCurve";
import { TheLoop } from "../TheLoop";
import { Thumb } from "../Thumb";
import { TouchANumber } from "../TouchANumber";
import { TrainOneDrawing } from "../TrainOneDrawing";
import { TrainingRun } from "../TrainingRun";
import { WreckTheRate } from "../WreckTheRate";

import { BuildDataset } from "../../stages/BuildDataset";
import { IntoNumbers } from "../../stages/IntoNumbers";
import { ReadMyWriting } from "../../stages/ReadMyWriting";

import { learningLab } from "../../labs/learning";
import { howWrongLab } from "../../labs/howWrong";
import { moreLayersLab } from "../../labs/moreLayers";

/**
 * One interactive figure, dropped into prose.
 *
 * Parts are written as MDX so the teaching text is static HTML a crawler can
 * read without running anything. Figures cannot be — every one is derived from
 * drawings held in the reader's own browser — so each mounts here instead,
 * keeping the client-side surface to the pieces that genuinely need it.
 */
type Props = { name: string; rate?: number };

const TRAIN_ROUNDS = 400;

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
  const store = useDataset();
  const { dataset } = store;
  const classes = dataset.glyphs.length;
  const go = (href: string) => () => {
    window.location.href = href;
  };

  const samples: Sample[] = useMemo(
    () =>
      dataset.specimens.map((s) => ({
        pixels: s.pixels,
        label: dataset.glyphs.findIndex((g) => g.id === s.glyphId),
      })),
    [dataset],
  );
  const start = useMemo(() => createNetwork(Math.max(classes, 1)), [classes]);
  const { train, held } = useMemo(
    () => holdOneOfEachBack(samples, classes),
    [samples, classes],
  );
  const trained = useMemo(() => {
    let net = createNetwork(Math.max(classes, 1));
    for (let i = 0; i < TRAIN_ROUNDS; i++) {
      net = applyNudge(net, nudgeFor(net, train), 0.5);
    }
    return net;
  }, [train, classes]);

  const prepare = async () => {
    const index = new Map(dataset.glyphs.map((g, i) => [g.id, i]));
    await seedDrawings({
      drawings: dataset.specimens.flatMap((s) => s.pixels),
      labels: dataset.specimens.map((s) => index.get(s.glyphId) ?? -1),
      names: dataset.glyphs.map((g) => g.label),
    });
    await seedMatrices(INPUTS);
    await seedNetwork(start.weights, start.biases);
  };

  // Figures that make their own dataset, or need none, come before the guard.
  if (name === "alphabet-builder") {
    return (
      <BuildDataset
        dataset={dataset}
        onAddGlyph={store.addGlyph}
        onRemoveGlyph={store.removeGlyph}
        onAddSpecimen={store.addSpecimen}
        onRemoveSpecimen={store.removeSpecimen}
        onLoadSample={() => store.replaceDataset(buildSampleDataset())}
        onContinue={go("/neural-networks/03-into-numbers/")}
      />
    );
  }
  if (name === "surprise-curve") return <SurpriseCurve />;

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
  const square = inked === -1 ? 0 : inked;
  const toAlphabet = go("/neural-networks/02-your-alphabet/");

  switch (name) {
    // 03 — drawing and its grid are one control; splitting them would break
    // the point, which is that the numbers change as you draw.
    case "into-numbers":
      return <IntoNumbers dataset={dataset} onBuildAlphabet={toAlphabet} />;

    // 04
    case "one-square":
      return (
        <OneSquare
          pixels={dataset.specimens[0].pixels}
          weights={start.weights[0]}
          label={dataset.glyphs[0].label}
          square={square}
        />
      );
    case "scorecard-flow":
      return (
        <ScorecardFlow
          pixels={dataset.specimens[0].pixels}
          glyphs={dataset.glyphs}
          network={start}
        />
      );
    case "scorecards":
      return <Scorecards glyphs={dataset.glyphs} />;

    // 05
    case "softmax-steps": {
      const raw = score(start, first.pixels);
      return (
        <SoftmaxSteps
          labels={dataset.glyphs.map((g) => g.label)}
          scores={raw}
          truth={first.label}
        >
          <div className="mb-5 flex items-center gap-4 border-b pb-4 hairline">
            <div className="h-16 w-16 shrink-0 border bg-paper hairline">
              <Thumb pixels={first.pixels} />
            </div>
            <p className="caption">
              This drawing really is{" "}
              <strong>{dataset.glyphs[first.label].label}</strong>, and every
              number below is the network's own.
            </p>
          </div>
        </SoftmaxSteps>
      );
    }
    case "loss-now": {
      const loss =
        samples.reduce((sum, s) => {
          const shares = toShares(score(start, s.pixels));
          return sum - Math.log(Math.max(shares[s.label], 1e-12));
        }, 0) / samples.length;
      const chance = Math.log(classes);
      return (
        <div className="border bg-paper-raised p-6 hairline">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="eyebrow">Your network right now</p>
              <p className="mt-1 font-mono text-4xl font-semibold tracking-[-0.02em]">
                {loss.toFixed(4)}
              </p>
            </div>
            <div className="text-right">
              <p className="eyebrow">A network that knows nothing</p>
              <p className="mt-1 font-mono text-2xl text-graphite">
                {chance.toFixed(4)}
              </p>
            </div>
          </div>
          <p className="mt-5 border-t pt-4 caption hairline">
            With {classes} characters, a network that splits its belief evenly
            every time scores <code>{chance.toFixed(4)}</code> — that is{" "}
            <code>log({classes})</code>. Yours is at{" "}
            <code>{loss.toFixed(4)}</code>, about what you would expect from
            something that has never been told anything.
          </p>
        </div>
      );
    }

    // 06
    case "one-nudge":
      return (
        <OneNudge
          sample={first}
          glyphs={dataset.glyphs}
          network={start}
          square={square}
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

    // 07
    case "the-loop":
      return <TheLoop start={start} samples={samples} glyphs={dataset.glyphs} />;

    // 08
    case "read-my-writing":
      return <ReadMyWriting dataset={dataset} onBuildAlphabet={toAlphabet} />;

    // 09
    case "starve-it":
      return <StarveIt train={train} held={held} classes={classes} />;
    case "wreck-the-rate":
      return <WreckTheRate train={train} classes={classes} />;
    case "touch-a-number":
      return (
        <TouchANumber
          network={trained}
          sample={held[0] ?? samples[0]}
          glyphs={dataset.glyphs}
        />
      );

    // 10
    case "blame-flow":
      return (
        <BlameFlow
          net={createDeep(classes)}
          sample={samples[0]}
          glyphs={dataset.glyphs}
        />
      );

    // Notebooks
    case "how-wrong-lab":
      return (
        <PythonLab
          steps={howWrongLab}
          prepare={prepare}
          library="NumPy"
          closing="You now have a number that says how wrong the network is. Next: how that one number tells every single weight which way to move."
        />
      );
    case "learning-lab":
      return (
        <PythonLab
          steps={learningLab(classes)}
          prepare={prepare}
          library="NumPy"
          closing="That loop is the whole of it. Next: draw something it has never seen, and find out whether any of this worked."
        />
      );
    case "more-layers-lab":
      return (
        <PythonLab
          steps={moreLayersLab(classes)}
          prepare={prepare}
          library="NumPy"
          closing="You have now written backpropagation. Every deep network ever trained is that same handing-back, repeated once per layer."
        />
      );

    default:
      return null;
  }
}
