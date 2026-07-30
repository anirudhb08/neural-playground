import { useMemo, useState } from "react";
import {
  applyNudge,
  chanceLevel,
  createNetwork,
  evaluate,
  nudgeFor,
  type Sample,
} from "../lib/network";

const ROUNDS = 200;
const W = 460;
const H = 120;

/**
 * The step size, across ten decades.
 *
 * Tiny rates visibly fail to arrive. Enormous ones — surprisingly — do not
 * blow up here, and that surprise is the lesson rather than a bug.
 */
export function WreckTheRate({
  train,
  classes,
}: {
  train: Sample[];
  classes: number;
}) {
  // 0-100 maps onto 0.001 up to 10,000,000.
  const [position, setPosition] = useState(30);
  const rate = Number(
    (0.001 * Math.pow(10, (position / 100) * 10)).toPrecision(2),
  );

  const history = useMemo(() => {
    let net = createNetwork(classes);
    const out: number[] = [];
    for (let i = 0; i < ROUNDS; i++) {
      net = applyNudge(net, nudgeFor(net, train), rate);
      const { loss } = evaluate(net, train);
      out.push(Number.isFinite(loss) ? loss : chanceLevel(classes) * 4);
    }
    return out;
  }, [rate, train, classes]);

  const ceiling = Math.max(chanceLevel(classes) * 1.2, ...history);
  const final = history[history.length - 1];
  const path = history
    .map((loss, i) => {
      const x = (i / (ROUNDS - 1)) * W;
      const y = H - Math.min(loss / ceiling, 1) * H;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  const crawling = final > chanceLevel(classes) * 0.5;
  const enormous = rate > 500;

  return (
    <div className="border bg-paper-raised p-5 hairline">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-[120px] w-full border bg-paper hairline"
        preserveAspectRatio="none"
        role="img"
        aria-label="Loss over 200 rounds at the chosen step size"
      >
        <path
          d={path}
          fill="none"
          style={{ stroke: crawling ? "var(--color-riso)" : "var(--color-plot)" }}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <label className="mt-4 block">
        <span className="mono-note text-graphite">
          step size <span className="text-ink">{rate}</span> · loss after{" "}
          {ROUNDS} rounds <span className="text-ink">{final.toFixed(4)}</span>
        </span>
        <input
          type="range"
          min={0}
          max={100}
          value={position}
          onChange={(e) => setPosition(Number(e.target.value))}
          className="mt-2 w-full accent-riso"
        />
        <span className="flex justify-between pt-1 font-mono text-[0.625rem] text-graphite">
          <span>0.001</span>
          <span>10,000,000</span>
        </span>
      </label>

      <p className="mt-4 max-w-[34rem] caption">
        {crawling
          ? "Nothing is broken. The steps are simply so short that after 200 rounds it has barely left where it started — it would get there eventually, and you would not wait."
          : enormous
            ? "Still fine. A step size of thousands should be absurd, and it is, and it works anyway. Why that happens is worth knowing."
            : "This is the comfortable range. The loss falls quickly and stays down."}
      </p>
    </div>
  );
}
