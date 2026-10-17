"""Find out WHERE the time goes when the model is slow. Run from the repo root:

    python scripts/probe_nvidia.py                       # the model in .env
    python scripts/probe_nvidia.py MODEL_A MODEL_B       # compare several (see list_models.py)
    python scripts/probe_nvidia.py --timeout 90          # wait longer, to see real latencies

For each model it measures, in order:
  1. network      DNS + connection + TLS to NVIDIA (the same for every model)
  2. tiny call    a one-word answer, twice (the first one may include a cold start)
  3. real call    one of our captions, in English and Swahili, checked by the same rules the app uses
  4. 4 at once    four tiny calls together, to see whether NVIDIA lets the app narrate languages in parallel

Then it says in plain words what to change. It makes about 8 calls per model.
"""
import argparse
import math
import os
import socket
import ssl
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv  # noqa: E402

load_dotenv()

from app import narrator  # noqa: E402
from app.detectors import detect_all  # noqa: E402
from app.events import load_events  # noqa: E402

HOST = "integrate.api.nvidia.com"
TINY = [{"role": "user", "content": "Reply with the single word OK."}]


def timed(fn):
    started = time.time()
    try:
        return fn(), time.time() - started, ""
    except Exception as exc:                      # timeouts, HTTP errors, rejected text
        return None, time.time() - started, str(exc)[:120]


def network() -> dict:
    """Seconds for DNS, TCP and TLS. Any of them failing is a network problem, not a model problem."""
    out = {}
    try:
        t = time.time()
        ip = socket.gethostbyname(HOST)
        out["dns"] = time.time() - t
        t = time.time()
        sock = socket.create_connection((ip, 443), timeout=10)
        out["tcp"] = time.time() - t
        t = time.time()
        ssl.create_default_context().wrap_socket(sock, server_hostname=HOST).close()
        out["tls"] = time.time() - t
    except Exception as exc:
        out["error"] = str(exc)[:100]
    return out


def real_call(model: str, insight, language: str) -> str:
    text = narrator.ensure_citations(narrator.narrate(None, model, insight, language), insight)
    if not narrator.numbers_are_grounded(text, insight):
        raise ValueError("the text contains a number that is not a fact")
    return text


def probe(model: str, insight) -> dict:
    r = {"model": model}
    for n in (1, 2):
        _, secs, err = timed(lambda: narrator._chat(model, TINY, "probe", max_tokens=8))
        r[f"tiny{n}"], r[f"tiny{n}_err"] = secs, err
    for code, name in (("en", "English"), ("sw", "Swahili")):
        text, secs, err = timed(lambda: real_call(model, insight, name))
        r[code], r[f"{code}_err"], r[f"{code}_text"] = secs, err, text or ""
    started = time.time()
    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(lambda _: timed(lambda: narrator._chat(model, TINY, "probe", max_tokens=8)), range(4)))
    r["parallel"] = time.time() - started
    r["parallel_errs"] = [err for _, _, err in results if err]
    r["parallel_errors"] = len(r["parallel_errs"])
    return r


def all_calls(r: dict) -> list[tuple[float | None, str]]:
    """(seconds, error) for every call the probe made, so the verdict can look at all of them."""
    calls = [(r[k], r[f"{k}_err"]) for k in ("tiny1", "tiny2", "en", "sw")]
    return calls + [(None, e) for e in r["parallel_errs"]]


def verdict(r: dict) -> list[str]:
    notes = []
    calls = all_calls(r)
    errors = " ".join(err for _, err in calls)
    hung = sum(1 for _, err in calls if "timed out" in err.lower())
    worked = sum(1 for _, err in calls if not err)
    if "401" in errors or "403" in errors:
        notes.append("The key was refused (401/403). Check NVIDIA_API_KEY in .env.")
    if "404" in errors:
        notes.append("This key cannot use this model id (404). Run scripts/list_models.py and pick one it lists.")
    if "429" in errors:
        notes.append("NVIDIA is rate-limiting this key (429: the free tier allows about 40 requests a minute). "
                     "Wait a minute and run again.")
    if hung and worked:
        notes.append(f"ERRATIC: {hung} of {len(calls)} calls hung past --timeout while others answered. "
                     "That is an overloaded or unstable endpoint. No timeout setting fixes it: "
                     "switch models, and rely on the warm-up cache for the demo.")
    elif hung:
        notes.append("Every call timed out: the model is down or far too slow right now.")
    steady = r["tiny2"] if not r["tiny2_err"] else None
    if steady is not None and steady > 5:
        notes.append(f"Even a one-word answer takes {steady:.0f}s (normal is 1-2s): the model or its queue is slow.")
    elif steady is not None and not r["en_err"] and r["en"] > 4 * max(steady, 0.5):
        notes.append("A one-word answer is quick but our caption is not: the prompt or the answer is long for this model.")
    if not r["tiny1_err"] and not r["tiny2_err"] and r["tiny1"] > 3 * max(r["tiny2"], 0.5):
        notes.append("The first call is much slower than the second: a cold start. Run the warm-up script before the demo.")
    if steady is not None and not hung and not r["parallel_errors"] and r["parallel"] > 3 * max(steady, 0.5):
        notes.append("Four calls at once took about as long as four in a row: NVIDIA queues them. "
                     "Parallel languages will not speed this model up.")
    if not r["en_err"] and not hung:
        live = r["en"] <= 8 and not r["sw_err"] and r["sw"] <= 8
        notes.append("GOOD for live use." if live else
                     "Usable for the cached demo (warm it up first), too slow to narrate live."
                     if r["en"] <= 40 else "TOO SLOW to use.")
    elif not r["en_err"]:
        notes.append("NOT reliable enough to narrate live. Usable only through the warm-up cache, with several retries.")
    return notes


def main(argv=None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("models", nargs="*", help="model ids; default: NVIDIA_MODEL from .env")
    parser.add_argument("--timeout", type=float, default=60, help="seconds to wait for each call")
    parser.add_argument("--data", default="data/sample_match.json")
    args = parser.parse_args(argv)
    models = args.models or [os.getenv("NVIDIA_MODEL", "")]
    if not models[0] or not os.getenv("NVIDIA_API_KEY"):
        sys.exit("Set NVIDIA_API_KEY and NVIDIA_MODEL in .env, or pass model ids.")
    os.environ["NVIDIA_TIMEOUT_SECONDS"] = str(args.timeout)
    insight = detect_all(load_events(args.data))[0]

    net = network()
    if "error" in net:
        print(f"Network: could not reach {HOST} ({net['error']}). Fix this first: it is not the model.")
        return 1
    print(f"Network: dns {net['dns']:.2f}s  tcp {net['tcp']:.2f}s  tls {net['tls']:.2f}s"
          + ("   <- slow: check your connection, VPN or proxy" if net["tcp"] + net["tls"] > 3 else ""))

    rows = []
    for model in models:
        print(f"\nProbing {model} ...")
        rows.append(probe(model, insight))

    print(f"\n{'model':44} {'tiny 1':>7} {'tiny 2':>7} {'EN':>7} {'SW':>7} {'4 at once':>10}")
    for r in rows:
        def cell(key):
            return "fail" if r.get(f"{key}_err") else f"{r[key]:.1f}s"
        print(f"{r['model']:44} {cell('tiny1'):>7} {cell('tiny2'):>7} {cell('en'):>7} {cell('sw'):>7} {r['parallel']:>9.1f}s")
    for r in rows:
        print(f"\n{r['model']}")
        for note in verdict(r):
            print(f"  - {note}")
        for code in ("en", "sw"):
            print(f"  {code}: {r[code + '_text'] or 'REJECTED/FAILED: ' + r[code + '_err']}")

    seen = [secs for r in rows for secs, err in all_calls(r) if secs is not None and not err]
    if seen:
        print(f"\nSlowest call that worked: {max(seen):.0f}s. For warm-up use NVIDIA_TIMEOUT_SECONDS="
              f"{min(90, max(30, math.ceil(max(seen) * 2.5)))}; for live use about 20.")
    return 0


if __name__ == "__main__":
    sys.exit(main())