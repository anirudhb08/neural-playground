import { useState } from "react";

/**
 * One chunk of text, cut into inputs and answers by shifting it one along.
 *
 * The figure exists for a single moment: the reader widening the window and
 * watching the count of training examples go up with it, from a text nobody
 * annotated. Everything else here — the two rows, the offset, the pairs — is in
 * service of making that arithmetic visible rather than asserted.
 *
 * The same sentence as the lab on this page, deliberately. A reader who runs
 * the cells should see the figure's numbers come back out of Python.
 */
const TEXT = "the cat sat on the mat and the dog sat on the log";

const show = (c: string) => (c === " " ? "␣" : c);

export function ContextWindow() {
  const [block, setBlock] = useState(8);
  const [start, setStart] = useState(0);

  // The chunk is one longer than the window: x needs `block` characters and y
  // needs to reach one further, which is the entire trick this figure teaches.
  const maxStart = TEXT.length - block - 1;
  const from = Math.min(start, maxStart);
  const chunk = TEXT.slice(from, from + block + 1);
  const x = chunk.slice(0, block);
  const y = chunk.slice(1);

  const cell =
    "flex h-7 w-7 shrink-0 items-center justify-center border font-mono text-[0.6875rem]";

  return (
    <div className="border bg-paper-raised p-5 hairline">
      <p className="eyebrow">The text, with one chunk taken out of it</p>

      <p className="mt-3 font-mono text-sm break-all">
        <span className="text-graphite/40">{TEXT.slice(0, from)}</span>
        <span className="bg-plot/12 text-ink">{chunk}</span>
        <span className="text-graphite/40">{TEXT.slice(from + block + 1)}</span>
      </p>

      <div className="mt-6 flex flex-wrap gap-x-10 gap-y-4">
        <label className="min-w-[12rem] flex-1">
          <span className="mono-note text-graphite">
            window: {block} character{block === 1 ? "" : "s"}
          </span>
          <input
            type="range"
            min={1}
            max={12}
            value={block}
            onChange={(e) => {
              const next = Number(e.target.value);
              setBlock(next);
              setStart((s) => Math.min(s, TEXT.length - next - 1));
            }}
            className="mt-2 w-full accent-riso"
            aria-label="Context window size"
          />
        </label>
        <label className="min-w-[12rem] flex-1">
          <span className="mono-note text-graphite">starting at {from}</span>
          <input
            type="range"
            min={0}
            max={maxStart}
            value={from}
            onChange={(e) => setStart(Number(e.target.value))}
            className="mt-2 w-full accent-riso"
            aria-label="Where the chunk starts"
          />
        </label>
      </div>

      {/* Two rows, the lower one pushed right by exactly one cell. The offset
          is the lesson, so it is drawn rather than described. */}
      <div className="mt-6 overflow-x-auto">
        <div className="flex items-center gap-2">
          <span className="mono-note w-4 text-graphite">x</span>
          <div className="flex gap-1">
            {[...x].map((c, i) => (
              <span key={i} className={`${cell} text-ink hairline`}>
                {show(c)}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="mono-note w-4 text-graphite">y</span>
          <div className="flex gap-1">
            <span className="h-7 w-7 shrink-0" aria-hidden="true" />
            {[...y].map((c, i) => (
              <span key={i} className={`${cell} border-riso bg-riso/8 text-ink`}>
                {show(c)}
              </span>
            ))}
          </div>
        </div>
      </div>

      <dl className="mt-5 flex flex-wrap gap-x-10 gap-y-3 border-t pt-4 hairline">
        <div>
          <dt className="eyebrow">Characters taken</dt>
          <dd className="mt-0.5 font-mono text-sm">{block + 1}</dd>
        </div>
        <div>
          <dt className="eyebrow">Training examples in them</dt>
          <dd className="mt-0.5 font-mono text-sm text-riso">{block}</dd>
        </div>
        <div>
          <dt className="eyebrow">Answers anyone wrote down</dt>
          <dd className="mt-0.5 font-mono text-sm">0</dd>
        </div>
      </dl>

      <ul className="mt-4 flex list-none flex-col gap-1 p-0">
        {[...Array(block)].map((_, i) => (
          <li key={i} className="font-mono text-[0.6875rem]">
            <span className="inline-block w-[9rem] text-right text-graphite">
              {[...x.slice(0, i + 1)].map(show).join("")}
            </span>
            <span className="px-3 text-graphite/50">→</span>
            <span className="text-riso">{show(y[i])}</span>
          </li>
        ))}
      </ul>

      <p className="caption mt-5 max-w-[34rem]">
        Every pair was already in the sentence. Widening the window does not
        need more text or more labelling — it cuts the same text into longer
        questions, and the answer to each one was always the character sitting
        after it.
      </p>
    </div>
  );
}
