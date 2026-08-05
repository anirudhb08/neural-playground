import { useEffect, useState } from "react";
import { SITE } from "../site";
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
  /** Hostname awaiting a yes, when it is not this machine. */
  const [confirming, setConfirming] = useState<string | null>(null);

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

  async function connect(confirmedRemote = false) {
    const result = parseConnectUrl(url);
    if (!result.ok) return setProblem(result.reason);

    // A remote host gets one question first, naming it. The reader pasted the
    // URL, but pasting is not consent when the line may have been handed to
    // them — and the thing on the other end runs whatever this page sends.
    if (result.parsed.remote && !confirmedRemote) {
      setProblem(null);
      return setConfirming(new URL(result.parsed.connection.origin).hostname);
    }
    setConfirming(null);

    setBusy(true);
    setProblem(null);
    try {
      const info = await checkRunner(result.parsed.connection);
      rememberConnection(result.parsed.connection);
      setEnv(info);
      onChange(result.parsed.connection, info);
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
        compiled into a browser, so to run the library version you point the
        page at a PyTorch somewhere you control. There are two ways to have one.
      </p>

      {open && (
        <div className="mt-4 grid gap-px border-t pt-4 hairline sm:grid-cols-2 sm:gap-6">
          {/* Both offered at the moment of choosing, rather than the local one
              with the paid one as a footnote. They suit different readers and
              the panel should not decide which reader this is. */}
          <div>
            <p className="mono-note text-ink">On this machine</p>
            <p className="caption mt-1 text-graphite">
              Free, and the fastest of the three. Needs Python and about 2 GB of
              disk. One file, standard library only, and short enough to read
              before you trust it — which you should, because it runs what this
              page sends it, as you.
            </p>
            {/* Wraps rather than scrolls: this sits in a half-width column, and
                a command the reader has to drag sideways to read is worse than
                one that takes two lines. */}
            <pre className="mt-3 rounded-[2px] bg-ink/90 p-3 font-mono text-[0.75rem] leading-[1.7] break-words whitespace-pre-wrap text-paper">
              <code>{`curl -O https://learn.welldun.ai/runner/welldun_runner.py
pip install torch
python welldun_runner.py`}</code>
            </pre>
            {safari && (
              <p className="caption mt-2 text-riso">Safari cannot reach this one.</p>
            )}
          </div>

          <div>
            <p className="mono-note text-ink">Somewhere you deploy it</p>
            <p className="caption mt-1 text-graphite">
              About $5 a month, and nothing to install. Worth it if you cannot
              run Python where you are reading — a work machine you do not
              control, a Chromebook, an iPad — and it is the only one that works
              in Safari, because it is https.
            </p>
            <p className="caption mt-3">
              <a
                href={SITE.railway.url}
                rel="noopener"
                className="underline underline-offset-4"
              >
                Deploy it on Railway →
              </a>
            </p>
            <p className="caption mt-1 text-graphite">
              Builds the Dockerfile in{" "}
              <code>public/runner/</code> straight from a fork.{" "}
              <a href="/pytorch/run-it/" className="underline underline-offset-4">
                The steps, and what you are agreeing to
              </a>
              .
            </p>
            {SITE.railway.paid && (
              // Rendered from the same value as the link above, so the paid
              // version cannot ship without this sentence beside it.
              <p className="caption mt-2 text-graphite">
                That is a referral link: you get $20 of credit, I earn a
                commission. It is also the slower and more expensive of the two
                — the free option on the left is faster.
              </p>
            )}
          </div>

          <p className="caption mt-1 text-graphite sm:col-span-2">
            Either way you end up with a URL that has a token on the end. Paste
            the whole line below. The token is the only thing stopping any other
            site you have open from reaching the runner.
          </p>
        </div>
      )}

      {safari && (
        <p className="caption mt-3 max-w-[34rem] text-riso">
          Safari will not connect to a runner on this machine. It blocks an
          https page from reaching http://localhost and, unlike Chrome and
          Firefox, makes no exception for your own machine. A deployed runner
          works, because it is https — everything else on this page is
          unaffected either way.
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && connect()}
          onFocus={() => setConfirming(null)}
          placeholder="http://127.0.0.1:8731?token=…"
          spellCheck={false}
          className="min-w-0 flex-1 border bg-paper px-3 py-2 font-mono text-xs hairline focus:outline-none"
          aria-label="Runner URL"
        />
        <button
          type="button"
          onClick={() => connect()}
          disabled={busy}
          className="border border-plot bg-plot px-4 py-2 font-mono text-[0.6875rem] tracking-[0.14em] text-paper uppercase disabled:opacity-50"
        >
          {busy ? "Checking…" : "Connect"}
        </button>
      </div>

      {confirming && (
        <div className="mt-3 border-l-2 border-riso pl-3">
          <p className="caption max-w-[34rem]">
            <strong>{confirming}</strong> is not this machine. Whatever is
            running there will receive every cell you run, and can send back
            anything it likes as the output. Connect only if you deployed it.
          </p>
          <div className="mt-2 flex gap-4">
            <button
              type="button"
              onClick={() => connect(true)}
              className="mono-note text-riso underline underline-offset-4"
            >
              yes, it is mine — connect
            </button>
            <button
              type="button"
              onClick={() => setConfirming(null)}
              className="mono-note text-graphite underline underline-offset-4"
            >
              cancel
            </button>
          </div>
        </div>
      )}

      {problem && <p className="caption mt-3 max-w-[34rem] text-riso">{problem}</p>}
    </div>
  );
}
