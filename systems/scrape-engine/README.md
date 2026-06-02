# scrape-engine

A centralized **adaptive scraping gateway**. It wraps the Python
[Scrapling](https://github.com/D4Vinci/Scrapling) framework (v0.4.8) behind a
thin, typed TypeScript client so every system in the monorepo scrapes through
one hardened, anti-bot-aware path instead of hand-rolling fetchers.

- **Adaptive** — Scrapling relocates selectors when a site's markup shifts, so
  extraction survives layout changes.
- **Stealthy by default** — the `stealthy` fetcher uses a fingerprint-hardened
  browser; `dynamic` (full Playwright) and `http` (plain requests) are also
  available.
- **Generic** — no site-specific types. You supply CSS selectors per request.

## Architecture

```
TS caller ─▶ src/scrapling-client.ts ─( uv run, JSON over stdin/stdout )─▶ python/scrapling_fetch.py ─▶ Scrapling
```

The TypeScript client never imports Python. It shells out to a single PEP 723
sidecar (`python/scrapling_fetch.py`) via `uv run`, pipes one JSON request to
its stdin, and parses exactly one JSON object from its stdout. All diagnostics
go to stderr.

## Prerequisites

- **[Bun](https://bun.sh)** for the TS client/CLI.
- **[uv](https://docs.astral.sh/uv/)** (`SCRAPLING_UV_BIN` to override the binary).
- **Python ≥ 3.10** — `uv` provisions Scrapling and its browsers on first install.

## Install

```bash
just install
```

This probes the sidecar (`--selfcheck`) and then runs `scrapling install` to
download the headless browsers. (Heavy: ~hundreds of MB the first time.)

## CLI usage

```bash
# Extract image + video source URLs from a search page as raw JSON
just fetch fetch "https://example.com/search?q=neon" \
    --css images=img.thumb --css videos=video --attr src --json

# Grab raw HTML via the plain HTTP fetcher
just fetch fetch "https://example.com" --fetcher http --output html

# Authenticated, headed scrape with captured Playwright cookies
just fetch fetch "https://example.com/feed" \
    --cookies ./cookies.json --no-headless --css pins=a.pin --attr href
```

Run `bun run src/cli.ts --help` for the full flag list.

## TypeScript client API

```ts
import {
  fetchPage,
  checkScrapling,
  ScrapingBlockedError,
  type FetchRequest,
  type FetchResult,
} from "adcelerate-scrape-engine";

// Cheap liveness probe — never throws.
if (!(await checkScrapling())) throw new Error("run `just install`");

const result: FetchResult = await fetchPage({
  url: "https://example.com/search?q=neon",
  fetcher: "stealthy",
  output: "extracted",
  selectors: { images: "img.thumb", videos: "video" },
  attributes: ["src"],
});

for (const el of result.extracted?.images ?? []) {
  console.log(el.attributes.src);
}
```

`fetchPage` normalizes defaults via the Zod `FetchRequestSchema`, validates the
response against `FetchResultSchema`, and throws a **typed** error on failure:

| Error class                | Cause                                              |
| -------------------------- | -------------------------------------------------- |
| `ScrapingDependencyError`  | uv / scrapling missing or not importable           |
| `ScrapingBlockedError`     | 403/429/cloudflare/challenge/login/captcha wall    |
| `ScrapingTimeoutError`     | fetch exceeded its deadline                        |
| `ScrapingCliError`         | non-zero exit, unparseable stdout, anything else   |

All extend `ScrapingError`, so callers can `instanceof ScrapingError` to decide
on a fallback path.

## Environment variables

| Variable             | Default                       | Purpose                          |
| -------------------- | ----------------------------- | -------------------------------- |
| `SCRAPLING_UV_BIN`   | `uv`                          | Override the `uv` binary.        |
| `SCRAPLING_SIDECAR`  | `../python/scrapling_fetch.py`| Override the sidecar script path.|

## Contract

`src/types.ts` holds the Zod schemas that are the single source of truth for the
request/response shape; the Python sidecar mirrors them. See
`tests/fixtures/` for a captured success response.
