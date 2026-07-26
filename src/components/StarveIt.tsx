import { useMemo, useState } from "react";
import {
  applyNudge,
  createNetwork,
  evaluate,
  nudgeFor,
  type Sample,
} from "../lib/network";

const ROUNDS = 400;

/**
 * Two ways to sabotage the training set: give it less, or give it lies.
 * Only the second one reliably hurts a pair of very distinct characters,
 * which is itself worth seeing.
 */
export function StarveIt({
  train,
  held,
  classes,
}: {
  train: Sample[];
  held: Sample[];
  classes: number;
}) {
  const most = Math.max(
    1,
    ...Array.from({ length: classes }, (_, c) =>
      train.filter((s) => s.label === c).length,
    ),
  );
  const [perClass, setPerClass] = useState(most);
  const [lies, setLies] = useState(0);

  const { trainReport, heldReport, used, maxLies } = useMemo(() => {
    const slice: Sample[] = [];
    for (let c = 0; c < classes; c++) {
      slice.push(...train.filter((s) => s.label === c).slice(0, perClass));
    }
    // Flip the first few labels, so the same slider position always lies
    // about the same drawings.
    const spoiled = slice.map((s, i) =>
      i < lies ? { ...s, label: (s.label + 1) % classes } : s,
    );
    let net = createNetwork(classes);
    for (let i = 0; i < ROUNDS; i++) {
      net = applyNudge(net, nudgeFor(net, spoiled), 0.5);
    }
    return {
      used: slice.length,
      maxLies: Math.max(0, Math.floor(slice.length / 2)),
      trainReport: evaluate(net, spoiled),
      heldReport: evaluate(net, held),
    };
  }, [perClass, lies, train, held, classes]);

  const gap = trainReport.accuracy - heldReport.accuracy;

  return (
    <div className="border bg-paper-raised p-5 hairline">
      <label className="block">
        <span className="font-mono text-[0.6875rem] text-graphite">
          give it less — {perClass} drawing{perClass === 1 ? "" : "s"} of each
          character, {used} in total
        </span>
        <input
          type="range"
          min={1}
          max={most}
          value={perClass}
          onChange={(e) => {
            const next = Number(e.target.value);
            setPerClass(next);
            setLies((l) => Math.min(l, Math.floor((next * classes) / 2)));
          }}
          className="mt-2 w-full accent-plot"
        />
      </label>

      <label className="mt-4 block">
        <span className="font-mono text-[0.6875rem] text-graphite">
          lie to it — {lies} of those {used} are labelled as the wrong character
        </span>
        <input
          type="range"
          min={0}
          max={Math.max(1, maxLies)}
          value={lies}
          onChange={(e) => setLies(Number(e.target.value))}
          className="mt-2 w-full accent-riso"
        />
      </label>

      <div className="mt-5 grid grid-cols-3 gap-4 border-y py-4 hairline">
        <div>
          <p className="eyebrow">Loss</p>
          <p className="mt-0.5 font-mono text-lg">
            {trainReport.loss.toFixed(4)}
          </p>
        </div>
        <div>
          <p className="eyebrow">On what it studied</p>
          <p className="mt-0.5 font-mono text-lg text-plot">
            {(trainReport.accuracy * 100).toFixed(0)}%
          </p>
        </div>
        <div>
          <p className="eyebrow">On what it has never seen</p>
          <p className={`mt-0.5 font-mono text-lg ${gap > 0 ? "text-riso" : ""}`}>
            {(heldReport.accuracy * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      <p className="mt-4 max-w-[34rem] text-sm leading-relaxed">
        {lies > 0 && gap > 0
          ? `You told it ${lies} lie${lies === 1 ? "" : "s"}, and it believed every one. It still scores perfectly on the drawings it studied — it simply memorised the lies too — while collapsing on everything else. That gap is the only warning you would ever get.`
          : lies > 0
            ? `${lies} lie${lies === 1 ? "" : "s"} in, and it is still coping. Push it further.`
            : gap > 0
              ? "A gap has opened. It does better on what it studied than on what it has not seen, which is the signature of memorising rather than learning."
              : "No gap. It does as well on drawings it has never seen as on the ones it studied — with characters this distinct, even a handful of examples is enough."}
      </p>
    </div>
  );
}
