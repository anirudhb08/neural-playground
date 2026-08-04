import { useMemo, useState } from "react";

/**
 * Text in, numbers out, text back.
 *
 * The integers themselves are the least interesting thing here and the figure
 * treats them that way. What it exists to show is the two states either side of
 * the happy path: the round trip landing exactly where it started, and what
 * happens the moment a character arrives that the vocabulary has never seen.
 * A tokenizer that only ever demonstrates success teaches the wrong lesson,
 * because the failure is the part with consequences.
 *
 * The training text is fixed rather than editable. Letting a reader change it
 * would put two moving parts on screen — vocabulary and sample — and the point
 * is what happens when the sample strays outside a vocabulary that is holding
 * still.
 */
const TRAINING = "the cat sat on the mat";

/** A space would otherwise render as a gap with a number under it. */
const show = (c: string) => (c === " " ? "␣" : c);

export function Tokenizer() {
  const [sample, setSample] = useState("cat sat");

  // Sorted, for the reason the last lab cell demonstrates: the numbers are
  // meaningless except against the table that produced them, so the table has
  // to be one anybody can rebuild identically.
  const chars = useMemo(() => [...new Set(TRAINING)].sort(), []);
  const stoi = useMemo(
    () => new Map(chars.map((c, i) => [c, i] as const)),
    [chars],
  );

  const encoded = [...sample].map((ch) => ({ ch, n: stoi.get(ch) }));
  const missing = [...new Set(encoded.filter((e) => e.n === undefined).map((e) => e.ch))];
  const complete = missing.length === 0 && sample.length > 0;
  // Decoded through itos rather than reusing `sample`, so the round-trip line
  // below is an actual check and not a restatement of the input.
  const decoded = complete ? encoded.map((e) => chars[e.n!]).join("") : null;

  return (
    <div className="border bg-paper-raised p-5 hairline">
      <p className="eyebrow">The vocabulary, from “{TRAINING}”</p>

      <ul className="mt-3 flex list-none flex-wrap gap-1.5 p-0">
        {chars.map((c, i) => (
          <li
            key={c}
            className="flex flex-col items-center border px-2.5 py-1 font-mono text-[0.6875rem] hairline"
          >
            <span className="text-ink">{show(c)}</span>
            <span className="text-graphite">{i}</span>
          </li>
        ))}
      </ul>
      <p className="mono-note mt-2 text-graphite">
        {chars.length} characters — everything the model can ever read or write
      </p>

      <label className="mt-6 block">
        <span className="eyebrow">Text to encode</span>
        <input
          value={sample}
          onChange={(e) => setSample(e.target.value)}
          spellCheck={false}
          className="mt-2 w-full border bg-paper px-3 py-2 font-mono text-sm hairline focus:outline-none"
          aria-label="Text to encode"
        />
      </label>

      {sample.length > 0 && (
        <ul className="mt-5 flex list-none flex-wrap gap-1.5 p-0">
          {encoded.map((e, i) => (
            <li
              key={i}
              className={`flex flex-col items-center border px-2.5 py-1 font-mono text-[0.6875rem] ${
                e.n === undefined
                  ? "border-riso bg-riso/8 text-riso"
                  : "text-ink hairline"
              }`}
            >
              <span>{show(e.ch)}</span>
              <span className={e.n === undefined ? "" : "text-graphite"}>
                {e.n ?? "?"}
              </span>
            </li>
          ))}
        </ul>
      )}

      <dl className="mt-5 border-t pt-4 hairline">
        <dt className="eyebrow">Decoded back</dt>
        {/* Three states, not two. An empty box is neither a round trip nor a
            failure, and showing "KeyError" for it would teach the wrong thing
            about when this actually breaks. */}
        <dd className="mt-1 font-mono text-sm break-all">
          {complete ? (
            <span>“{decoded}”</span>
          ) : missing.length > 0 ? (
            <span className="text-riso">
              KeyError: {missing.map((c) => `'${show(c)}'`).join(", ")}
            </span>
          ) : (
            <span className="text-graphite">—</span>
          )}
        </dd>
      </dl>

      <p className="caption mt-4 max-w-[34rem]">
        {complete ? (
          <>
            <span className="figure-value">decode(encode(text)) == text</span> is{" "}
            <strong>True</strong>. Nothing was lost on the way out or the way
            back, which is the only property this stage owes anybody.
          </>
        ) : missing.length > 0 ? (
          <>
            {missing.length === 1 ? "That character" : "Those characters"} never
            appeared in the training text, so {missing.length === 1 ? "it has" : "they have"}{" "}
            no number. Encoding stops rather than substituting something — a
            quiet stand-in would be trained on as if it meant a real character,
            and the mistake would surface much later.
          </>
        ) : (
          <>Type something above. Only the ten characters listed will encode.</>
        )}
      </p>
    </div>
  );
}
