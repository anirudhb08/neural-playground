/**
 * Talking to a PyTorch runner on the reader's own machine.
 *
 * Pyodide gives CPython and NumPy and will not give PyTorch, so the parts of
 * the tutorials that want the real library hand their cells to a small server
 * the reader starts themselves (see runner/welldun_runner.py). Everything the
 * tutorials teach still runs in the browser on NumPy; this is the tier for
 * seeing the same thing in the library people actually ship.
 */

export type RunnerEnvironment = {
  python: string;
  torch: string | null;
  device: string | null;
};

export type RunnerConnection = {
  origin: string;
  token: string;
};

export type RunnerResult = {
  stdout: string;
  error: string | null;
};

/**
 * Hostnames we are willing to send code to. Anything else is refused.
 *
 * This is the load-bearing rule of the whole feature, and it is not about
 * politeness. The page POSTs arbitrary Python to whatever endpoint it is
 * given, so a link like ?runner=https://someone-elses-host/exec would turn
 * "paste your connect URL" into a way of running the reader's cells — and
 * their data — on a stranger's machine. Loopback only means the worst a
 * crafted link can do is fail.
 */
const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

/**
 * Safari refuses to load http:// subresources from an https:// page and makes
 * no exception for loopback, where Chrome and Firefox both do. There is no
 * workaround worth inflicting on a reader — a self-signed certificate for
 * localhost costs more explaining than the feature is worth — so the page
 * detects it and says so instead of showing a fetch failure with no cause.
 *
 * Checked by behaviour rather than by user-agent string where possible: the
 * page is only affected when it is itself served over https.
 */
export function blockedByMixedContent(): boolean {
  if (typeof window === "undefined") return false;
  if (window.location.protocol !== "https:") return false;
  const ua = navigator.userAgent;
  return /Safari/.test(ua) && !/Chrome|Chromium|Edg\//.test(ua);
}

/**
 * Parse what the runner printed — `http://127.0.0.1:8731?token=…` — into an
 * origin and a token, rejecting anything that is not loopback.
 *
 * Accepts a bare origin too, so a reader who pastes only the URL gets told
 * the token is missing rather than being silently unauthorised later.
 */
export function parseConnectUrl(
  input: string,
): { ok: true; connection: RunnerConnection } | { ok: false; reason: string } {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, reason: "Paste the URL the runner printed." };

  let url: URL;
  try {
    // Bare host:port is a natural thing to paste, and new URL() rejects it.
    url = new URL(/^https?:\/\//.test(trimmed) ? trimmed : `http://${trimmed}`);
  } catch {
    return { ok: false, reason: "That does not look like a URL." };
  }

  if (!LOOPBACK.has(url.hostname)) {
    return {
      ok: false,
      reason: `Only a runner on this machine can be used — localhost or 127.0.0.1, not ${url.hostname}.`,
    };
  }

  const token = url.searchParams.get("token");
  if (!token) {
    return { ok: false, reason: "That URL has no token on the end of it. Copy the whole line." };
  }

  return { ok: true, connection: { origin: url.origin, token } };
}

async function call(
  connection: RunnerConnection,
  path: string,
  body?: unknown,
): Promise<unknown> {
  const response = await fetch(`${connection.origin}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Authorization: `Bearer ${connection.token}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.status === 401) {
    throw new Error("The runner rejected that token. It changes every time the runner restarts.");
  }
  if (!response.ok) {
    throw new Error(`The runner answered ${response.status}.`);
  }
  return response.json();
}

/** Confirms something is listening, the token is right, and reports what it has. */
export async function checkRunner(
  connection: RunnerConnection,
): Promise<RunnerEnvironment> {
  const info = (await call(connection, "/health")) as RunnerEnvironment;
  return { python: info.python, torch: info.torch, device: info.device };
}

/** Runs one cell. The runner keeps its namespace, so cells build on each other. */
export async function runOnRunner(
  connection: RunnerConnection,
  code: string,
): Promise<RunnerResult> {
  return (await call(connection, "/exec", { code })) as RunnerResult;
}

/**
 * A connection lasts as long as the tab.
 *
 * sessionStorage rather than localStorage on purpose: the token dies with the
 * runner process anyway, so persisting it across days would only ever restore
 * a connection that no longer works — and it keeps a credential out of storage
 * that outlives the reason for it.
 */
const KEY = "welldun:runner";

export function rememberConnection(connection: RunnerConnection): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(connection));
  } catch {
    // Private browsing, or storage disabled. The connection still works for
    // this page; it just will not follow the reader to the next one.
  }
}

export function recallConnection(): RunnerConnection | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RunnerConnection;
    // Re-check the origin on the way out. Storage is writable by anything else
    // running on this origin, so trusting it without re-validating would put
    // the loopback rule behind a door that does not lock.
    return LOOPBACK.has(new URL(parsed.origin).hostname) ? parsed : null;
  } catch {
    return null;
  }
}

export function forgetConnection(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to do — see rememberConnection.
  }
}
