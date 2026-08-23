import { useMemo, useState } from "react";
import { CORPUS, followers } from "../lib/corpus";

/** A sentence from the corpus, and the position we are trying to predict. */
const TARGET = "the number of things that could sensibly follow has shrunk";
const CUT = TARGET.indexOf("shrunk");

const show = (c: string) => (c === " " ? "␣" : c === "\n" ? "⏎" : c);

/**
 * How much of the text before a character do you need in order to guess it?
 *
 * Not currently on any page, and not registered in GptWidget for that reason.
 * Part one states the problem and stops there; this argues against one
 * particular answer to it, which belongs beside the model that gives that
 * answer — the bigram — rather than before the reader has met one.
 *
 * Measured against the corpus rather than asserted: for each length of context,
 * how many distinct characters actually followed that exact run of text, and
 * how often the run occurred at all.
 *
 * The second number is the point of the figure. Candidates narrow as context
 * grows, but the evidence thins in the same step and hits bottom first, which
 * is exactly why a lookup table cannot be the model and something that
 * generalises has to be.
 */
export function HowMuchContext() {
  const [k, setK] = useState(1);

  const before = TARGET.slice(0, CUT);
  const answer = TARGET[CUT];
  const context = before.slice(Math.max(0, before.length - k));

  const { occurrences, next } = useMemo(() => followers(context), [context]);
  const candidates = [...next.entries()].sort((a, b) => b[1] - a[1]);
  const total = candidates.reduce((sum, [, n]) => sum + n, 0);

  /* One match is the target sentence finding itself. Reporting "1 character
     seen after it" would read as a confident prediction, which is the exact
     inverse of what has happened, so the readout changes rather than counts. */
  const exhausted = occurrences <= 1;

  return (
    <div className="border bg-paper-raised p-5 hairline">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <p className="eyebrow">
          Guess the next character, given only what is shown
        </p>
        <p className="mono-note text-graphite/70">
          corpus: {CORPUS.length.toLocaleString()} characters
        </p>
      </div>

      <p className="mt-3 font-mono text-sm break-all">
        <span className="text-graphite/40">
          {before.slice(0, Math.max(0, before.length - k))}
        </span>
        <span className="bg-plot/12 text-ink">{context}</span>
        <span className="ml-0.5 border-b-2 border-riso px-1 text-riso">?</span>
      </p>

      <label className="mt-6 block">
        <span className="mono-note text-graphite">
          {k} character{k === 1 ? "" : "s"} of context
        </span>
        <input
          type="range"
          min={1}
          max={40}
          value={k}
          onChange={(e) => setK(Number(e.target.value))}
          className="mt-2 w-full accent-riso"
          aria-label="How many characters of context are visible"
        />
      </label>

      <dl className="mt-5 flex flex-wrap gap-x-10 gap-y-3 border-t pt-4 hairline">
        <div>
          <dt className="eyebrow">This context occurs</dt>
          <dd
            className={`mt-0.5 font-mono text-sm ${exhausted ? "text-riso" : ""}`}
          >
            {occurrences} time{occurrences === 1 ? "" : "s"}
          </dd>
        </div>
        <div>
          <dt className="eyebrow">Characters seen after it</dt>
          <dd
            className={`mt-0.5 font-mono text-sm ${exhausted ? "text-riso" : ""}`}
          >
            {exhausted ? "no evidence" : candidates.length}
          </dd>
        </div>
      </dl>

      {!exhausted && candidates.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-1.5">
          {candidates.slice(0, 14).map(([c, n]) => (
            <li
              key={c}
              className={`border px-2 py-1 font-mono text-[0.6875rem] ${
                c === answer
                  ? "border-riso bg-riso/8 text-ink"
                  : "text-graphite hairline"
              }`}
              title={c === answer ? "the actual next character" : undefined}
            >
              {show(c)}{" "}
              <span className="text-graphite/70">
                {((n / total) * 100).toFixed(0)}%
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="caption mt-5 max-w-[34rem]">
        {exhausted ? (
          <>
            This run appears <strong>once</strong> — and that once is the
            sentence we are trying to predict, so there is nothing to count.
            For any sentence not already in the corpus the count here would be{" "}
            <strong>zero</strong>. The lookup table has run out of data, and it
            ran out fast.
          </>
        ) : candidates.length > 8 ? (
          <>
            Almost anything could come next. With this little to go on the model
            is guessing at the alphabet, and no amount of cleverness downstream
            can recover information that was never provided.
          </>
        ) : (
          <>
            The field has narrowed. More of the sentence means fewer things that
            sensibly follow — which is the entire argument for looking further
            back.
          </>
        )}
      </p>
    </div>
  );
}
