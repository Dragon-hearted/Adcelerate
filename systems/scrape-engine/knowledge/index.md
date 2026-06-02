---
system: "scrape-engine"
type: index
version: 1
lastUpdated: "2026-06-02"
lastUpdatedBy: build-mode
---

# ScrapeEngine

## Summary
ScrapeEngine is a centralized adaptive web-scraping gateway over the Python **Scrapling** framework (v0.4.8). It spawns a `uv run` Python sidecar (`StealthyFetcher` / `DynamicFetcher` / `Fetcher`) with anti-bot + Cloudflare bypass and **`adaptive=True`** CSS element tracking that auto-relocates elements when site markup drifts. A thin, typed TypeScript client + CLI (modeled on SceneBoard's Higgsfield client) hands the sidecar one JSON request and parses one JSON result, so any other system can fetch and extract from markup-drifting, bot-defended sites without owning browser automation itself. The first intended consumer is MoodBoarder's Pinterest harvest; the engine itself is generic.

## Entry Points
- **CLI (primary)**: `src/cli.ts` — `bun run src/cli.ts <url> --fetcher <http|dynamic|stealthy> --select <css> [options]`; `--help` shows USAGE / FLAGS / EXAMPLES.
- **Library API**: `src/index.ts` — typed `fetch`/`extract` functions + `checkScrapling()` and the four error classes, for in-process consumers.
- **Python sidecar**: `python/scrapling_fetch.py` — spawned via `uv run`; one JSON object in via stdin, one JSON object out via stdout, all logs to stderr.

## Stage Definitions
1. **fetch** — Settle a page via `StealthyFetcher` / `DynamicFetcher` / `Fetcher` with anti-bot evasion + `cookies.json` injection; escalate tiers (http → dynamic → stealthy) only as needed.
2. **extraction** — Per-selector matched elements (text + attributes) using `adaptive=True` element relocation; emit a `relocations` count in the result metadata.

## Knowledge Files
- [Domain Knowledge](domain.md) — Fetcher tiers, adaptive relocation, the TS↔Python boundary, cookie bridge, typed-error model
- [Acceptance Criteria](acceptance-criteria.md) — Hard gates and soft quality criteria
- [Dependencies](dependencies.md) — Environment prerequisites (uv, Scrapling, browsers), runtime, build deps
- [History](history.md) — Build, fix, and diagnosis history

## Cross-References
- **moodboarder** — First intended consumer; can opt in to route Pinterest harvesting through ScrapeEngine (StealthyFetcher + `adaptive=True`) behind a flag, falling back to its existing Playwright `cookies.json` path on `ScrapingBlockedError`/`ScrapingDependencyError` (pipeline, optional).
- **instagram-scrapper** — Both perform authenticated scraping with `cookies.json`; a future candidate to route through ScrapeEngine (shared-dependency).
- **image-engine** — Sibling centralized gateway over an external tool, sharing the spawn-a-typed-client architecture (ImageEngine over WisGate, ScrapeEngine over Scrapling).
