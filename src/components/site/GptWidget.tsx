import { AttentionGrid } from "../AttentionGrid";
import { BigramTable } from "../BigramTable";
import { ContextWindow } from "../ContextWindow";
import { DeepStack } from "../DeepStack";
import { EmbeddingTable } from "../EmbeddingTable";
import { FfnUnits } from "../FfnUnits";
import { GenerateGPT } from "../GenerateGPT";
import { GradientStep } from "../GradientStep";
import { MultiHead } from "../MultiHead";
import { ParamCensus } from "../ParamCensus";
import { Tokenizer } from "../Tokenizer";
import { TrainGPT } from "../TrainGPT";
import { TrainBigram } from "../TrainBigram";
import { WeightedDie } from "../WeightedDie";
import { PythonLab } from "../PythonLab";
import { bigramLab } from "../../labs/bigram";
import { assembleLab } from "../../labs/assemble";
import { blockLab } from "../../labs/block";
import { contextWindowLab } from "../../labs/contextWindow";
import { embeddingsLab } from "../../labs/embeddings";
import { multiHeadLab } from "../../labs/multiHead";
import { tokenizerLab } from "../../labs/tokenizer";
import { trainGptLab } from "../../labs/trainGpt";
import { prepareGpt, prepareGptTrained } from "../../labs/gptSetup";
import { generateGptLab } from "../../labs/generateGpt";
import { attentionLab } from "../../labs/attention";
import { trainingLab } from "../../labs/training";

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
    case "context-window":
      return <ContextWindow />;
    case "embedding-table":
      return <EmbeddingTable />;
    case "gradient-step":
      return <GradientStep />;
    case "train-bigram":
      return <TrainBigram />;
    case "attention-grid":
      return <AttentionGrid />;
    case "multi-head":
      return <MultiHead />;
    case "ffn-units":
      return <FfnUnits />;
    case "deep-stack":
      return <DeepStack />;
    case "param-census":
      return <ParamCensus />;
    case "train-gpt":
      return <TrainGPT />;
    case "generate-gpt":
      return <GenerateGPT />;
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
    case "generate-gpt-lab":
      return (
        <PythonLab
          steps={generateGptLab()}
          prepare={prepareGptTrained}
          library="NumPy"
          closing="A language model, from a tally of pairs to a transformer that speaks - every number met, every claim run. What it says is still nonsense; how it says it is entirely yours."
        />
      );
    case "train-gpt-lab":
      return (
        <PythonLab
          steps={trainGptLab()}
          prepare={prepareGpt}
          library="NumPy"
          closing="A model that beats the best memory-free predictor on text it has never seen, and a sample that is starting to speak. Turning those weights into text on demand is the last part."
        />
      );
    case "assemble-lab":
      return (
        <PythonLab
          steps={assembleLab()}
          prepare={async () => {}}
          library="NumPy"
          closing="Assembled, counted, and honestly ignorant. Everything it needs to learn exists; what it has never had is enough text to learn from — that is the next part."
        />
      );
    case "block-lab":
      return (
        <PythonLab
          steps={blockLab()}
          prepare={async () => {}}
          library="NumPy"
          closing="A unit that gathers, thinks, and keeps its shape. What the stack still cannot do is tell ab from ba — that, and the final assembly, is the next part."
        />
      );
    case "multi-head-lab":
      return (
        <PythonLab
          steps={multiHeadLab()}
          prepare={async () => {}}
          library="NumPy"
          closing="Four specialists for the price of one generalist, their answers in separate lanes. What nothing here does yet is think about what was gathered — that is the next part."
        />
      );
    case "attention-lab":
      return (
        <PythonLab
          steps={attentionLab()}
          prepare={async () => {}}
          library="NumPy"
          closing="One head, complete. Every position now carries what it read behind it — which is the thing that was missing when the model wrote sathe and could not remember sat."
        />
      );
    case "training-lab":
      return (
        <PythonLab
          steps={trainingLab()}
          prepare={async () => {}}
          library="NumPy"
          closing="That is a complete, trained language model. It still sees one character, which is the only thing left standing between it and something worth reading — and it is what attention removes."
        />
      );
    case "embeddings-lab":
      return (
        <PythonLab
          steps={embeddingsLab()}
          prepare={async () => {}}
          library="NumPy"
          closing="A model that can learn, and a number that says how badly it is doing. Nothing has adjusted a single weight yet — that is the next part, and it is the shortest one in the tutorial."
        />
      );
    case "context-window-lab":
      return (
        <PythonLab
          steps={contextWindowLab()}
          prepare={async () => {}}
          library="NumPy"
          closing="Every training example this model will ever see comes out of that function, and none of them was written by anyone. The next part gives the numbers somewhere to live — and stops treating 9 and 8 as though they were close."
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
