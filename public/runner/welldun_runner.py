#!/usr/bin/env python3
"""
welldun-runner — run the tutorial's PyTorch cells on your own machine.

The tutorials at learn.welldun.ai execute Python in the browser through
Pyodide, which ships CPython and NumPy and cannot ship PyTorch. Everything the
tutorials teach runs in-browser on NumPy; this exists for the parts where you
want the real library, on your own hardware, with your own GPU.

Start it, paste the printed URL into the page, and the notebook cells run here
instead of in the tab.

    python welldun_runner.py

Standard library only, on purpose. Asking a reader to install a web framework
to run a tutorial about transformers is one dependency too many, and the whole
server is small enough to read before trusting it — which you should, because
it does exactly what it looks like it does: executes code that a web page sends
it, as you, on your machine.

There are two ways to run it, and they have genuinely different risks. Both are
stated plainly here rather than buried, because this is a program that executes
code a web page sends it.

Locally (the default):

  * It binds to 127.0.0.1 and nothing else, so nobody on your network can
    reach it. Only programs on this machine can.
  * A token is generated fresh at startup and printed once. Without it, any
    website open in your browser could execute code on your machine — the
    browser will happily send a cross-origin POST to localhost, and the runner
    cannot tell which page it came from. The token is the whole of the
    authorisation, not a formality.
  * It runs Python with your privileges, on your files. Stop it when you are
    done rather than leaving it running.

Deployed to a host such as Railway (set PORT, or pass --host):

  * It must bind 0.0.0.0 to be reachable, which puts an arbitrary-code-execution
    endpoint on the public internet. It will refuse to start that way unless
    WELLDUN_TOKEN is set, because a printed random token is no use when nobody
    is watching the logs, and no token at all would be an open shell.
  * The worst case is different from the local one. A stranger cannot read your
    files — but they can run whatever they like on your bill, and mining or
    reselling compute is exactly what Railway's fair-use policy prohibits. A
    leaked token is your account's problem.
  * Pick a long token, keep it out of screenshots, and delete the service when
    you have finished the tutorial.
"""

from __future__ import annotations

import argparse
import contextlib
import http.server
import io
import json
import os
import secrets
import sys
import traceback

# One namespace for the whole session, so cell four can use what cell one
# defined — the same contract the in-browser labs have. It is deliberately not
# reset between requests; "Restart" in the page is a restart of this process.
SESSION: dict[str, object] = {}

# Set your own when deploying: a generated one is printed to stdout, which is
# fine in a terminal you are looking at and useless in a platform's log viewer
# — and it would change on every redeploy, invalidating the URL you pasted.
TOKEN = os.environ.get("WELLDUN_TOKEN") or secrets.token_urlsafe(24)

# Bodies larger than this are refused unread. A tutorial cell is a few hundred
# bytes; anything at this size is not one.
MAX_BODY = 256 * 1024


def describe_environment() -> dict[str, object]:
    """What the page shows once connected, so a reader can see what they got."""
    info: dict[str, object] = {
        "python": sys.version.split()[0],
        "torch": None,
        "device": None,
    }
    try:
        import torch  # noqa: PLC0415 — optional, and reported rather than required

        info["torch"] = torch.__version__
        if torch.cuda.is_available():
            info["device"] = f"cuda ({torch.cuda.get_device_name(0)})"
        elif getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
            info["device"] = "mps (Apple GPU)"
        else:
            info["device"] = "cpu"
    except ImportError:
        # Not fatal. The runner still executes Python, and the page says
        # plainly that torch is missing rather than failing at the first cell
        # with an import error the reader has to decode.
        pass
    return info


def execute(code: str) -> dict[str, object]:
    """
    Run one cell, capture what it printed, and report a failure as text.

    Exceptions are returned rather than raised: a cell that fails is a normal
    event in a notebook, and the reader needs the traceback in the page, not a
    500 with nothing in it.
    """
    printed = io.StringIO()
    try:
        with contextlib.redirect_stdout(printed), contextlib.redirect_stderr(printed):
            exec(compile(code, "<cell>", "exec"), SESSION)  # noqa: S102 — the entire purpose
    except BaseException:  # noqa: BLE001 — SystemExit from a cell should not kill the runner
        kind, err, tb = sys.exc_info()
        # Drop the frame for execute() itself. Without this every traceback
        # opens with a line of this file's source, and a reader debugging their
        # own cell has to work out that the top frame is not theirs.
        return {
            "stdout": printed.getvalue(),
            "error": "".join(traceback.format_exception(kind, err, tb.tb_next if tb else None)),
        }
    return {"stdout": printed.getvalue(), "error": None}


class Handler(http.server.BaseHTTPRequestHandler):
    # Quieter than the default, which logs a line per request to stderr and
    # buries the connect URL the reader is trying to copy.
    def log_message(self, fmt: str, *args: object) -> None:
        pass

    def _send(self, status: int, payload: dict[str, object]) -> None:
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self._cors_headers()
        self.end_headers()
        self.wfile.write(body)

    def _cors_headers(self) -> None:
        """
        Any origin, because the token is what authorises — not the origin.

        Reflecting the origin rather than sending `*` keeps the door open for
        credentialed requests later, and costs nothing now. What actually stops
        a hostile page is that it does not have the token.
        """
        self.send_header("Access-Control-Allow-Origin", self.headers.get("Origin", "*"))
        self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Max-Age", "600")

    def _authorised(self) -> bool:
        """
        Constant-time compare, so the token cannot be recovered a byte at a
        time by timing repeated guesses from a page that is already able to
        talk to this port.
        """
        header = self.headers.get("Authorization", "")
        sent = header[7:] if header.startswith("Bearer ") else ""
        return secrets.compare_digest(sent, TOKEN)

    def do_OPTIONS(self) -> None:  # noqa: N802 — http.server's naming
        self.send_response(204)
        self._cors_headers()
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        if self.path.split("?")[0] != "/health":
            return self._send(404, {"error": "no such endpoint"})
        if not self._authorised():
            return self._send(401, {"error": "bad or missing token"})
        self._send(200, {"ok": True, **describe_environment()})

    def do_POST(self) -> None:  # noqa: N802
        if self.path.split("?")[0] != "/exec":
            return self._send(404, {"error": "no such endpoint"})
        if not self._authorised():
            return self._send(401, {"error": "bad or missing token"})

        length = int(self.headers.get("Content-Length") or 0)
        if length > MAX_BODY:
            return self._send(413, {"error": "cell too large"})
        try:
            payload = json.loads(self.rfile.read(length) or b"{}")
            code = payload["code"]
            if not isinstance(code, str):
                raise TypeError
        except (json.JSONDecodeError, KeyError, TypeError):
            return self._send(400, {"error": "expected {\"code\": \"...\"}"})

        self._send(200, execute(code))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    # A platform that assigns a port is a platform that expects a public bind,
    # so PORT being present is what switches the defaults over. Railway, Fly
    # and Render all set it; nothing sets it on a laptop.
    hosted = "PORT" in os.environ
    parser.add_argument("--port", type=int, default=int(os.environ.get("PORT", 8731)))
    parser.add_argument(
        "--host",
        default="0.0.0.0" if hosted else "127.0.0.1",  # noqa: S104 — see the guard below
        help="127.0.0.1 keeps it on this machine. Anything else is public.",
    )
    args = parser.parse_args()

    public = args.host not in ("127.0.0.1", "::1", "localhost")

    # Refusing here rather than warning. A public endpoint that executes
    # arbitrary Python, guarded by a random token nobody read out of the logs,
    # is an open shell with extra steps — and on a hosted platform it is an
    # open shell someone else is paying for.
    if public and not os.environ.get("WELLDUN_TOKEN"):
        sys.exit(
            "\n  Refusing to start.\n\n"
            f"  Binding to {args.host} puts an endpoint that runs arbitrary Python\n"
            "  on the public internet, so the token cannot be one this process\n"
            "  invented and printed — set your own:\n\n"
            "    WELLDUN_TOKEN=<a long random string>\n\n"
            "  On Railway that is a service variable. Locally, leave --host alone\n"
            "  and this does not apply.\n"
        )

    server = http.server.ThreadingHTTPServer((args.host, args.port), Handler)

    env = describe_environment()
    print("\n  welldun-runner is listening.\n")
    print(f"  Python  {env['python']}")
    if env["torch"]:
        print(f"  PyTorch {env['torch']} on {env['device']}")
    else:
        print("  PyTorch not found — install it with:  pip install torch")

    if public:
        print(f"\n  Bound to {args.host}:{args.port} — reachable from the internet.")
        print("  Connect with your service's public URL plus ?token=<your token>")
        print("\n  Delete the service when you have finished. Anyone with the token")
        print("  can run anything on it, on your bill.\n")
    else:
        print("\n  Paste this into the tutorial page:\n")
        print(f"    http://127.0.0.1:{args.port}?token={TOKEN}\n")
        print("  It runs code this page sends, as you. Stop it with Ctrl-C when done.\n")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  Stopped.\n")


if __name__ == "__main__":
    main()
