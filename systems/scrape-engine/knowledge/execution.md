---
system: "scrape-engine"
type: execution
driver: cli
entry: "bun run src/cli.ts fetch <url> [--fetcher http|dynamic|stealthy] [--css name=selector ...] [--attr name ...] [--cookies <path>] [--output extracted|html]"
mode: orchestrate
gates: executor
version: 1
lastUpdated: "2026-06-04"
lastUpdatedBy: build-mode
---

# Execution — ScrapeEngine

How Execute Mode (`/adcelerate-execute`) runs this system. Execute Mode reads ONLY this manifest to decide how to run, then branches on `driver`.

## Invocation
Run the CLI (equivalently `just fetch fetch <url> [flags]`). Run `just install` once to provision the `uv` Python sidecar + Scrapling and browser binaries. Fetch and extraction happen in a single `fetch` invocation:

```
bun run src/cli.ts fetch <url> --fetcher stealthy \
  --css images=img.thumb --css videos=video --attr src --attr href \
  [--cookies <path>] [--wait-selector <css>] [--output extracted|html]
```

## Natural flow (awareness only — the system drives this on the skill path)
1. **fetch** — `fetchPage()` settles the page via StealthyFetcher/DynamicFetcher/Fetcher with anti-bot + optional cookie injection, returning `{ status, html, metadata }`.
2. **extraction** — with `--css`/`--attr` selectors, returns an `extracted` map of selector name → matched elements (`{text, attributes}`), using `adaptive=True` element relocation (relocation count reported in metadata).

## Where the agent must check / supply input
- **fetch** — supply the **target URL** (required) and choose the **`--fetcher` tier** (`http|dynamic|stealthy`, default stealthy); supply **`--cookies`** for authenticated scrapes and optional **`--wait-selector`** / `--timeout-ms` / `--user-agent`.
- **extraction** — supply the **CSS selectors** (`--css name=selector`, repeatable) and **attributes** (`--attr`, repeatable); choose `--output extracted` vs `html`. Confirm the selectors before relying on `adaptive` relocation.

## Validation
After execution, validate the output against [acceptance-criteria.md](acceptance-criteria.md) (hard gates inline, soft criteria via the validator). Applies to both drivers.
