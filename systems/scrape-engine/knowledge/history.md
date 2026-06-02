---
system: "scrape-engine"
type: history
version: 1
lastUpdated: "2026-06-02"
lastUpdatedBy: build-mode
---

# History — ScrapeEngine

## Build Log

### 2026-06-02 — Initial Build
- **Built by**: team `scrape-engine` (in-tree, on branch `feat/scrape-engine`)
- **Knowledge captured**: centralized adaptive web-scraping gateway over the Python Scrapling framework (v0.4.8). Fetcher tiers (http `Fetcher` < dynamic `DynamicFetcher`/Chromium < stealthy `StealthyFetcher`/Camoufox-Firefox) with anti-bot + Cloudflare bypass; `adaptive=True` CSS element relocation surfacing a `relocations` count; strict TS↔Python boundary (one JSON in via stdin, one JSON out via stdout, all logs to stderr); Playwright-shaped `cookies.json` bridge; four-error typed model (ScrapingDependencyError / ScrapingBlockedError / ScrapingTimeoutError / ScrapingCliError). TS client modeled on `systems/scene-board/src/higgsfield-client.ts`; Scrapling + Python are an environment prerequisite (`just install` via `uv`), not an npm dependency.
- **Acceptance criteria**: 5 hard gates, 3 soft criteria.
- **Validation**: pending (engine source owned by `engine-builder`; knowledge + registry authored by `docs-registrar`).
- **Notes**:
  - **Not yet a git submodule.** ScrapeEngine currently lives in-tree under `systems/scrape-engine`. Planned follow-up: create the `Dragon-hearted/scrape-engine` repo and wire it into `.gitmodules` like the other systems.
  - **First consumer is MoodBoarder** (Pinterest harvest — to fix the documented `<video>`→`<source>` markup drift and `_auth`/`_pinterest_sess` cookie rotation). Adoption is a sequenced follow-up PR; the engine ships generic first, MoodBoarder routes through it behind a flag afterward.

## Fix Log
_Entries added by diagnosis workflow._

## Diagnosis Log
_Entries added when system issues are investigated._
