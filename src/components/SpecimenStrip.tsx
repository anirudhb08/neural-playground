import { Thumb } from "./Thumb";
import type { Glyph, Specimen } from "../types";

type Props = {
  glyph: Glyph;
  specimens: Specimen[];
  onRemove: (id: string) => void;
};

/** The drawings kept so far, as a plate of specimens. */
export function SpecimenStrip({ glyph, specimens, onRemove }: Props) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {specimens.map((specimen) => (
        <li key={specimen.id} className="group relative">
          <div className="h-12 w-12 border bg-paper-raised hairline">
            <Thumb pixels={specimen.pixels} />
          </div>
          <button
            type="button"
            onClick={() => onRemove(specimen.id)}
            aria-label={`Discard this drawing of ${glyph.label}`}
            className="absolute -top-1.5 -right-1.5 grid h-5 w-5 place-items-center rounded-full bg-ink font-mono text-[0.625rem] text-paper opacity-0 transition-opacity group-hover:opacity-100 hover:bg-riso focus-visible:opacity-100"
          >
            ✕
          </button>
        </li>
      ))}
    </ul>
  );
}
