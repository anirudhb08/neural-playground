import { useRef, useState, type FormEvent } from "react";
import { DrawCanvas, type DrawCanvasHandle } from "../components/DrawCanvas";
import { SpecimenStrip } from "../components/SpecimenStrip";
import { Thumb } from "../components/Thumb";
import { isBlank } from "../lib/raster";
import { countByGlyph } from "../store";
import { GRID, type Dataset } from "../types";

/** Enough to train on without the drawing becoming a chore. */
const SUGGESTED = 8;
/** Below this the later stages have too little to work with. */
const MINIMUM = 4;
/**
 * Two characters technically works, but with two the scorecards are forced to
 * be exact mirror images of each other, so several later stages end up showing
 * the same picture twice. Three is where it gets interesting.
 */
const SUGGESTED_CHARACTERS = 3;

const REFERENCES = [
  { name: "Omniglot", href: "https://github.com/brendenlake/omniglot" },
  { name: "MNIST", href: "https://en.wikipedia.org/wiki/MNIST_database" },
  {
    name: "EMNIST",
    href: "https://www.nist.gov/itl/products-and-services/emnist-dataset",
  },
];

type Props = {
  dataset: Dataset;
  onAddGlyph: (label: string) => { id: string };
  onRemoveGlyph: (id: string) => void;
  onAddSpecimen: (glyphId: string, pixels: number[]) => void;
  onRemoveSpecimen: (id: string) => void;
  onLoadSample: () => void;
  onContinue: () => void;
};

export function BuildDataset({
  dataset,
  onAddGlyph,
  onRemoveGlyph,
  onAddSpecimen,
  onRemoveSpecimen,
  onLoadSample,
  onContinue,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [pixels, setPixels] = useState<number[]>(() =>
    new Array(GRID * GRID).fill(0),
  );
  const canvas = useRef<DrawCanvasHandle>(null);

  const selected =
    dataset.glyphs.find((g) => g.id === selectedId) ?? dataset.glyphs[0] ?? null;
  const mine = dataset.specimens.filter((s) => s.glyphId === selected?.id);
  const drawn = !isBlank(pixels);

  const ready =
    dataset.glyphs.length >= 2 &&
    dataset.glyphs.every((g) => countByGlyph(dataset, g.id) >= MINIMUM);

  function addGlyph(event: FormEvent) {
    event.preventDefault();
    const trimmed = label.trim();
    if (!trimmed) return;
    setSelectedId(onAddGlyph(trimmed).id);
    setLabel("");
  }

  function keep() {
    if (!selected || !drawn) return;
    onAddSpecimen(selected.id, pixels);
    setPixels(new Array(GRID * GRID).fill(0));
    canvas.current?.clear();
  }

  return (
    <div className="mx-auto max-w-5xl px-5 pb-20">
      <header className="max-w-2xl pt-14">
        <p className="eyebrow">Your dataset</p>
        <h1 className="mt-1 font-display text-3xl leading-[1.15] font-extrabold tracking-[-0.02em] sm:text-4xl">
          Invent an alphabet
        </h1>
        <p className="mt-4 body-text">
          Make up a few characters and draw each one a handful of times. A hook.
          A spiral with a tail. A box with a dot inside. They only need to look
          different enough that you could tell them apart yourself.
        </p>
        <p className="mt-4 body-text text-graphite">
          Aim for {SUGGESTED_CHARACTERS} characters, with about {SUGGESTED}{" "}
          drawings of each. Draw them a little differently every time — bigger,
          smaller, leaning, rushed. You can come back and add more whenever you
          like.
        </p>
        <p className="mt-4 body-text text-graphite">
          Two will work, but everything downstream is more interesting with{" "}
          {SUGGESTED_CHARACTERS}: with only two characters the network's
          scorecards are forced to be exact mirror images of each other, so
          several of the later stages end up showing you the same picture twice.
        </p>
        {dataset.glyphs.length === 0 && (
          <div className="mt-7 border-l-2 border-riso bg-riso/6 py-4 pr-4 pl-5">
            <p className="body-text">
              In a hurry, or just want to see where this goes? Load a
              ready-made alphabet of {SUGGESTED_CHARACTERS} characters and every
              stage will have something to work with straight away.
            </p>
            <button
              type="button"
              onClick={onLoadSample}
              className="mt-4 bg-riso px-5 py-2.5 font-mono text-xs tracking-[0.14em] text-paper uppercase transition-colors hover:bg-ink"
            >
              Load a sample alphabet
            </button>
            <p className="mt-3 mono-note text-graphite">
              You can delete it and draw your own at any point — and drawing
              your own is the better way round.
            </p>
          </div>
        )}

        <p className="mt-5 font-mono text-xs text-graphite">
          Real datasets, for reference:{" "}
          {REFERENCES.map((reference, i) => (
            <span key={reference.name}>
              {i > 0 && " · "}
              <a
                href={reference.href}
                target="_blank"
                rel="noreferrer"
                className="text-plot underline underline-offset-4 hover:text-riso"
              >
                {reference.name}
              </a>
            </span>
          ))}
        </p>
      </header>

      <div className="mt-12 grid gap-10 lg:grid-cols-[17rem_1fr]">
        <section className="flex flex-col gap-4">
          <h2 className="eyebrow">Characters</h2>

          {dataset.glyphs.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {dataset.glyphs.map((glyph) => {
                const count = countByGlyph(dataset, glyph.id);
                const first = dataset.specimens.find(
                  (s) => s.glyphId === glyph.id,
                );
                const active = glyph.id === selected?.id;
                return (
                  <li key={glyph.id}>
                    <div
                      className={`group flex items-center gap-3 border px-3 py-2 transition-colors ${
                        active
                          ? "border-riso bg-riso/8"
                          : "hairline bg-paper-raised hover:border-plot/45"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedId(glyph.id)}
                        aria-pressed={active}
                        className="flex flex-1 items-center gap-3 text-left"
                      >
                        <span className="h-9 w-9 shrink-0 border hairline bg-paper">
                          {first && <Thumb pixels={first.pixels} />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {glyph.label}
                          </span>
                          <span
                            className={`block mono-note ${
                              count >= MINIMUM ? "text-plot" : "text-graphite"
                            }`}
                          >
                            {count} drawn
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveGlyph(glyph.id)}
                        aria-label={`Delete ${glyph.label} and its drawings`}
                        className="shrink-0 px-1 font-mono text-xs text-graphite opacity-0 transition-opacity group-hover:opacity-100 hover:text-riso focus-visible:opacity-100"
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <form onSubmit={addGlyph} className="flex gap-2">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Name a new character"
              aria-label="Name a new character"
              className="min-w-0 flex-1 border hairline bg-paper-raised px-3 py-2.5 text-sm outline-none focus:border-riso"
            />
            <button
              type="submit"
              disabled={!label.trim()}
              className="shrink-0 bg-ink px-4 font-mono text-xs tracking-wider text-paper uppercase transition-colors hover:bg-plot disabled:cursor-not-allowed disabled:opacity-30"
            >
              Add
            </button>
          </form>
        </section>

        <section className="flex min-w-0 flex-col gap-4">
          <h2 className="eyebrow">
            {selected ? `Drawing ${selected.label}` : "Drawing"}
          </h2>

          {!selected ? (
            <p className="caption text-graphite">
              Name a character to start drawing.
            </p>
          ) : (
            <div className="flex flex-wrap gap-8">
              <div className="flex w-[18.75rem] flex-col gap-2">
                <DrawCanvas
                  ref={canvas}
                  onChange={setPixels}
                  highlight={null}
                  placement={null}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => canvas.current?.clear()}
                    className="flex-1 border px-3 py-2 font-mono text-xs tracking-wider uppercase transition-colors hairline hover:border-plot"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={keep}
                    disabled={!drawn}
                    className="flex-[2] bg-riso px-3 py-2 font-mono text-xs tracking-wider text-paper uppercase transition-colors hover:bg-ink disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    Keep this one
                  </button>
                </div>
              </div>

              <div className="min-w-0 flex-1">
                {mine.length === 0 ? (
                  <p className="caption text-graphite">
                    No drawings of {selected.label} yet.
                  </p>
                ) : (
                  <SpecimenStrip
                    glyph={selected}
                    specimens={mine}
                    onRemove={onRemoveSpecimen}
                  />
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      <div className="mt-16 border-t pt-8 hairline">
        <button
          type="button"
          onClick={onContinue}
          disabled={!ready}
          className="bg-ink px-7 py-3.5 font-mono text-xs tracking-[0.14em] text-paper uppercase transition-colors hover:bg-plot disabled:cursor-not-allowed disabled:opacity-30"
        >
          My alphabet is ready
        </button>
        {!ready ? (
          <p className="mt-3 font-mono text-xs text-graphite">
            Needs at least two characters, with {MINIMUM} drawings of each.
          </p>
        ) : (
          dataset.glyphs.length < SUGGESTED_CHARACTERS && (
            <p className="mt-3 font-mono text-xs text-graphite">
              This will work — but a third character would make the later stages
              considerably more interesting.
            </p>
          )
        )}
      </div>
    </div>
  );
}
