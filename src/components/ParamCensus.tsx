/**
 * Where the 12,800 numbers live.
 *
 * A static census, because the insight is a proportion, not an interaction:
 * two-thirds of the model is the thinking layer, and the attention machinery
 * everyone talks about is under a quarter of it. Counts match the lab's
 * census cell exactly and change only if the architecture does.
 */
const PIECES = [
  { name: "token table", n: 416, note: "who each character is" },
  { name: "position table", n: 512, note: "where each seat is" },
  { name: "attention (Q, K, V)", n: 3072, note: "the gathering" },
  { name: "feed-forward", n: 8192, note: "the thinking" },
  { name: "layer norms", n: 192, note: "the tidying" },
  { name: "output head", n: 416, note: "description → scores" },
];
const TOTAL = PIECES.reduce((s, p) => s + p.n, 0);

export function ParamCensus() {
  const max = Math.max(...PIECES.map((p) => p.n));
  return (
    <div className="border bg-paper-raised p-5 hairline">
      <p className="eyebrow">Where the {TOTAL.toLocaleString()} numbers live</p>
      <ul className="mt-4 flex list-none flex-col gap-2.5 p-0">
        {PIECES.map((p) => (
          <li key={p.name}>
            <div className="flex items-baseline justify-between gap-4">
              <span className="font-mono text-[0.6875rem] text-ink">{p.name}</span>
              <span className="mono-note text-graphite">
                {p.n.toLocaleString()} · {((p.n / TOTAL) * 100).toFixed(0)}%
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span
                className={`h-3 ${p.name === "feed-forward" ? "bg-riso/70" : "bg-plot/60"}`}
                style={{ width: `${(p.n / max) * 88}%` }}
              />
            </div>
            <p className="mono-note mt-0.5 text-graphite/70">{p.note}</p>
          </li>
        ))}
      </ul>
      <p className="caption mt-4 max-w-[34rem]">
        Two-thirds of the model is the thinking layer, and the attention
        machinery is under a quarter. The tables that started the tutorial —
        who and where — are a fraction of either.
      </p>
    </div>
  );
}
