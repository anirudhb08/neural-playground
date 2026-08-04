import { useEffect, useState } from "react";
import {
  blockedByMixedContent,
  checkRunner,
  forgetConnection,
  parseConnectUrl,
  recallConnection,
  rememberConnection,
  type RunnerConnection,
  type RunnerEnvironment,
} from "../lib/runner";

/**
 * Connect the page to a PyTorch runner on the reader's own machine.
 *
 * Everything a tutorial teaches runs in the browser without this. What it buys
 * is the real library on real hardware, so the panel is written as an offer
 * rather than a requirement — a reader who never opens it should not feel they
 * are missing the tutorial.
 *
 * The install instructions are on the page rather than behind a link. Anything
 * that asks a reader to run a server on their own machine owes them the whole
 * command where they can see it, and an honest sentence about what it does.
 */
type Props = {
  connection: RunnerConnection | null;
  onChange: (connection: RunnerConnection | null, env: RunnerEnvironment | null) => void;
};

export function RunnerConnect({ connection, onChange }: Props) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [env, setEnv] = useState<RunnerEnvironment | null>(null);
  const [open, setOpen] = useState(false);
  const [safari, setSafari] = useState(false);

  // navigator is read in an effect rather than at module scope, because this
  // module is evaluated during the build where no such object exists.
  useEffect(() => setSafari(blockedByMixedContent()), []);

  // Pick a connection back up when moving between parts in the same tab.
  useEffect(() => {
    const saved = recallConnection();
    if (!saved || connection) return;
    checkRunner(saved)
      .then((info) => {
        setEnv(info);
        onChange(saved, info);
      })
      .catch(() => forgetConnection());
    // Deliberately once, on mount: this is a restore, not a subscription.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function connect() {
    const parsed = parseConnectUrl(url);
    if (!parsed.ok) return setProblem(parsed.reason);

    setBusy(true);
    setProblem(null);
    try {
      const info = await checkRunner(parsed.connection);
      rememberConnection(parsed.connection);
      setEnv(info);
      onChange(parsed.connection, info);
      setUrl("");
    } catch (error) {
      // A refused fetch and a wrong token look identical from here unless we
      // say so — fetch rejects with the same TypeError whether the port is
      // closed, the runner is gone, or the browser blocked it outright.
      const message = error instanceof Error ? error.message : String(error);
      setProblem(
        /token/i.test(message)
          ? message
          : safari
            ? "Safari blocks a page served over https from reaching http://localhost, and makes no exception for it. Chrome or Firefox will connect to the same runner."
            : `Nothing answered at that address. Is the runner still running? (${message})`,
      );
    } finally {
      setBusy(false);
    }
  }

  function disconnect() {
    forgetConnection();
    setEnv(null);
    onChange(null, null);
  }

  if (connection && env) {
    return (
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border bg-paper-raised px-4 py-3 hairline">
        <p className="mono-note">
          <span className="text-plot">● connected</span>{" "}
          <span className="text-graphite">
            Python {env.python}
            {env.torch ? ` · PyTorch ${env.torch} · ${env.device}` : " · PyTorch not installed"}
          </span>
        </p>
        <button
          type="button"
          onClick={disconnect}
          className="mono-note text-graphite underline underline-offset-4 hover:text-riso"
        >
          disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="border bg-paper-raised p-4 hairline">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <p className="eyebrow">Run this on your own PyTorch — optional</p>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="mono-note text-graphite underline underline-offset-4 hover:text-plot"
        >
          {open ? "hide" : "how"}
        </button>
      </div>

      <p className="caption mt-2 max-w-[34rem] text-graphite">
        The cells above run in this page and need nothing. PyTorch cannot be
        compiled into a browser, so to run the library version you start a small
        server on your machine and point the page at it.
      </p>

      {open && (
        <div className="mt-4 border-t pt-4 hairline">
          <p className="caption max-w-[34rem]">
            One file, standard library only, and short enough to read before you
            trust it — which you should, because it executes the code this page
            sends it, as you.
          </p>
          <pre className="mt-3 overflow-x-auto rounded-[2px] bg-ink/90 p-4 font-mono text-[0.8125rem] leading-[1.7] text-paper">
            <code>{`curl -O https://learn.welldun.ai/runner/welldun_runner.py
python welldun_runner.py`}</code>
          </pre>
          <p className="caption mt-3 max-w-[34rem] text-graphite">
            It prints a URL with a token on the end. Paste the whole line below.
            The token is what stops any other site you have open from reaching
            the runner, so it is new every time the runner starts.
          </p>
        </div>
      )}

      {safari && (
        <p className="caption mt-3 max-w-[34rem] text-riso">
          Safari will not connect to a runner. It blocks an https page from
          reaching http://localhost and, unlike Chrome and Firefox, makes no
          exception for your own machine. Everything else on this page still
          works.
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && connect()}
          placeholder="http://127.0.0.1:8731?token=…"
          spellCheck={false}
          className="min-w-0 flex-1 border bg-paper px-3 py-2 font-mono text-xs hairline focus:outline-none"
          aria-label="Runner URL"
        />
        <button
          type="button"
          onClick={connect}
          disabled={busy}
          className="border border-plot bg-plot px-4 py-2 font-mono text-[0.6875rem] tracking-[0.14em] text-paper uppercase disabled:opacity-50"
        >
          {busy ? "Checking…" : "Connect"}
        </button>
      </div>

      {problem && <p className="caption mt-3 max-w-[34rem] text-riso">{problem}</p>}
    </div>
  );
}
