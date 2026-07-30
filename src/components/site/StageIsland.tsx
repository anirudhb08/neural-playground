import { useDataset } from "../../store";
import { buildSampleDataset } from "../../lib/sample";
import { BreakIt } from "../../stages/BreakIt";
import { BuildDataset } from "../../stages/BuildDataset";
import { HowWrong } from "../../stages/HowWrong";
import { IntoNumbers } from "../../stages/IntoNumbers";
import { Learning } from "../../stages/Learning";
import { MoreLayers } from "../../stages/MoreLayers";
import { Problem } from "../../stages/Problem";
import { ReadMyWriting } from "../../stages/ReadMyWriting";
import { TheNetwork } from "../../stages/TheNetwork";
import { WholeLoop } from "../../stages/WholeLoop";

/** Where "go and draw an alphabet" leads, now that parts have addresses. */
const ALPHABET = "/neural-networks/02-your-alphabet/";
const NUMBERS = "/neural-networks/03-into-numbers/";

type Props = { stage: string };

/**
 * Mounts one part's interactive half.
 *
 * The drawings live in localStorage and every widget derives from them, so
 * this is client-only by necessity — there is no dataset at build time. The
 * prose around it is static, which is the half that needs to be readable
 * without JavaScript.
 */
export function StageIsland({ stage }: Props) {
  const d = useDataset();
  const go = (href: string) => () => {
    window.location.href = href;
  };
  const toAlphabet = go(ALPHABET);

  switch (stage) {
    case "the-problem":
      return <Problem onStart={toAlphabet} />;
    case "your-alphabet":
      return (
        <BuildDataset
          dataset={d.dataset}
          onAddGlyph={d.addGlyph}
          onRemoveGlyph={d.removeGlyph}
          onAddSpecimen={d.addSpecimen}
          onRemoveSpecimen={d.removeSpecimen}
          onLoadSample={() => d.replaceDataset(buildSampleDataset())}
          onContinue={go(NUMBERS)}
        />
      );
    case "into-numbers":
      return <IntoNumbers dataset={d.dataset} onBuildAlphabet={toAlphabet} />;
    case "the-network":
      return <TheNetwork dataset={d.dataset} onBuildAlphabet={toAlphabet} />;
    case "how-wrong":
      return <HowWrong dataset={d.dataset} onBuildAlphabet={toAlphabet} />;
    case "learning":
      return <Learning dataset={d.dataset} onBuildAlphabet={toAlphabet} />;
    case "the-whole-loop":
      return <WholeLoop dataset={d.dataset} onBuildAlphabet={toAlphabet} />;
    case "read-my-writing":
      return <ReadMyWriting dataset={d.dataset} onBuildAlphabet={toAlphabet} />;
    case "break-it":
      return <BreakIt dataset={d.dataset} onBuildAlphabet={toAlphabet} />;
    case "more-layers":
      return <MoreLayers dataset={d.dataset} onBuildAlphabet={toAlphabet} />;
    default:
      return null;
  }
}
