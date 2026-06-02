---
system: "scrape-engine"
type: domain
version: 1
lastUpdated: "2026-06-02"
lastUpdatedBy: build-mode
---

# Domain Knowledge — ScrapeEngine

## Core Domain

ScrapeEngine is a centralized adaptive web-scraping gateway. Other systems in the monorepo need to fetch and extract data from third-party sites that actively defend against automation (anti-bot challenges, Cloudflare, login walls) and that silently rewrite their markup over time (A/B tests, framework migrations, CDN reshuffles). Rather than each consumer re-implementing browser automation, stealth, and brittle selectors, ScrapeEngine wraps the Python **Scrapling** framework (v0.4.8) behind a thin, typed TypeScript client + CLI.

The TypeScript surface is modeled on `systems/scene-board/src/higgsfield-client.ts`: it spawns an out-of-process Python sidecar via `uv run`, hands it one request, and parses one typed response. Scrapling + Python are an **environment prerequisite** (installed via `just install` using `uv`), exactly the way scene-board treats the Higgsfield CLI — never an npm dependency.

The first intended consumer is **MoodBoarder's Pinterest harvest**, which suffers from documented `<video>`→`<source>` markup drift and `_auth`/`_pinterest_sess` cookie rotation. But ScrapeEngine itself is deliberately generic: it takes a URL, a set of CSS selectors, and a fetch config, and returns matched elements + metadata for any markup-drifting site.

## Process Knowledge

### Fetcher tiers — escalate only as far as needed

Scrapling exposes three fetchers with increasing capability and cost. ScrapeEngine surfaces all three and escalates in order:

1. **`Fetcher` (http)** — a plain HTTP request, no browser. Fastest and cheapest. Use for static HTML and JSON-ish endpoints that don't gate on JS or bot checks. The default first attempt.
2. **`DynamicFetcher` (dynamic)** — a real **Playwright Chromium** browser that executes JavaScript. Use when content is client-rendered, when you need to scroll (infinite-scroll / lazy-loaded grids), or when the http tier returns an empty/SPA shell.
3. **`StealthyFetcher` (stealthy)** — **Camoufox, a Firefox-based stealth browser** with anti-fingerprinting, anti-bot evasion, and Cloudflare-challenge bypass. The heaviest tier. Use only when `dynamic` is detected/blocked (429, Cloudflare interstitial, login redirect).

Escalate http → dynamic → stealthy; do not jump straight to stealthy "to be safe" — each step up costs latency and a browser launch.

### Adaptive element tracking (`adaptive=True`)

The core resilience feature. When extracting with `page.css(selector, adaptive=True)`, Scrapling does not fail hard if the literal selector no longer matches. It uses the element's previously-stored structural fingerprint to **relocate** the equivalent element after the site's markup has drifted (class renamed, wrapper added, tag swapped). When a relocation happens, the sidecar surfaces a **`relocations` count** in the response metadata. A `meta.relocations > 0` is the signal that the site drifted *and* ScrapeEngine recovered — this is the evidence of adaptive resilience that consumers (and validators) look for.

### The TS ↔ Python boundary — stdout purity is critical

The contract between the TypeScript client and the Python sidecar is intentionally minimal and strict:

- **In**: exactly **one JSON object via stdin** (the request: url, fetcher tier, selectors, config, optional cookies).
- **Out**: exactly **one JSON object via stdout** (the result: extracted elements, page html, metadata including `relocations`).
- **All logs, warnings, progress, and tracebacks go to stderr** — never stdout.

stdout must contain *only* the single result JSON object. Scrapling, Camoufox, Playwright, and `uv` itself are all chatty and will happily print to stdout if allowed; any stray byte there corrupts the parse on the TS side. Keeping stdout pure is the single most important runtime invariant of the boundary. If the TS client cannot parse stdout as exactly one JSON object, it raises `ScrapingCliError` rather than throwing an opaque parse error.

### Cookie bridge

Authenticated scrapes reuse a **Playwright-shaped `cookies.json`** — the same format MoodBoarder and instagram-scrapper already persist from their browser logins. The TS client passes the cookie file path through the request; the sidecar injects those cookies into the fetcher session before navigating. This means ScrapeEngine slots in behind existing login flows without owning authentication itself.

### Typed-error model

The client maps failure modes to a small, branchable error taxonomy so consumers can build clean fallbacks:

- **`ScrapingDependencyError`** — environment not ready: `uv`, Scrapling, or the browsers are missing/unprovisioned. The caller should surface a "run `just install`" hint.
- **`ScrapingBlockedError`** — the target actively refused: HTTP 429, a Cloudflare challenge, or a login redirect. The caller should fall back (e.g. MoodBoarder reverts to its own Playwright path).
- **`ScrapingTimeoutError`** — the fetch/settle exceeded the configured budget.
- **`ScrapingCliError`** — the sidecar produced malformed/garbled stdout, a non-zero exit, or an otherwise unparseable response.

## Quality Signals

- **Adaptive resilience** — extraction keeps working after a selector stops matching verbatim, evidenced by `meta.relocations > 0`. This is the headline value of the system.
- **Stdout purity** — exactly one JSON object on stdout for every invocation, logs entirely on stderr.
- **Clean typed-error surface** — every failure maps to one of the four error types, so a consumer can `catch` and branch to a fallback without string-matching messages.
- **Minimal escalation** — the system used the cheapest fetcher tier that worked, rather than always reaching for the stealthy browser.

## Edge Cases & Gotchas

- **StealthyFetcher is Camoufox/Firefox, not Chromium.** Do **not** force a Chrome/Chromium User-Agent on the stealthy tier — a Chrome UA on a Firefox engine is a fingerprint mismatch that makes bot detection *easier*, defeating the point. Let Camoufox present its own coherent fingerprint.
- **A single StealthyFetcher fetch has no infinite scroll.** One stealthy fetch returns one settled page. For high-yield harvesting that needs lazy-loaded content, use **DynamicFetcher with scroll** (it can scroll-and-settle in a loop). Don't expect StealthyFetcher alone to page through an infinite grid.
- **429 / Cloudflare / login-redirect → `ScrapingBlockedError`.** These are "the site said no," not bugs — they must surface as `ScrapingBlockedError` so the caller can fall back rather than retry blindly.
- **First `uv run` provisions the PEP 723 environment and is slow.** The sidecar declares its deps inline (PEP 723); the very first invocation resolves and builds that env (and may trigger browser downloads), taking noticeably longer. Subsequent runs are fast. Don't mistake first-run latency for a hang or a timeout bug.

## Tacit Expertise

ScrapeEngine was built specifically to kill the recurring pain in MoodBoarder's Pinterest harvest:

- The Pinterest `<video>` → `<source src>` markup that Pinterest A/B-tests and periodically restructures — `adaptive=True` relocation is meant to survive exactly this churn instead of breaking the video-pin selector on every layout experiment.
- The `_auth` / `_pinterest_sess` cookie rotation that intermittently bounces sessions to `/login` — the cookie bridge + `ScrapingBlockedError` fallback contract lets MoodBoarder keep its existing login path as the safety net while routing the happy path through ScrapeEngine.

The generic design is deliberate: instagram-scrapper (also authenticated, also `cookies.json`-based) is the obvious next consumer, so nothing in the engine is Pinterest-specific.
