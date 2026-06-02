---
system: "scrape-engine"
type: acceptance-criteria
version: 1
lastUpdated: "2026-06-02"
lastUpdatedBy: build-mode
---

# Acceptance Criteria — ScrapeEngine

## Hard Gates
_Binary pass/fail criteria. ALL must pass for output to be considered valid._

- [ ] `checkScrapling()` returns `true` after `just install` (uv + Scrapling + browsers provisioned and detectable).
- [ ] `python3 -m py_compile` passes on the Python sidecar (`python/scrapling_fetch.py`) — no syntax errors.
- [ ] `bun test` is green with **no network access** required (tests run against fixtures / mocked sidecar I/O).
- [ ] Malformed sidecar stdout (garbled bytes, non-JSON, or >1 object) surfaces as a typed `ScrapingCliError` — **never an unhandled throw**.
- [ ] The CLI `--help` output shows the required `USAGE`, `FLAGS`, and `EXAMPLES` sections.

## Soft Criteria
_Quality guidance for human judgment at approval gates. Surfaced to the engineer for review._

### Adaptive Resilience
Extraction should survive a selector that no longer matches the page verbatim. The evidence is **`meta.relocations > 0`**: Scrapling's `adaptive=True` relocated the equivalent element after the site's markup drifted, and the run still returned the expected data instead of an empty match. A run that quietly returns zero elements where it used to return data — with `relocations` at 0 — is a silent miss, not a success.

### Stdout Purity
Every invocation must emit **exactly one JSON object on stdout**, with all logs, warnings, and tracebacks confined to **stderr**. This is the load-bearing invariant of the TS↔Python boundary: a single stray line on stdout from Scrapling, Camoufox, Playwright, or `uv` corrupts the client parse. Good output is byte-clean stdout that round-trips through `JSON.parse` with no preprocessing.

### Clean Typed-Error Surface
Failures should map cleanly onto the four-error taxonomy — `ScrapingDependencyError`, `ScrapingBlockedError`, `ScrapingTimeoutError`, `ScrapingCliError` — so a consumer can **`catch` and branch to a fallback** without string-matching error messages. In particular, a target refusal (429 / Cloudflare / login redirect) must be a distinct `ScrapingBlockedError` so callers like MoodBoarder can fall back to their existing path rather than retrying blindly.
