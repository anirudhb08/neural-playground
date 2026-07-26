/** Five hands writing the same letter. The variation is the whole problem. */
const HANDS = [
  { bowl: "M58 42C58 30 36 27 29 39 22 51 28 67 42 67 52 67 58 59 58 49", stem: "M58 29 60 69", rotate: -7, width: 7 },
  { bowl: "M62 38C60 27 38 25 30 36 22 48 27 66 43 65 53 64 61 56 61 46", stem: "M61 27 64 66", rotate: 6, width: 5 },
  { bowl: "M56 45C57 31 33 28 27 41 22 53 30 68 44 66 54 65 57 57 56 48", stem: "M56 30 57 67", rotate: -2, width: 9 },
  { bowl: "M64 40C62 28 39 23 31 37 24 49 29 69 45 66 55 65 63 57 62 47", stem: "M63 27 62 68", rotate: 11, width: 6 },
  { bowl: "M59 41C59 29 35 25 28 40 22 54 29 70 44 67 53 66 59 58 59 49", stem: "M59 27 60 68", rotate: -12, width: 8 },
];

function Hand({ index }: { index: number }) {
  const hand = HANDS[index];
  return (
    <svg
      viewBox="0 0 90 100"
      className="h-20 w-auto shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth={hand.width}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <g transform={`rotate(${hand.rotate} 45 50)`}>
        <path d={hand.bowl} />
        <path d={hand.stem} />
      </g>
    </svg>
  );
}

export function Problem({ onStart }: { onStart: () => void }) {
  return (
    <article className="mx-auto max-w-2xl px-5 pb-20">
      <p className="eyebrow pt-16">The problem</p>

      <div
        className="mt-8 flex flex-wrap items-end justify-center gap-6 border-y py-10 text-ink hairline"
        role="img"
        aria-label="The letter a, handwritten five different ways"
      >
        {HANDS.map((_, i) => (
          <Hand key={i} index={i} />
        ))}
      </div>
      <p className="mt-3 text-center font-mono text-xs text-graphite">
        Five people wrote the letter a.
      </p>

      <h1 className="mt-12 font-display text-3xl leading-[1.15] font-extrabold tracking-[-0.02em] text-balance sm:text-4xl">
        How does a computer know these are all the same letter?
      </h1>

      <div className="mt-10 flex flex-col gap-9 text-[1.0625rem] leading-relaxed">
        <section>
          <p className="eyebrow">Idea 1 — compare pictures</p>
          <p className="mt-2">
            Save one picture of the letter <em>a</em>. When a new drawing comes
            in, check if it matches.
          </p>
          <p className="mt-4">
            Now look at the five above. None of them match each other. One is
            bigger. One leans. One is drawn with a thicker pen. A picture only
            ever matches itself.
          </p>
        </section>

        <section>
          <p className="eyebrow">Idea 2 — write rules</p>
          <p className="mt-2">
            So write a rule instead. Something like: a round shape with a line
            down the right side.
          </p>
          <p className="mt-4">
            Then someone draws an <em>a</em> where the round part does not
            close. Your rule says no. But it is still an <em>a</em>. So you add
            another rule. Then another. It never ends.
          </p>
          <p className="mt-4">
            Here is the real trouble. You can spot an <em>a</em> in a split
            second. But you cannot say how you did it. And you cannot write
            down a rule you cannot explain.
          </p>
        </section>

        <section>
          <p className="eyebrow">What actually works</p>
          <p className="mt-2">
            This is not really about the letter <em>a</em>. Plenty of problems
            work the same way. Telling a cat from a dog. Spotting a face in a
            photo. Naming a song from two seconds of it. You know the answer the
            moment you see it, and you still cannot write the rule.
          </p>
          <p className="mt-4">
            That is where a neural network comes in.
          </p>
          <p className="mt-4">
            It is not a brain, and it is not magic. It is a big pile of numbers,
            plus a fixed set of steps that push your drawing through those
            numbers to reach an answer.
          </p>
          <p className="mt-4">
            At the start the numbers are random, so the answers are nonsense.
            Each time it answers, you tell it how wrong it was. It nudges its
            numbers a little, in the direction that would have been less wrong.
            Then it tries again.
          </p>
          <p className="mt-4">
            Do that a few thousand times and the numbers settle into something
            that works. Nobody wrote them down. The network found them by being
            wrong, over and over.
          </p>
        </section>
      </div>

      <div className="mt-14 border-t pt-10 hairline">
        <p className="text-[1.0625rem] leading-relaxed">
          You are going to build one. A real one, a piece at a time.
        </p>
        <p className="mt-4 text-[1.0625rem] leading-relaxed">
          But it needs something to learn from first: a pile of examples, each
          one labelled with the right answer. That pile is called a dataset, and
          you are going to make your own.
        </p>
        <p className="mt-4 text-[1.0625rem] leading-relaxed">
          You will invent a few characters that do not exist, and draw each one
          several times. Those drawings become the examples. And because you
          made the characters up, nothing out there has ever seen them. No
          existing program can help you. Everything this network learns will
          have come from you.
        </p>
        <button
          type="button"
          onClick={onStart}
          className="mt-8 bg-ink px-7 py-3.5 font-mono text-xs tracking-[0.14em] text-paper uppercase transition-colors hover:bg-plot"
        >
          Invent an alphabet
        </button>
      </div>
    </article>
  );
}
