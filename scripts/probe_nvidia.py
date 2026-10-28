"""Find out WHERE the time goes when the model is slow. Run from the repo root:

    python scripts/probe_nvidia.py                       # the model in .env
    python scripts/probe_nvidia.py MODEL_A MODEL_B       # compare several (see list_models.py)
    python scripts/probe_nvidia.py --timeout 90          # wait longer, to see real latencies
    python scripts/probe_nvidia.py --discover            # ask NVIDIA which models YOUR key can use, test them

For each model it measures, in order:
  1. network      DNS + connection + TLS to NVIDIA (the same for every model)
  2. tiny call    a one-word answer, twice (the first one may include a cold start)
  3. real call    one of our captions in English (and Swahili, only if NARRATION_LANGS has sw), checked by the app's rules
  4. 4 at once    four tiny calls together, to see whether NVIDIA lets the app narrate languages in parallel

Then it says in plain words what to change. It makes about 8 calls per model.
"""
import argparse
import math
import re
import os
import socket
import ssl
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv  # noqa: E402

load_dotenv()

from app import narrator  # noqa: E402
from app.detectors import detect_all  # noqa: E402
from app.events import load_events  # noqa: E402

HOST = "integrate.api.nvidia.com"
TINY = [{"role": "user", "content": "Reply with the single word OK."}]
TINY_TOKENS = 150       # a reasoning model needs room to think before it can say one word


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


SKIP = re.compile(r"embed|rerank|guard|safety|vlm|-vl|vision|clip|reward|parse|retriev|asr|tts|whisper|"
                  r"diffusion|image|video|speech|nv-|bge|arctic-embed|nemoretriever|usdcode|"
                  r"translate|riva|coder|codegemma|starcoder|code-|sea-lion|recurrentgemma|zamba|nemoguard|paligemma", re.I)
LIKELY = re.compile(r"instruct|chat|nemotron|llama|mistral|mixtral|gemma|qwen|phi|granite|gpt-oss|deepseek", re.I)


def discover(limit: int) -> list[str]:
    """Chat models this key is allowed to list, smallest first (small models answer fastest).
    Listed does not mean working: retired models can still be listed, so the next step tests each one."""
    reply = requests.get(f"https://{HOST}/v1/models",
                         headers={"Authorization": f"Bearer {os.getenv('NVIDIA_API_KEY')}"}, timeout=30)
    reply.raise_for_status()
    ids = [m["id"] for m in reply.json().get("data", []) if LIKELY.search(m["id"]) and not SKIP.search(m["id"])]

    def size(model_id: str) -> float:
        found = re.search(r"(\d+(?:\.\d+)?)b", model_id.lower())
        return float(found.group(1)) if found else 50.0      # unknown size: assume medium
    return sorted(ids, key=size)[:limit]


def short_error(err: str) -> str:
    """One readable phrase for an error (the raw text contains port numbers that look like HTTP codes)."""
    status = re.search(r"API Error (\d{3})", err)
    if status:
        return f"HTTP {status.group(1)}"
    if "timed out" in err.lower():
        return "timed out"
    if "no visible text" in err:
        return "no visible text (a reasoning model)"
    return err[:40]


def quick_test(models: list[str]) -> list[tuple[str, float | None, str]]:
    """One tiny call per model. A refusal (404/410) is instant and costs nothing; an answer is
    followed by a short pause so the free tier's 40 requests a minute is not hit."""
    results = []
    for n, model in enumerate(models, 1):
        _, secs, err = timed(lambda: narrator._chat(model, TINY, "discover", max_tokens=TINY_TOKENS))
        shown = f"{secs:.1f}s" if not err else "FAILED: " + short_error(err)
        print(f"  [{n}/{len(models)}] {model:55} {shown}")
        results.append((model, None if err else secs, err))
        time.sleep(0.2 if err else 1.6)
    return results


def caption_test(models: list[str], insight) -> list[tuple[str, float]]:
    """The real job: one English caption, checked by the app's own rules. A model that answers
    a one-word prompt but ignores our instructions (a translation model, say) is dropped here."""
    passed = []
    for model in models:
        text, secs, err = timed(lambda: real_call(model, insight, "English"))
        print(f"  {model:55} {'ACCEPTED ' + f'{secs:.1f}s' if text else 'REJECTED: ' + short_error(err)}")
        if text:
            passed.append((model, secs))
        time.sleep(1.6)
    return sorted(passed, key=lambda r: r[1])


def app_languages() -> list[str]:
    """The languages the app narrates, from NARRATION_LANGS in .env (English only if it is not set)."""
    return [c.strip() for c in os.getenv("NARRATION_LANGS", "en").split(",") if c.strip()]


def probe(model: str, insight) -> dict:
    r = {"model": model}
    for n in (1, 2):
        _, secs, err = timed(lambda: narrator._chat(model, TINY, "probe", max_tokens=TINY_TOKENS))
        r[f"tiny{n}"], r[f"tiny{n}_err"] = secs, err
    r.update(sw=None, sw_err="", sw_text="")                   # Swahili is only tested when the app uses it
    for code, name in (("en", "English"), ("sw", "Swahili")):
        if code != "en" and code not in app_languages():
            continue
        text, secs, err = timed(lambda: real_call(model, insight, name))
        r[code], r[f"{code}_err"], r[f"{code}_text"] = secs, err, text or ""
    started = time.time()
    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(lambda _: timed(lambda: narrator._chat(model, TINY, "probe", max_tokens=TINY_TOKENS)), range(4)))
    r["parallel"] = time.time() - started
    r["parallel_errs"] = [err for _, _, err in results if err]
    r["parallel_errors"] = len(r["parallel_errs"])
    return r


def all_calls(r: dict) -> list[tuple[float | None, str]]:
    """(seconds, error) for every call the probe made, so the verdict can look at all of them."""
    calls = [(r[k], r[f"{k}_err"]) for k in ("tiny1", "tiny2", "en") + (("sw",) if r.get("sw") is not None or r.get("sw_err") else ())]
    return calls + [(None, e) for e in r["parallel_errs"]]


def verdict(r: dict) -> list[str]:
    notes = []
    calls = all_calls(r)
    errors = " ".join(err for _, err in calls)
    hung = sum(1 for _, err in calls if "timed out" in err.lower())
    worked = sum(1 for _, err in calls if not err)
    if "401" in errors or "403" in errors:
        notes.append("The key was refused (401/403). Check NVIDIA_API_KEY in .env.")
    if "410" in errors:
        notes.append("NVIDIA has retired this model (410 Gone). Use --discover to find ones that still work.")
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
        live = r["en"] <= 8 and not r["sw_err"] and (r["sw"] is None or r["sw"] <= 8)
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
    parser.add_argument("--discover", action="store_true", help="find working models from the list your key can use")
    parser.add_argument("--max", type=int, default=60, help="with --discover: how many listed models to try")
    parser.add_argument("--top", type=int, default=3, help="with --discover: how many fast ones to probe in full")
    args = parser.parse_args(argv)
    models = args.models or [os.getenv("NVIDIA_MODEL", "")]
    if not os.getenv("NVIDIA_API_KEY") or not (args.discover or models[0]):
        sys.exit("Set NVIDIA_API_KEY and NVIDIA_MODEL in .env, or pass model ids, or use --discover.")
    os.environ["NVIDIA_TIMEOUT_SECONDS"] = str(args.timeout)
    insight = detect_all(load_events(args.data))[0]

    net = network()
    if "error" in net:
        print(f"Network: could not reach {HOST} ({net['error']}). Fix this first: it is not the model.")
        return 1
    print(f"Network: dns {net['dns']:.2f}s  tcp {net['tcp']:.2f}s  tls {net['tls']:.2f}s"
          + ("   <- slow: check your connection, VPN or proxy" if net["tcp"] + net["tls"] > 3 else ""))

    if args.discover:
        os.environ["NVIDIA_TIMEOUT_SECONDS"] = "20"          # a model that needs longer is not a live candidate
        try:
            listed = discover(args.max)
        except Exception as exc:
            print(f"Could not list the models for this key ({str(exc)[:100]}).")
            return 1
        print(f"\nStep 1: {len(listed)} listed chat models, one tiny call each. "
              "Many listed models are not available to every account (404/410).")
        # A reasoning model may spend its whole tiny budget thinking: let the real caption test judge it.
        answered = [m for m, secs, err in quick_test(listed) if secs is not None or "no visible text" in err]
        if not answered:
            print("\nNone of them answered. Check the key, or try again in a minute (rate limit).")
            return 1
        print(f"\nStep 2: {len(answered)} answered. Now the real job: one caption each, checked by the app's rules.")
        good = caption_test(answered, insight)
        if not good:
            print("\nNone produced a caption the app would accept. Paste this output and I will look at why.")
            return 1
        models = [m for m, _ in good[:args.top]]
        current = os.getenv("NVIDIA_MODEL")
        if current and current not in models:
            models.append(current)                      # so you can compare it with what was found
        os.environ["NVIDIA_TIMEOUT_SECONDS"] = str(args.timeout)
        print(f"\nStep 3: full test of the fastest that passed, plus your current model: {', '.join(models)}.")

    rows = []
    for model in models:
        print(f"\nProbing {model} ...")
        rows.append(probe(model, insight))

    print(f"\n{'model':44} {'tiny 1':>7} {'tiny 2':>7} {'EN':>7} {'SW':>7} {'4 at once':>10}")
    for r in rows:
        def cell(key):
            if r.get(f"{key}_err"):
                return "fail"
            return "-" if r.get(key) is None else f"{r[key]:.1f}s"
        print(f"{r['model']:44} {cell('tiny1'):>7} {cell('tiny2'):>7} {cell('en'):>7} {cell('sw'):>7} {r['parallel']:>9.1f}s")
    for r in rows:
        print(f"\n{r['model']}")
        for note in verdict(r):
            print(f"  - {note}")
        for code in ("en", "sw"):
            if code == "sw" and r.get("sw") is None and not r.get("sw_err"):
                continue
            print(f"  {code}: {r[code + '_text'] or 'REJECTED/FAILED: ' + r[code + '_err']}")

    seen = [secs for r in rows for secs, err in all_calls(r) if secs is not None and not err]
    if seen:
        print(f"\nSlowest call that worked: {max(seen):.0f}s. For warm-up use NVIDIA_TIMEOUT_SECONDS="
              f"{min(90, max(30, math.ceil(max(seen) * 2.5)))}; for live use about 20.")
    return 0


if __name__ == "__main__":
    sys.exit(main())