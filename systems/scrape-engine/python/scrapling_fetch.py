#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# dependencies = ["scrapling[all]==0.4.8"]
# ///
"""
Scrapling sidecar — the ONLY Python file in scrape-engine.

A thin, stateless adapter that the TypeScript client (`src/scrapling-client.ts`)
shells out to via `uv run`. It reads ONE JSON request object from stdin, drives
the requested Scrapling fetcher, and writes EXACTLY one JSON object to stdout.

Contract (mirrors src/types.ts — the Zod schemas are the source of truth):

  Request (stdin):
    {
      "url": "https://…",
      "fetcher": "stealthy" | "dynamic" | "http",   # default stealthy
      "headless": true,
      "adaptive": true,
      "output": "html" | "extracted",               # default extracted
      "selectors": { "<name>": "<css selector>", … },
      "attributes": ["href", "src", …],
      "cookies": [ {name,value,domain,path,…}, … ],  # Playwright-shaped
      "userAgent": "…",
      "timeoutMs": 35000,
      "waitSelector": "…",
      "networkIdle": true
    }

  Success (stdout):
    {"ok": true, "status": 200, "fetcher": "stealthy", "adaptive": true,
     "html": "…"?  ,  "extracted": {"<name>": [{"text":…,"attributes":{…}}]}?,
     "meta": {"scraplingVersion":…, "elapsedMs":…, "relocations":…}}

  Failure (stdout) + exit 1:
    {"ok": false, "error": {"kind":"blocked|timeout|dependency|cli",
                            "message": str, "status": int?}}

ALL logs/diagnostics go to stderr. stdout is reserved for the single JSON object.
"""

import json
import sys
import time


def log(*args: object) -> None:
	"""Diagnostics → stderr ONLY. stdout must stay a single clean JSON object."""
	print("[scrapling_fetch]", *args, file=sys.stderr, flush=True)


def classify(ex: Exception) -> str:
	"""Map an exception to one of the four contract error kinds."""
	msg = str(ex).lower()
	name = type(ex).__name__.lower()
	if isinstance(ex, (ImportError, ModuleNotFoundError)) or "no module named" in msg:
		return "dependency"
	if "timeout" in msg or "timed out" in msg or "deadline" in msg or "timeout" in name:
		return "timeout"
	for hint in ("403", "429", "/login", "cloudflare", "challenge", "captcha", "forbidden", "blocked"):
		if hint in msg:
			return "blocked"
	return "cli"


def status_from_exc(ex: Exception) -> "int | None":
	"""Best-effort HTTP status extraction from an exception, else None."""
	for attr in ("status", "status_code"):
		val = getattr(ex, attr, None)
		if isinstance(val, int):
			return val
	return None


def emit_error(kind: str, message: str, status: "int | None" = None) -> None:
	"""Write the single failure JSON object to stdout and exit non-zero."""
	err: "dict[str, object]" = {"kind": kind, "message": message}
	if status is not None:
		err["status"] = status
	print(json.dumps({"ok": False, "error": err}))
	sys.stdout.flush()
	sys.exit(1)


def selfcheck() -> None:
	"""Import scrapling and report its version. Exits 0 on success, 1 otherwise."""
	try:
		import scrapling

		version = getattr(scrapling, "__version__", "unknown")
		print(json.dumps({"ok": True, "version": version}))
		sys.stdout.flush()
		sys.exit(0)
	except Exception as ex:  # noqa: BLE001 — selfcheck must classify any failure
		log("selfcheck failed:", repr(ex))
		emit_error(classify(ex), f"selfcheck failed: {ex}", status_from_exc(ex))


def build_kwargs(req: "dict[str, object]") -> "dict[str, object]":
	"""Assemble the keyword args common across the browser-backed fetchers.

	Only keys the underlying fetcher actually supports should reach it; the
	dispatchers below prune per-fetcher. timeoutMs (ms) → seconds for Scrapling.
	"""
	kwargs: "dict[str, object]" = {}
	kwargs["headless"] = bool(req.get("headless", True))

	timeout_ms = req.get("timeoutMs")
	if isinstance(timeout_ms, (int, float)):
		# Scrapling fetchers take a timeout in seconds.
		kwargs["timeout"] = float(timeout_ms) / 1000.0

	user_agent = req.get("userAgent")
	if isinstance(user_agent, str) and user_agent:
		kwargs["useragent"] = user_agent

	wait_selector = req.get("waitSelector")
	if isinstance(wait_selector, str) and wait_selector:
		kwargs["wait_selector"] = wait_selector

	network_idle = req.get("networkIdle")
	if isinstance(network_idle, bool):
		kwargs["network_idle"] = network_idle

	# TODO(verify): exact Scrapling cookie kwarg. The Playwright-shaped cookie
	# list is passed through best-effort; the precise keyword (`cookies=` vs a
	# browser-context option) needs confirmation against the installed Scrapling
	# build before relying on authenticated scrapes.
	cookies = req.get("cookies")
	if isinstance(cookies, list) and cookies:
		kwargs["cookies"] = cookies

	return kwargs


def call_fetcher(req: "dict[str, object]"):
	"""Dispatch on req['fetcher'] and return the fetched page object."""
	from scrapling.fetchers import DynamicFetcher, Fetcher, StealthyFetcher

	fetcher = str(req.get("fetcher", "stealthy"))
	url = req.get("url")
	if not isinstance(url, str) or not url:
		raise ValueError("request is missing a string 'url'")

	kwargs = build_kwargs(req)

	if fetcher == "http":
		# Plain HTTP — no browser, so prune browser-only kwargs.
		http_kwargs: "dict[str, object]" = {}
		if "timeout" in kwargs:
			http_kwargs["timeout"] = kwargs["timeout"]
		if "useragent" in kwargs:
			http_kwargs["headers"] = {"User-Agent": kwargs["useragent"]}
		if "cookies" in kwargs:
			http_kwargs["cookies"] = kwargs["cookies"]
		log("dispatch: Fetcher.get", url, http_kwargs.keys())
		return Fetcher.get(url, **http_kwargs)

	if fetcher == "dynamic":
		log("dispatch: DynamicFetcher.fetch", url, list(kwargs.keys()))
		return DynamicFetcher.fetch(url, **kwargs)

	# Default: stealthy (anti-bot hardened browser).
	log("dispatch: StealthyFetcher.fetch", url, list(kwargs.keys()))
	return StealthyFetcher.fetch(url, **kwargs)


def extract(page, req: "dict[str, object]") -> "dict[str, list]":
	"""Run each name:selector against the page, collecting text + attributes."""
	selectors = req.get("selectors") or {}
	attributes = req.get("attributes") or []
	adaptive = bool(req.get("adaptive", True))
	out: "dict[str, list]" = {}

	if not isinstance(selectors, dict):
		raise ValueError("'selectors' must be an object of name → css selector")

	for name, selector in selectors.items():
		elements = page.css(selector, adaptive=adaptive)
		collected = []
		for el in elements:
			attrs = {}
			for a in attributes:
				try:
					attrs[a] = el.attrib.get(a)
				except Exception:  # noqa: BLE001 — a missing attrib is just None
					attrs[a] = None
			collected.append({"text": el.text, "attributes": attrs})
		out[name] = collected

	return out


def meta_from_page(page, elapsed_ms: float) -> "dict[str, object]":
	"""Best-effort run metadata. Fields are optional in the contract."""
	meta: "dict[str, object]" = {"elapsedMs": round(elapsed_ms, 2)}
	try:
		import scrapling

		meta["scraplingVersion"] = getattr(scrapling, "__version__", "unknown")
	except Exception:  # noqa: BLE001
		pass
	# Scrapling's adaptive engine records how many elements it had to relocate.
	relocations = getattr(page, "relocations", None)
	if isinstance(relocations, int):
		meta["relocations"] = relocations
	return meta


def run(req: "dict[str, object]") -> None:
	"""Execute one fetch request and emit the single success JSON object."""
	started = time.monotonic()
	try:
		page = call_fetcher(req)
	except Exception as ex:  # noqa: BLE001 — classify & surface as JSON
		kind = classify(ex)
		log(f"fetch failed ({kind}):", repr(ex))
		emit_error(kind, str(ex), status_from_exc(ex))
		return  # unreachable (emit_error exits) — keeps type-checkers calm

	elapsed_ms = (time.monotonic() - started) * 1000.0
	status = getattr(page, "status", None)
	fetcher = str(req.get("fetcher", "stealthy"))
	adaptive = bool(req.get("adaptive", True))
	output = str(req.get("output", "extracted"))

	result: "dict[str, object]" = {
		"ok": True,
		"status": int(status) if isinstance(status, int) else 0,
		"fetcher": fetcher,
		"adaptive": adaptive,
		"meta": meta_from_page(page, elapsed_ms),
	}
	url = req.get("url")
	if isinstance(url, str):
		result["url"] = url

	if output == "html":
		result["html"] = getattr(page, "html_content", None)
	else:
		try:
			result["extracted"] = extract(page, req)
		except Exception as ex:  # noqa: BLE001
			log("extraction failed:", repr(ex))
			emit_error(classify(ex), f"extraction failed: {ex}", status_from_exc(ex))
			return

	print(json.dumps(result))
	sys.stdout.flush()


def main() -> None:
	if "--selfcheck" in sys.argv[1:]:
		selfcheck()
		return

	raw = sys.stdin.read()
	if not raw.strip():
		emit_error("cli", "no JSON request received on stdin")
		return

	try:
		req = json.loads(raw)
	except json.JSONDecodeError as ex:
		emit_error("cli", f"invalid JSON request on stdin: {ex}")
		return

	if not isinstance(req, dict):
		emit_error("cli", "JSON request must be an object")
		return

	run(req)


if __name__ == "__main__":
	main()
