import { TorchLab } from "../TorchLab";
import { multinomialCells } from "../../labs/torch/multinomial";

/**
 * Cells that run on the reader's own machine, one set per reference entry.
 *
 * A third registry rather than an addition to GptWidget, for the reason the
 * others give: a page about counting character pairs should not download a
 * connect form and a set of torch snippets it will never show.
 */
type Props = { name: string };

export function TorchWidget({ name }: Props) {
  switch (name) {
    case "multinomial":
      return <TorchLab cells={multinomialCells} />;
    default:
      return null;
  }
}
