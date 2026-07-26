import { useCallback, useRef, useState } from "react";
import { PythonStep } from "./PythonStep";

export type LabStep = {
  title: string;
  lead: string;
  code: string;
};

type Props = {
  steps: readonly LabStep[];
  /** Puts whatever the steps need into Python, before every run. */
  prepare: () => Promise<void>;
  /** Shown once every step has run at least once. */
  closing?: string;
};

/**
 * A short notebook: each cell explains one idea, runs real Python, and only
 * reveals the next once it has worked.
 */
export function PythonLab({ steps, prepare, closing }: Props) {
  const [unlocked, setUnlocked] = useState(0);
  // One counter across every cell, so re-running a cell bumps its number the
  // way it would in a notebook.
  const executions = useRef(0);
  const nextExecution = useCallback(() => (executions.current += 1), []);

  return (
    <div className="flex flex-col gap-8">
      <p className="border-l-2 border-plot/30 pl-4 text-sm leading-relaxed text-graphite">
        This is real Python with NumPy, running inside this page — there is no
        server. Change anything you like and run it again. Python remembers its
        variables between cells, so each one builds on the one above. Its bridge
        back into the browser is switched off, so nothing you run here can reach
        the network or your saved drawings.
      </p>

      {steps.map((step, i) =>
        i <= unlocked ? (
          <PythonStep
            key={step.title}
            index={i + 1}
            title={step.title}
            lead={step.lead}
            initialCode={step.code}
            prepare={prepare}
            nextExecution={nextExecution}
            onFirstRun={() => setUnlocked((u) => Math.max(u, i + 1))}
          />
        ) : null,
      )}

      {closing && unlocked >= steps.length && (
        <p className="border-t pt-8 text-[1.0625rem] leading-relaxed hairline">
          {closing}
        </p>
      )}
    </div>
  );
}
