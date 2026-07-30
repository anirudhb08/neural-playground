import type { ReactNode } from "react";

export type Stage = {
  id: string;
  name: string;
  ready: boolean;
};

type Props = {
  stages: readonly Stage[];
  current: string;
  onSelect: (id: string) => void;
  footer: ReactNode;
};

export function Sidebar({ stages, current, onSelect, footer }: Props) {
  const built = stages.filter((s) => s.ready);
  const coming = stages.filter((s) => !s.ready);

  return (
    <div className="border-b hairline lg:sticky lg:top-0 lg:h-screen lg:w-[15rem] lg:shrink-0 lg:border-r lg:border-b-0">
      <div className="flex h-full flex-col gap-6 px-5 py-6">
        <p className="font-display text-sm leading-tight font-extrabold tracking-[-0.01em]">
          Neural
          <br />
          Playground
        </p>

        <nav aria-label="Stages" className="min-h-0 flex-1 overflow-y-auto">
          <ol className="flex flex-col gap-0.5">
            {built.map((stage, i) => {
              const active = stage.id === current;
              return (
                <li key={stage.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(stage.id)}
                    aria-current={active ? "step" : undefined}
                    className={`flex w-full items-baseline gap-2.5 border-l-2 py-1.5 pl-3 text-left transition-colors ${
                      active
                        ? "border-riso text-ink"
                        : "border-transparent text-graphite hover:border-plot/40 hover:text-plot"
                    }`}
                  >
                    <span className="mono-note">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      className={`text-sm ${active ? "font-semibold" : ""}`}
                    >
                      {stage.name}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          {coming.length > 0 && (
            <>
              <p className="eyebrow pt-6 pl-3">Still to come</p>
              <ol className="mt-1.5 flex flex-col gap-0.5">
                {coming.map((stage, i) => (
                  <li key={stage.id}>
                    <span className="flex items-baseline gap-2.5 border-l-2 border-transparent py-1.5 pl-3 text-graphite/55">
                      <span className="mono-note">
                        {String(built.length + i + 1).padStart(2, "0")}
                      </span>
                      <span className="text-sm">{stage.name}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </nav>

        <div className="border-t pt-5 hairline">
          {footer}
          <a
            href="https://github.com/anirudh-valyx/neural-playground"
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block mono-note text-plot underline underline-offset-4 hover:text-riso"
          >
            Source on GitHub
          </a>
        </div>
      </div>
    </div>
  );
}
