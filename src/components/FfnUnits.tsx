import { useState } from "react";

/**
 * Three feed-forward units under the reader's hand.
 *
 * The feed-forward layer is the most abstract object in the tutorial, and
 * prose about "128 learned patterns" kept failing readers who had followed
 * everything else. What prose cannot show is silence — that a unit adds
 * exactly nothing the instant the evidence stops matching it. Steering the
 * evidence and watching units cut in and out is that lesson, so every number
 * stays small enough to check by hand against the table above the widget.
 *
 * The default evidence is the table's first row, so the widget opens already
 * agreeing with what the reader just verified on paper.
 */
const UNITS = [
  { pattern: [1, -1], contrib: [1, 0.5] },
  { pattern: [0, 1], contrib: [-0.5, 1] },
  { pattern: [-1, -1], contrib: [0.5, -1] },
] as const;

/* Largest possible match is pattern [−1,−1] against evidence [−1,−1] = 2,
   so bars are drawn against 2 and can never clip. */
const FULL = 2;

const f1 = (v: number) => (v >= 0 ? "+" : "") + v.toFixed(1);
const f2 = (v: number) => (v >= 0 ? "+" : "") + v.toFixed(2);
const vec = (v: readonly number[], fmt = f1) => `[${v.map(fmt).join("  ")}]`;

export function FfnUnits() {
  const [g1, setG1] = useState(0.8);
  const [g2, setG2] = useState(-0.6);

  const rows = UNITS.map(({ pattern, contrib }) => {
    const match = pattern[0] * g1 + pattern[1] * g2;
    const fires = Math.max(match, 0);
    return { pattern, contrib, match, fires, adds: contrib.map((c) => c * fires) };
  });
  const out = [0, 1].map((j) => rows.reduce((s, r) => s + r.adds[j], 0));

  return (
    <div className="border bg-paper-raised p-5 hairline">
      <p className="eyebrow">Steer the evidence, watch the ifs fire</p>

      <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-3">
        {(
          [
            ["first number", g1, setG1],
            ["second number", g2, setG2],
          ] as const
        ).map(([label, v, set]) => (
          <label key={label} className="block w-[10rem]">
            <span className="mono-note text-graphite">
              evidence, {label}: {f1(v)}
            </span>
            <input
              type="range"
              min={-1}
              max={1}
              step={0.1}
              value={v}
              onChange={(e) => set(Number(e.target.value))}
              className="mt-2 w-full accent-riso"
              aria-label={`Evidence, ${label}`}
            />
          </label>
        ))}
        <p className="mono-note text-graphite">
          evidence = {vec([g1, g2])}
        </p>
      </div>

      <div className="mt-5 overflow-x-auto">
        <div className="grid min-w-[26rem] grid-cols-[auto_auto_minmax(6rem,1fr)_auto] items-center gap-x-6 gap-y-2">
          <p className="mono-note text-graphite">pattern</p>
          <p className="mono-note text-graphite">match</p>
          <p className="mono-note text-graphite">fires</p>
          <p className="mono-note text-graphite">adds to the description</p>

          {rows.map((r, i) => {
            const silent = r.fires === 0;
            return (
              // Rows are grid cells, so the key sits on a fragment per unit.
              <div key={i} className="contents">
                <p className="font-mono text-sm">{vec(r.pattern)}</p>
                <p className="font-mono text-sm">{f2(r.match)}</p>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-full max-w-[7rem] bg-paper-deep">
                    <div
                      className="h-2 bg-plot"
                      style={{ width: `${(r.fires / FULL) * 100}%` }}
                    />
                  </div>
                  <span className="font-mono text-sm">{r.fires.toFixed(2)}</span>
                </div>
                <p className={`font-mono text-sm ${silent ? "text-graphite" : ""}`}>
                  {silent ? "nothing" : vec(r.adds, f2)}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <p className="mono-note mt-4 border-t pt-4 hairline">
        bank output — the fired contributions, summed: <span className="text-plot">{vec(out, f2)}</span>
      </p>

      <p className="caption mt-4 max-w-[34rem]">
        Slide the evidence to <code>[-0.8, +0.6]</code> — the first unit's
        exact opposite. It does not fire negatively; it goes silent, and the
        second unit takes over. Every position of the two sliders wakes a
        different subset of units, which is how a bank of fixed rules still
        answers differently for every different piece of evidence.
      </p>
    </div>
  );
}
