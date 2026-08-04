import { BigramTable } from "../BigramTable";
import { Tokenizer } from "../Tokenizer";
import { WeightedDie } from "../WeightedDie";
import { PythonLab } from "../PythonLab";
import { bigramLab } from "../../labs/bigram";
import { tokenizerLab } from "../../labs/tokenizer";

/**
 * Figures for the language-model tutorial.
 *
 * A registry of its own rather than an addition to the neural network's: that
 * one imports canvases, grids and a training loop, none of which a page about
 * counting character pairs should be made to download.
 *
 * Nothing here needs the reader to have drawn anything, so there is no guard —
 * every figure works on first load.
 *
 * HowMuchContext is deliberately absent: it is written and working but not yet
 * placed on a page, and registering it here would ship it to every page that
 * uses any figure at all. Add a case back when a part needs it.
 */
type Props = { name: string };

export function GptWidget({ name }: Props) {
  switch (name) {
    case "bigram-table":
      return <BigramTable />;
    case "tokenizer":
      return <Tokenizer />;
    case "weighted-die":
      return <WeightedDie />;
    case "bigram-lab":
      return (
        <PythonLab
          steps={bigramLab()}
          prepare={async () => {}}
          closing="That is a language model, complete. It has no parameters, learned nothing, and still produces text that is locally plausible and globally nonsense. The next part starts on why."
        />
      );
    case "tokenizer-lab":
      return (
        <PythonLab
          steps={tokenizerLab()}
          prepare={async () => {}}
          closing="Two dicts and a round-trip check. Everything from here reads the integers rather than the text, and the only thing standing between the model and gibberish is that these two tables keep agreeing."
        />
      );
    default:
      return null;
  }
}
