import { useEffect, useState } from "react";
import { DataSafety } from "./components/DataSafety";
import { buildSampleDataset } from "./lib/sample";
import { Sidebar, type Stage } from "./components/Sidebar";
import { BreakIt } from "./pages/BreakIt";
import { BuildDataset } from "./pages/BuildDataset";
import { HowWrong } from "./pages/HowWrong";
import { IntoNumbers } from "./pages/IntoNumbers";
import { Learning } from "./pages/Learning";
import { MoreLayers } from "./pages/MoreLayers";
import { Problem } from "./pages/Problem";
import { ReadMyWriting } from "./pages/ReadMyWriting";
import { WholeLoop } from "./pages/WholeLoop";
import { TheNetwork } from "./pages/TheNetwork";
import { useDataset } from "./store";

const STAGES = [
  { id: "problem", name: "The problem", ready: true },
  { id: "dataset", name: "Your alphabet", ready: true },
  { id: "numbers", name: "Into numbers", ready: true },
  { id: "network", name: "The network", ready: true },
  { id: "wrong", name: "How wrong is it?", ready: true },
  { id: "training", name: "Learning", ready: true },
  { id: "loop", name: "The whole loop", ready: true },
  { id: "predict", name: "Read my writing", ready: true },
  { id: "break", name: "Break it", ready: true },
  { id: "layers", name: "More layers", ready: true },
] as const satisfies readonly Stage[];

type StageId = (typeof STAGES)[number]["id"];

const PAGE_KEY = "neural-playground:page:v1";

export default function App() {
  const {
    dataset,
    saveError,
    addGlyph,
    removeGlyph,
    addSpecimen,
    removeSpecimen,
    replaceDataset,
    clearAll,
  } = useDataset();
  const [page, setPage] = useState<StageId>(
    () => (localStorage.getItem(PAGE_KEY) as StageId | null) ?? "problem",
  );

  useEffect(() => {
    localStorage.setItem(PAGE_KEY, page);
    window.scrollTo({ top: 0 });
  }, [page]);

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Sidebar
        stages={STAGES}
        current={page}
        onSelect={(id) => setPage(id as StageId)}
        footer={
          <DataSafety
            dataset={dataset}
            saveError={saveError}
            onReplace={replaceDataset}
            onClear={() => {
              clearAll();
              setPage("problem");
            }}
          />
        }
      />

      <main className="min-w-0 flex-1">
        {page === "problem" && <Problem onStart={() => setPage("dataset")} />}

        {page === "dataset" && (
          <BuildDataset
            dataset={dataset}
            onAddGlyph={addGlyph}
            onRemoveGlyph={removeGlyph}
            onAddSpecimen={addSpecimen}
            onRemoveSpecimen={removeSpecimen}
            onLoadSample={() => replaceDataset(buildSampleDataset())}
            onContinue={() => setPage("numbers")}
          />
        )}

        {page === "numbers" && (
          <IntoNumbers
            dataset={dataset}
            onBuildAlphabet={() => setPage("dataset")}
          />
        )}

        {page === "network" && (
          <TheNetwork
            dataset={dataset}
            onBuildAlphabet={() => setPage("dataset")}
          />
        )}

        {page === "wrong" && (
          <HowWrong
            dataset={dataset}
            onBuildAlphabet={() => setPage("dataset")}
          />
        )}

        {page === "training" && (
          <Learning
            dataset={dataset}
            onBuildAlphabet={() => setPage("dataset")}
          />
        )}

        {page === "loop" && (
          <WholeLoop
            dataset={dataset}
            onBuildAlphabet={() => setPage("dataset")}
          />
        )}

        {page === "predict" && (
          <ReadMyWriting
            dataset={dataset}
            onBuildAlphabet={() => setPage("dataset")}
          />
        )}

        {page === "break" && (
          <BreakIt
            dataset={dataset}
            onBuildAlphabet={() => setPage("dataset")}
          />
        )}

        {page === "layers" && (
          <MoreLayers
            dataset={dataset}
            onBuildAlphabet={() => setPage("dataset")}
          />
        )}
      </main>
    </div>
  );
}
