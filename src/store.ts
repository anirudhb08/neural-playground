import { useCallback, useEffect, useState } from "react";
import { EMPTY_DATASET, type Dataset, type Glyph, type Specimen } from "./types";

/**
 * Namespaced per tutorial, so a second one cannot fight this one for the slot.
 */
const STORAGE_KEY = "neulearn:neural-networks:dataset:v1";
/** The key this tutorial used when it was the whole site. Read once, then retired. */
const LEGACY_KEY = "neural-playground:dataset:v1";
/** Where an unreadable save is parked rather than being thrown away. */
const RESCUE_KEY = "neulearn:neural-networks:dataset:unreadable";

function looksLikeDataset(value: unknown): value is Dataset {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Dataset;
  return (
    Array.isArray(candidate.glyphs) && Array.isArray(candidate.specimens)
  );
}

function load(): Dataset {
  let raw: string | null = null;
  try {
    // Anyone who drew an alphabet before the site had more than one tutorial
    // still has it under the old key. Nobody should lose their drawings to a
    // rename, so fall back to it once; the next save writes the new key.
    raw =
      localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_KEY);
  } catch {
    // Storage is blocked outright; the session runs in memory only.
    return EMPTY_DATASET;
  }
  if (!raw) return EMPTY_DATASET;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!looksLikeDataset(parsed)) throw new Error("unexpected shape");
    return parsed;
  } catch {
    // Never silently discard someone's drawings. Park the unreadable copy
    // somewhere recoverable before the next save overwrites this slot.
    try {
      localStorage.setItem(RESCUE_KEY, raw);
    } catch {
      // Nothing further to try — the warning banner will cover it.
    }
    return EMPTY_DATASET;
  }
}

export function useDataset() {
  const [dataset, setDataset] = useState<Dataset>(load);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataset));
      setSaveError(null);
    } catch (error) {
      const full =
        error instanceof DOMException &&
        (error.name === "QuotaExceededError" ||
          error.name === "NS_ERROR_DOM_QUOTA_REACHED");
      setSaveError(
        full
          ? "This browser's storage is full, so new drawings are not being saved. Download a copy before you refresh."
          : "This browser is not allowing the page to save. Your drawings will be lost if you refresh — download a copy first.",
      );
    }
  }, [dataset]);

  const addGlyph = useCallback((label: string): Glyph => {
    const glyph: Glyph = { id: crypto.randomUUID(), label };
    setDataset((d) => ({ ...d, glyphs: [...d.glyphs, glyph] }));
    return glyph;
  }, []);

  const removeGlyph = useCallback((glyphId: string) => {
    setDataset((d) => ({
      glyphs: d.glyphs.filter((g) => g.id !== glyphId),
      // Specimens belong to their glyph; drop them together so the dataset
      // never holds drawings of a character that no longer exists.
      specimens: d.specimens.filter((s) => s.glyphId !== glyphId),
    }));
  }, []);

  const addSpecimen = useCallback((glyphId: string, pixels: number[]) => {
    const specimen: Specimen = {
      id: crypto.randomUUID(),
      glyphId,
      pixels,
      createdAt: Date.now(),
    };
    setDataset((d) => ({ ...d, specimens: [...d.specimens, specimen] }));
  }, []);

  const removeSpecimen = useCallback((specimenId: string) => {
    setDataset((d) => ({
      ...d,
      specimens: d.specimens.filter((s) => s.id !== specimenId),
    }));
  }, []);

  const replaceDataset = useCallback((next: unknown) => {
    if (!looksLikeDataset(next)) {
      throw new Error("That file is not a Neural Playground alphabet.");
    }
    setDataset(next);
  }, []);

  const clearAll = useCallback(() => setDataset(EMPTY_DATASET), []);

  return {
    dataset,
    saveError,
    addGlyph,
    removeGlyph,
    addSpecimen,
    removeSpecimen,
    replaceDataset,
    clearAll,
  };
}

export function countByGlyph(dataset: Dataset, glyphId: string): number {
  return dataset.specimens.filter((s) => s.glyphId === glyphId).length;
}
