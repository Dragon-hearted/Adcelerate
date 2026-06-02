---
system: "scrape-engine"
type: dependencies
version: 1
lastUpdated: "2026-06-02"
lastUpdatedBy: build-mode
---

# Dependencies — ScrapeEngine

## Environment Prerequisites
_Not package.json dependencies. Provisioned by `just install` (which uses `uv`), the same external-tool pattern SceneBoard uses for the Higgsfield CLI._

| Prerequisite | Version | Purpose |
|-----------|---------|---------|
| uv | on PATH | Python toolchain + sidecar launcher (`uv run`). Already required by every `.claude/hooks/*.py` in this repo, so it is a pre-existing environment assumption. Resolves the sidecar's PEP 723 inline deps on first run. |
| Python | 3.10+ | Scrapling's minimum supported interpreter; the sidecar runs under it. |
| scrapling[all] | 0.4.8 (BSD-3) | The scraping framework. `Fetcher` / `DynamicFetcher` / `StealthyFetcher`, anti-bot + Cloudflare bypass, and `adaptive=True` CSS element relocation. **Installed via `just install`, NOT npm.** |
| Camoufox browser | downloaded by `scrapling install` | Firefox-based stealth browser backing `StealthyFetcher` (anti-fingerprinting + Cloudflare). |
| Chromium browser | downloaded by `scrapling install` | Playwright Chromium backing `DynamicFetcher` (JS rendering + scroll). |

> **Why Scrapling / Python are not in package.json:** they are a heavyweight Python-side toolchain, not a JS module. Bundling them as npm deps would be impossible (wrong ecosystem) and misleading. Instead they follow the Higgsfield-style external-tool precedent already established by SceneBoard: declared as an environment prerequisite, provisioned out-of-band by `just install`, and reached at runtime by spawning a subprocess. `checkScrapling()` in the TS client verifies the prerequisite is present and raises `ScrapingDependencyError` (with a "run `just install`" hint) when it is not.

## Runtime Dependencies
_Required for the system to execute._

| Dependency | Version | Purpose |
|-----------|---------|---------|
| bun | latest | TypeScript runtime for the client + CLI; spawns the `uv run` sidecar. |
| zod | ^3.23.0 | Runtime validation of the sidecar's JSON response and the inbound request config. **The only npm runtime dependency.** |

## Build Dependencies
_Required for development and building._

| Dependency | Version | Purpose |
|-----------|---------|---------|
| @biomejs/biome | ^1.9.0 | Linting and formatting |
| typescript | ^5.7.0 | TypeScript compiler |
| @types/bun | latest | Bun runtime type definitions |

## Optional Dependencies
_Enhance functionality but not required._

None.

## External Services
_APIs, models, or services the system depends on._

| Service | Purpose | Failure Impact |
|---------|---------|---------------|
| Arbitrary target websites | The pages being fetched/extracted (e.g. Pinterest for the first consumer). | A block (429 / Cloudflare / login redirect) surfaces as `ScrapingBlockedError`, signaling the caller to fall back (e.g. MoodBoarder reverts to its own Playwright `cookies.json` path). A network/timeout surfaces as `ScrapingTimeoutError`. |
