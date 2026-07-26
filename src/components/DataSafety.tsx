import { useRef, useState, type ChangeEvent } from "react";
import type { Dataset } from "../types";

type Props = {
  dataset: Dataset;
  saveError: string | null;
  onReplace: (next: unknown) => void;
  onClear: () => void;
};

/**
 * Drawings are hand-made and slow to replace, so this keeps their safety in
 * view: what is stored, a way to take a copy out, and a way to put one back.
 * Clearing takes two deliberate clicks.
 */
export function DataSafety({ dataset, saveError, onReplace, onClear }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const drawings = dataset.specimens.length;
  const characters = dataset.glyphs.length;

  function download() {
    const blob = new Blob([JSON.stringify(dataset)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "my-alphabet.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function restore(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Let the same file be chosen twice in a row.
    event.target.value = "";
    if (!file) return;
    setProblem(null);
    try {
      onReplace(JSON.parse(await file.text()));
    } catch (error) {
      setProblem(
        error instanceof Error ? error.message : "That file could not be read.",
      );
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      {saveError && (
        <p
          role="alert"
          className="border-l-2 border-riso bg-riso/8 px-2.5 py-2 text-xs leading-relaxed"
        >
          {saveError}
        </p>
      )}

      <p className="font-mono text-[0.6875rem] leading-relaxed text-graphite">
        {drawings === 0
          ? "Nothing drawn yet. Whatever you draw stays in this browser."
          : `Saved here: ${drawings} drawing${drawings === 1 ? "" : "s"}, ${characters} character${characters === 1 ? "" : "s"}.`}
      </p>

      <div className="flex flex-col items-start gap-1.5 font-mono text-[0.6875rem]">
        <button
          type="button"
          onClick={download}
          disabled={drawings === 0}
          className="text-plot underline underline-offset-4 hover:text-riso disabled:cursor-not-allowed disabled:text-graphite/60 disabled:no-underline"
        >
          Download a copy
        </button>

        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="text-plot underline underline-offset-4 hover:text-riso"
        >
          Restore from a copy
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          onChange={restore}
          className="hidden"
        />

        {confirming ? (
          <span className="flex flex-col items-start gap-1 pt-1">
            <span className="text-ink">Delete all {drawings}?</span>
            <span className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  onClear();
                  setConfirming(false);
                }}
                className="text-riso underline underline-offset-4"
              >
                Yes, delete
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="text-graphite underline underline-offset-4 hover:text-ink"
              >
                Keep them
              </button>
            </span>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="text-graphite underline underline-offset-4 hover:text-riso"
          >
            Start over
          </button>
        )}
      </div>

      {problem && (
        <p role="alert" className="font-mono text-[0.6875rem] text-riso">
          {problem}
        </p>
      )}
    </div>
  );
}
