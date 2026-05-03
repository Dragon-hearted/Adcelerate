# Plan: Fix PR #10 Review Findings (Security + Correctness + UX)

## Task Description

PR #10 (`Add impeccable design skill and token usage analytics`, branch `claude/refine-local-plan-BYyga`, 82 files / +17,618) shipped:
- Token usage analytics (server transcript ingest + Vue panel)
- Vendored impeccable + design-taste-frontend skills

Six parallel zero-context scout agents plus the formal `/review` and `/security-review` skills surfaced ~30 findings. This plan fixes **everything** — CRITICAL through MEDIUM — across server, client, and the vendored impeccable scripts. Patches to vendored scripts are documented in `NOTICE.md` so future upstream re-syncs can 3-way merge cleanly.

The fix branch is the existing PR branch (`claude/refine-local-plan-BYyga`); commits land via `git push no-mistakes <branch>` so the no-mistakes proxy validates each push before forwarding to origin.

## Objective

When complete:
- Two confirmed HIGH-severity security holes (path traversal in `/source`; CORS+token-leak CSRF chain) are closed.
- Transcript ingest no longer silently corrupts on multibyte boundaries, file truncation/rotation, or concurrent file events.
- Cost math is timezone- and DST-correct; pricing model match has a separator boundary; SUM aggregations are NULL-safe.
- Server fetch handler tolerates malformed query params; WebSocket dead-client pruning works; lifecycle is clean on SIGTERM.
- Client composable state is per-mount, abortable, monotonic, and reconnect-resilient.
- UI panels render correctly at small widths, on hi-DPI displays, in alternate themes, with proper a11y.
- Impeccable live-server is hardened against drive-by writes (Origin/Host checks, no wildcard CORS, realpath containment, symlink escape blocked).
- All formatters centralized; locale-aware via `Intl.NumberFormat`.
- New unit tests cover transcript parsing, pricing math, time-bucket boundaries, and a smoke test mounts `TokenUsagePanel`.
- PR #10 build is green; no new failures introduced.

## Problem Statement

The original PR shipped a working feature surface but hides ~30 issues across three risk classes:

1. **Security** (HIGH): impeccable's live-server allows any visited webpage to lift its auth token and write to project source files via CSRF; its `/source` endpoint leaks files in any sibling directory whose name starts with the project basename.
2. **Silent data corruption** (CRITICAL): transcript ingest runs `Buffer.toString('utf8')` then re-encodes to advance byte offsets — at multibyte UTF-8 boundaries this drifts forever. Concurrent re-entrancy on the same file produces duplicate inserts. File truncation/rotation freezes the file's offset.
3. **Wrong-but-plausible numbers** (HIGH): pricing's unanchored `startsWith` mis-prices future SKUs; week/month windows ride DST; bucket math uses UTC while summary uses local time.

Plus ~15 MEDIUM correctness/UX issues that compound the above (composable state leak, missing AbortController, locale-broken formatters, missing scope="col", DPR transform accumulation, etc.).

## Solution Approach

Five parallel workstreams, then a unified test + validation pass, then push through `no-mistakes` for an independent gate. Every builder is read-isolated — they work on disjoint file sets and hand off through the validator before merge. No builder writes outside its declared file set. Tests are added in lockstep with each fix so regressions are caught before the next builder starts.

For vendored impeccable scripts: patch in place, record diff in `NOTICE.md` under a new "Local Patches" section pointing to upstream commit + line ranges + reason, so the next upstream sync can resolve cleanly.

## Relevant Files

### Files to read for context (unchanged)

- `apps/server/src/db.ts` (existing schema patterns + new tables)
- `apps/server/src/index.ts` (Bun.serve handler)
- `.claude/hooks/library_sync.py` (auto-syncs `.agents/skills/` into `library.yaml`)
- `app_docs/install_results.md` (current state)

### Files to modify (server)

- `apps/server/src/transcript-ingest.ts` — full rewrite of read path + lifecycle
- `apps/server/src/transcript-parser.ts` — drop `Date.now()` timestamp fallback
- `apps/server/src/pricing.ts` — add separator boundary on `startsWith`
- `apps/server/src/token-queries.ts` — DST/timezone math, NULL-safe SUMs, single time origin
- `apps/server/src/routes/tokens.ts` — cap `cwd` length; return 405 on non-GET
- `apps/server/src/db.ts` — add `PRAGMA table_info` migration mirror for new tables; `Number()` cast on `lastInsertRowid`
- `apps/server/src/index.ts` — outer try/catch on fetch, WS readyState check, SIGTERM handler, CORS header policy fix, `/api/tokens/*` 404 on non-GET

### Files to modify (client)

- `apps/client/src/composables/useTokens.ts` — per-mount state, AbortController, requestSeq, splice eviction, REST fallback in findCostForEvent
- `apps/client/src/composables/useWebSocket.ts` — refetchAll on reconnect, parseInt radix, error surfacing
- `apps/client/src/types/tokens.ts` — document `ts` units (ms unix epoch); add a runtime guard
- `apps/client/src/components/TokenTimeseriesChart.vue` — DPR fix, MutationObserver theme listener, rAF resize debounce, small-canvas guard, drop reactive width/height bindings
- `apps/client/src/components/TokenBreakdownTable.vue` — `scope="col"`, sortable + `aria-sort`, disambiguate same-basename keys
- `apps/client/src/components/TokenSummaryCards.vue` — `aria-label` on Live indicator
- `apps/client/src/components/TokenUsagePanel.vue` — `grid-template-rows: 0fr → 1fr` instead of `max-h-[1000px]`
- `apps/client/src/components/EventCostBadge.vue` — Number coercion + NaN guard
- `apps/client/src/components/EventRowCollapsed.vue` — handle missing match gracefully (no `$0.00` placeholder when no token data)
- `apps/client/src/components/LivePulseChart.vue` — refetch trigger from `useTokens` not from the panel
- `apps/client/src/components/FilterPanel.vue` — `watch(props.filters, …, {deep:true})` to re-sync
- `apps/client/src/App.vue` — no changes (mounting position is correct)

### Files to modify (vendored impeccable)

- `.agents/skills/impeccable/scripts/live-server.mjs` — Origin + Host check, drop wildcard CORS, realpath containment on `/source`, JSON body size cap on `/events` and `/poll`
- `.agents/skills/impeccable/scripts/live-accept.mjs` — realpath containment on `findSessionFile` result + before `writeFileSync`
- `.agents/skills/impeccable/scripts/design-parser.mjs` — `__proto__`/`constructor`/`prototype` key filter
- `.agents/skills/impeccable/scripts/is-generated.mjs` — `execFileSync` with arg array; set `GIT_CONFIG_GLOBAL`/`GIT_CONFIG_SYSTEM` to `/dev/null`
- `.agents/skills/impeccable/NOTICE.md` — add **Local Patches** section listing all 4 files patched, upstream pin commit, reason for each patch

### New files

- `apps/client/src/utils/formatters.ts` — centralized `formatCost(usd)`, `formatTokens(n)`, `formatRelative(ts)` using `Intl.NumberFormat`/`Intl.RelativeTimeFormat`
- `apps/server/src/transcript-parser.test.ts` — assistant turn / summary / malformed JSON / multibyte split / CRLF
- `apps/server/src/pricing.test.ts` — boundary match, unknown model fallback, cache field math
- `apps/server/src/token-queries.test.ts` — period boundaries (DST transition day), NULL handling, hour bucket alignment
- `apps/client/src/components/__tests__/TokenUsagePanel.smoke.test.ts` — mount + stubbed WS + snapshot

### Files NOT to touch

- `.agents/skills/impeccable/scripts/live-browser.js` (4781-line vendor bundle)
- `.agents/skills/impeccable/scripts/modern-screenshot.umd.js` (vendor bundle)
- `apps/server/bun.lock` (auto-managed)
- `library.yaml` (auto-synced by `library_sync` hook)

## Implementation Phases

### Phase 0: Tooling (parallel-safe)

Install no-mistakes and configure the proxy remote. Verify `git push no-mistakes <branch>` works against this repo before any code lands.

### Phase 1: Foundation (parallel)

Three parallel server tracks (ingest, api, math) + two parallel client tracks (data, ui) + one impeccable-security track. Each builder owns a disjoint file set.

### Phase 2: Tests + integration

Test builder writes unit + smoke tests against the now-fixed code. Validates each fix in isolation. Notes any drift between builders.

### Phase 3: Validation + push

Validator runs the full validation matrix. Then push to no-mistakes; address any pipeline findings; force-push to PR #10.

## Team Orchestration

- You operate as the team lead and orchestrate the team to execute the plan.
- You're responsible for deploying the right team members with the right context to execute the plan.
- IMPORTANT: You NEVER operate directly on the codebase. You use `Task` and `Task*` tools to deploy team members to the building, validating, testing, deploying, and other tasks.
  - This is critical. Your job is to act as a high-level director of the team, not a builder.
  - Your role is to validate all work is going well and make sure the team is on track to complete the plan.
  - You'll orchestrate this by using the Task* Tools to manage coordination between the team members.
  - Communication is paramount. You'll use the Task* Tools to communicate with the team members and ensure they're on track to complete the plan.
- Take note of the session id of each team member. This is how you'll reference them.

### Team Members

- Builder
  - Name: builder-no-mistakes
  - Role: Install no-mistakes from `https://raw.githubusercontent.com/kunchenguid/no-mistakes/main/docs/install.sh`. Configure proxy remote so `git push no-mistakes claude/refine-local-plan-BYyga` forwards to `origin`. Verify with a dry push (no commits) and document the install in `app_docs/no-mistakes-setup.md`.
  - Agent Type: builder
  - Resume: true

- Builder
  - Name: builder-server-ingest
  - Role: Owns `apps/server/src/transcript-ingest.ts` and `apps/server/src/transcript-parser.ts`. Fixes multibyte boundary corruption (operate on Buffer, byte-index `\n`s), per-file mutex against concurrent re-entrancy, truncation/rotation reset, `unlink` handler, p-limit on backfill, `followSymlinks: false`, per-row try/catch, in-flight tracking on shutdown, drop `Date.now()` timestamp fallback (use file mtime).
  - Agent Type: builder
  - Resume: true

- Builder
  - Name: builder-server-api
  - Role: Owns `apps/server/src/index.ts`, `apps/server/src/db.ts`, `apps/server/src/routes/tokens.ts`. Fixes outer try/catch on fetch, WS readyState check, SIGTERM/SIGINT handler with `stop()` + `db.close()`, CORS reflection policy, `/api/tokens/*` 404 on non-GET, `cwd` length cap, `PRAGMA table_info` migration mirror for `token_events` + `transcript_offsets`, `Number(lastInsertRowid)` casts.
  - Agent Type: builder
  - Resume: true

- Builder
  - Name: builder-server-math
  - Role: Owns `apps/server/src/pricing.ts`, `apps/server/src/token-queries.ts`. Adds separator boundary on `startsWith`, calendar-arithmetic period boundaries (DST-safe), single time origin (UTC epoch math everywhere with explicit `tzOffsetMs` shift on render), splits SUM into per-column SUMs.
  - Agent Type: builder
  - Resume: true

- Builder
  - Name: builder-client-data
  - Role: Owns `apps/client/src/composables/useTokens.ts`, `apps/client/src/composables/useWebSocket.ts`, `apps/client/src/types/tokens.ts`, `apps/client/src/utils/formatters.ts` (new). Per-mount state, AbortController per fetch, monotonic `requestSeq`, splice-based eviction, REST fallback in `findCostForEvent`, `refetchAll()` on WS reconnect, `parseInt` radix, error surfacing, runtime ts-units guard, central formatters using `Intl.NumberFormat`.
  - Agent Type: builder
  - Resume: true

- Builder
  - Name: builder-client-ui
  - Role: Owns `apps/client/src/components/TokenTimeseriesChart.vue`, `TokenBreakdownTable.vue`, `TokenSummaryCards.vue`, `TokenUsagePanel.vue`, `EventCostBadge.vue`, `EventRowCollapsed.vue`, `LivePulseChart.vue` (diff only), `FilterPanel.vue` (diff only). DPR transform fix, MutationObserver theme listener, rAF resize, small-canvas guard, scope="col" + sortable headers, aria-label on Live indicator, grid-template-rows transition, NaN guards, project-key disambiguation, props watch in FilterPanel. **Depends on builder-client-data** (uses the new formatters).
  - Agent Type: builder
  - Resume: true

- Builder
  - Name: builder-impeccable-security
  - Role: Owns `.agents/skills/impeccable/scripts/live-server.mjs`, `live-accept.mjs`, `design-parser.mjs`, `is-generated.mjs`, `NOTICE.md`. Adds Origin + Host header validation, drops wildcard CORS, adds `realpathSync` containment on `/source` and on `findSessionFile` write target, caps JSON body size, filters `__proto__`/`constructor`/`prototype` in YAML parser, switches `is-generated.mjs` to `execFileSync` with arg array + `GIT_CONFIG_*=/dev/null`. Documents every patch in `NOTICE.md` under "Local Patches" with upstream commit pin.
  - Agent Type: builder
  - Resume: true

- Builder
  - Name: builder-tests
  - Role: Owns the four new test files. Writes unit tests for transcript-parser (assistant / summary / malformed / multibyte / CRLF), pricing (boundary match, unknown model, cache field math), token-queries (period boundaries on DST transition day, NULL handling, hour bucket alignment), plus a Vitest smoke that mounts `TokenUsagePanel` against a stubbed WebSocket and asserts cards render. Adds a `bun:test` script to `apps/server/package.json` if not present.
  - Agent Type: builder
  - Resume: false

- Validator
  - Name: validator
  - Role: Runs every command in **Validation Commands**. Smokes the dashboard end-to-end (boots server, opens client, verifies live token ingest within 2s of a `claude` turn). Confirms each acceptance criterion with a concrete observation. If any check fails, files a follow-up task and reassigns to the responsible builder. Final step: `git push no-mistakes claude/refine-local-plan-BYyga` and verifies the proxy forwards to origin.
  - Agent Type: validator
  - Resume: false

## Step by Step Tasks

- IMPORTANT: Execute every step in order, top to bottom. Each task maps directly to a `TaskCreate` call.
- Before you start, run `TaskCreate` to create the initial task list that all team members can see and execute.

### 1. Install no-mistakes
- **Task ID**: install-no-mistakes
- **Depends On**: none
- **Assigned To**: builder-no-mistakes
- **Agent Type**: builder
- **Parallel**: true
- Run `curl -fsSL https://raw.githubusercontent.com/kunchenguid/no-mistakes/main/docs/install.sh | sh`.
- Verify install: `which no-mistakes && no-mistakes --version`.
- Configure the proxy remote: `git remote add no-mistakes <upstream-url>` if missing, or follow no-mistakes' setup instructions for proxying `origin`.
- Test push (dry run / verify config only — do NOT push real commits yet): consult `no-mistakes --help` for the dry-run flag.
- Document install + remote config in `app_docs/no-mistakes-setup.md`.

### 2. Server: transcript ingest hardening
- **Task ID**: server-ingest-fix
- **Depends On**: none
- **Assigned To**: builder-server-ingest
- **Agent Type**: builder
- **Parallel**: true
- Replace `buf.toString('utf8')` + re-encoding with raw `Buffer` operations: locate `\n` byte indices via `buf.indexOf(0x0A, ...)`, slice byte ranges, decode each line with `StringDecoder`.
- Add per-file mutex: `Map<string, Promise<void>>` chain runs onto existing promise, prevent parallel ingest of same file.
- On `st.size < storedOffset`: reset offset to 0 and re-ingest. Track `(dev, ino)` to detect file replacement and reset on inode change.
- Handle `unlink` event: delete the file's offset row.
- Cap per-read size: if `st.size - startOffset > 50MB` and no `\n` found, log + skip (prevents single-line file blow-up).
- chokidar options: `followSymlinks: false`, `ignored: /(^|[/\\])\\../`.
- Wrap `insertTokenEvent` in try/catch per row; advance offset regardless of single-row failure.
- Track in-flight ingests in a `Set<Promise>`; on shutdown `await Promise.allSettled(inflight)` before close.
- Limit backfill concurrency (p-limit, max 8 parallel `ingestFile` calls).
- `transcript-parser.ts:51` — return `null` (or use file mtime passed in) instead of `Date.now()` when `obj.timestamp` is missing.

### 3. Server: API + DB hardening
- **Task ID**: server-api-fix
- **Depends On**: none
- **Assigned To**: builder-server-api
- **Agent Type**: builder
- **Parallel**: true
- Wrap entire `fetch` body in `try { ... } catch (err) { console.error(err); return new Response('Internal Server Error', { status: 500 }); }` — never echo `err.message` to clients.
- Coerce `parseInt` outputs: `Number.isFinite(n) ? n : DEFAULT` before passing to `LIMIT`.
- WS broadcast: check `client.readyState === 1` before send; check `send()` return value; periodic sweep of `wsClients` set.
- Capture `stop` thunk from `startTranscriptIngest`; install `process.on('SIGTERM' | 'SIGINT', async () => { await stop(); db.close(); server.stop(); })`.
- CORS: omit `Access-Control-Allow-Origin` for unknown origins instead of falling back to `allowedOrigins[0]`.
- `/api/tokens/*` non-GET fallthrough: return 405 with `Allow: GET` header.
- Cap `cwd` query param length to 4096 chars in `routes/tokens.ts`; return 400 on overflow.
- Add `PRAGMA table_info(token_events)` + `ALTER TABLE` migration block matching the events-table pattern in `db.ts:28-60`. Same for `transcript_offsets`.
- All `lastInsertRowid as number` → `Number(lastInsertRowid)`.

### 4. Server: pricing + math correctness
- **Task ID**: server-math-fix
- **Depends On**: none
- **Assigned To**: builder-server-math
- **Agent Type**: builder
- **Parallel**: true
- `pricing.ts:44` — replace `model.startsWith(key)` with `model === key || model.startsWith(key + '-')`. Add a unit test asserting `'claude-opus-4-10'` does NOT match `'claude-opus-4-7'`.
- `pricing.ts` unknown-model handling: return `null` cost (current); add explicit comment that aggregation must `COALESCE(SUM(cost_usd), 0)` and surface `unpriced_tokens` separately if any.
- `token-queries.ts:66-67` — replace `todayStart - 6*dayMs` with calendar arithmetic: `const start = new Date(now); start.setDate(start.getDate() - 6); start.setHours(0, 0, 0, 0);`. Same for month with `setDate(d - 29)`.
- `token-queries.ts:89` — pick a single time origin. Either: (a) use UTC epoch math everywhere, including `startOfDayMs`, OR (b) compute and apply `tzOffsetMs = new Date().getTimezoneOffset() * 60000` consistently. Document the choice in the file header.
- `token-queries.ts:91, 117` — split `SUM(input + cache_read + cache_write_5m + cache_write_1h + output)` into `SUM(input) + SUM(cache_read) + SUM(cache_write_5m) + SUM(cache_write_1h) + SUM(output)`. Or wrap each column in `COALESCE(col, 0)`.

### 5. Client: data layer + formatters
- **Task ID**: client-data-fix
- **Depends On**: none
- **Assigned To**: builder-client-data
- **Agent Type**: builder
- **Parallel**: true
- `useTokens.ts` — move all module-scoped refs inside `useTokens()` factory. Track `subscribers` count; reset state when count reaches 0 on unmount. Add `requestSeq` counter per fetch; drop responses whose seq != current. Add `AbortController` per fetch, abort on unmount. Replace `push + shift` loop with `if (length > MAX) splice(0, length - MAX)`. In `findCostForEvent`, if no match in `liveEvents`, fall back to `GET /api/tokens/event?session_id=&ts=` (add this server endpoint as part of the fix).
- `useWebSocket.ts` — track `wasConnected` flag; on `onopen` after a previous close, call `useTokens().refetchAll()` and re-fetch recent events from `/events/recent`. Add `parseInt(..., 10)`. Surface parse errors to a UI-visible state (toast or console + dev banner).
- `types/tokens.ts` — add comment `// ts: ms unix epoch (matches Date.now())` to every `ts: number` field. Add a runtime guard helper `assertMsTs(ts: number)` that throws if `ts < 1e12 || ts > 1e14`.
- New `apps/client/src/utils/formatters.ts` — export `formatCost(usd: number, locale?: string)`, `formatTokens(n: number)`, `formatRelative(ts: number)` using `Intl.NumberFormat` and `Intl.RelativeTimeFormat`. Add tests in same file.
- Add a server endpoint `/api/tokens/event?session_id=&ts=&window=` returning the closest `token_events` row within `window` ms. (This is a small server addition required by the REST-fallback in `findCostForEvent`.)

### 6. Client: UI components
- **Task ID**: client-ui-fix
- **Depends On**: client-data-fix
- **Assigned To**: builder-client-ui
- **Agent Type**: builder
- **Parallel**: false
- Replace all 6 in-component `formatCost` copies with `import { formatCost } from '@/utils/formatters'`.
- `TokenTimeseriesChart.vue` — drop reactive `:width`/`:height` bindings (set them only inside `draw()`); use `ctx.setTransform(dpr,0,0,dpr,0,0)`; gate `draw()` on `cssW > 8 && cssH > 8`; add `MutationObserver` on `documentElement.classList` mirroring `LivePulseChart` pattern; wrap ResizeObserver callback in `requestAnimationFrame` with a `pending` flag.
- `TokenBreakdownTable.vue` — add `scope="col"` to all `<th>`. If columns should be sortable: convert to `<th><button @click="sort(col)" :aria-sort="sortAria(col)">…</button></th>`. Disambiguate `formatKey` collisions: when last-2-segments match, prepend the parent-of-parent.
- `TokenSummaryCards.vue` — replace `title="Live"` with `aria-label="Live"` on the indicator span; key the live indicator on a semantic flag (e.g. `period === 'today'`), not array index.
- `TokenUsagePanel.vue` — replace `max-h-[1000px]` Tailwind transition with `grid-template-rows: 0fr → 1fr` pattern (or raise to `5000px` if grid is fragile).
- `EventCostBadge.vue` — `Number(tokens) || 0`; guard `NaN` via `Number.isFinite`.
- `EventRowCollapsed.vue` — when no token data joins (`costMatch` is null), render nothing — never show `$0.00` placeholder.
- `LivePulseChart.vue` — move `refetchAll` trigger from `onMounted` of `TokenUsagePanel` into `useTokens()` first-subscribe. Charts depending on `tokenSummary` now hydrate even when the panel is collapsed/hidden.
- `FilterPanel.vue` — add `watch(() => props.filters, v => Object.assign(localFilters, v), { deep: true })` so external filter resets re-sync the dropdowns.

### 7. Impeccable: security hardening
- **Task ID**: impeccable-security-fix
- **Depends On**: none
- **Assigned To**: builder-impeccable-security
- **Agent Type**: builder
- **Parallel**: true
- `live-server.mjs` — at top of request handler, validate `Host` header equals `localhost:<port>` or `127.0.0.1:<port>`; reject otherwise (DNS rebinding closure). Validate `Origin` header (when present) against the same allowlist; reject otherwise. Drop `Access-Control-Allow-Origin: *`; either remove CORS entirely or echo only the validated Origin.
- `live-server.mjs` `/source` — replace `startsWith(process.cwd())` containment with `const root = fs.realpathSync(process.cwd()); const abs = fs.realpathSync(path.resolve(root, filePath)); if (abs !== root && !abs.startsWith(root + path.sep)) { res.writeHead(403); return res.end('Forbidden'); }`. Also reject if `lstat(abs).isSymbolicLink()` — defense in depth.
- `live-server.mjs` `/events` and `/poll` POST — track `body.length` cumulatively; `req.destroy()` past 1 MB; return 413.
- `live-accept.mjs` — after `findSessionFile` returns, `const real = fs.realpathSync(target); if (path.relative(cwd, real).startsWith('..')) throw new Error('symlink escape')`. Apply same check before `fs.writeFileSync` in `handleAccept` and `handleDiscard`.
- `design-parser.mjs:44-79` — in `parseYamlSubset`, `if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;`. Use `Object.create(null)` for `root` and sub-objects.
- `is-generated.mjs:43-48` — replace `execSync(\`git check-ignore --quiet ${JSON.stringify(absPath)}\`, ...)` with `execFileSync('git', ['check-ignore', '--quiet', absPath], { cwd, stdio: 'ignore', env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null' } })`.
- `NOTICE.md` — add a "## Local Patches" section with subsections for each of the 4 patched files. For each: upstream commit pin (record current upstream HEAD via `git ls-remote https://github.com/pbakaus/impeccable HEAD`), affected line ranges, the patch reason (1 sentence), and a CVE-style identifier (e.g. `ADCL-2026-001`).

### 8. Tests
- **Task ID**: tests
- **Depends On**: server-ingest-fix, server-api-fix, server-math-fix, client-data-fix, client-ui-fix, impeccable-security-fix
- **Assigned To**: builder-tests
- **Agent Type**: builder
- **Parallel**: false
- `apps/server/src/transcript-parser.test.ts` — fixtures: assistant turn with usage, system turn (skip), malformed JSON line (skip), CRLF line endings, multi-byte emoji split across simulated chunk boundary, missing `usage` field.
- `apps/server/src/pricing.test.ts` — exact match, prefix+separator match, unknown model returns `null`, future SKU like `claude-opus-4-10-20260101` does NOT match `claude-opus-4-7`.
- `apps/server/src/token-queries.test.ts` — period boundary on DST transition day (mock `Date`), NULL column safety, hour bucket alignment to a fixed timezone.
- `apps/client/src/components/__tests__/TokenUsagePanel.smoke.test.ts` — mount panel with stubbed `useTokens`; assert summary cards render; emit a fake `token_event` via stubbed WS and assert reactive update.
- Add `"test": "bun test"` script to `apps/server/package.json` if missing. Add `"test:smoke": "vitest run"` to `apps/client/package.json` if missing.

### 9. Final validation + push
- **Task ID**: validate-and-push
- **Depends On**: install-no-mistakes, tests
- **Assigned To**: validator
- **Agent Type**: validator
- **Parallel**: false
- Run all commands in **Validation Commands**.
- Verify each item in **Acceptance Criteria** with a concrete observation.
- Commit each fix in topic-scoped commits using Conventional Commits format:
  - `fix(server-ingest): operate on raw Buffer to avoid multibyte offset drift`
  - `fix(server-api): outer try/catch + WS readyState + SIGTERM lifecycle`
  - `fix(server-math): DST-safe period boundaries + SUM null safety`
  - `fix(client-data): per-mount state + AbortController + monotonic seq`
  - `fix(client-ui): DPR transform + a11y + locale-aware formatters`
  - `fix(impeccable): origin/host validation + realpath containment + body cap`
  - `test: cover transcript parsing, pricing, time buckets, panel smoke`
  - `chore(no-mistakes): install + configure proxy remote`
- Push: `git push no-mistakes claude/refine-local-plan-BYyga`. If no-mistakes pipeline reports issues, address them and re-push.
- Verify PR #10 is updated and CI is green.

## Acceptance Criteria

### Security
1. Cross-origin `fetch('http://localhost:8400/live.js')` from any non-localhost Origin returns 403 (Origin check) — verified by curl with a fake Origin header.
2. POST to `/source?path=/Users/<user>/Adcelerate-secrets/.env` (or any sibling-prefix path) returns 403 — verified by curl.
3. POST to `/events` without a matching `Origin` is rejected — verified by curl.
4. `live-accept.mjs` refuses to write through a symlink that escapes cwd — verified by a unit test creating a temp symlink.

### Server correctness
5. A transcript file with a multibyte emoji split across read boundaries ingests cleanly — verified by `transcript-parser.test.ts`.
6. Two concurrent `change` events on the same file produce no duplicate inserts — verified by a `transcript-ingest.test.ts` mutex test.
7. `bun:sqlite` LIMIT NaN no longer crashes the server — verified by `curl 'localhost:4000/events/recent?limit=abc'` returning a sane response.
8. `pricing` rejects a future SKU mismatch — verified by `pricing.test.ts`.
9. Period boundaries on a DST transition day produce correct row counts — verified by `token-queries.test.ts`.
10. `Number.isFinite(n)` coercion in API params — verified by request fuzz.
11. SIGTERM closes the watcher and DB cleanly — verified by `kill -TERM $(pgrep -f 'apps/server')` then checking the WAL file is checkpointed.

### Client correctness
12. Mounting and unmounting `TokenUsagePanel` repeatedly does not leak refs — verified by Vue devtools / smoke test.
13. WebSocket reconnect re-fetches recent token events (no permanent gap) — verified by killing/restarting the server with the panel open.
14. `TokenTimeseriesChart` renders correctly at 1× and 2× DPR; theme switch redraws — verified by smoke test + visual inspection.
15. `TokenBreakdownTable` headers have `scope="col"`; sortable headers have `aria-sort` — verified by axe-core.
16. `EventCostBadge` never renders `NaN` — verified by smoke test with a missing-field event.

### Build + integration
17. `bun run --cwd apps/server tsc --noEmit` passes.
18. `bun run --cwd apps/client build` passes.
19. `bun test --cwd apps/server` passes (4 new test files green).
20. `bun run --cwd apps/client test:smoke` passes.
21. `just obs-bg` boots; `curl localhost:4000/health` returns OK.
22. Live smoke: run `claude` in another terminal, observe new token events in the dashboard within 2s.
23. `app_docs/no-mistakes-setup.md` exists; `which no-mistakes` resolves; `git push no-mistakes claude/refine-local-plan-BYyga` succeeds (or returns specific actionable feedback that the team addresses before the next push).
24. PR #10 CI is green; no new regressions introduced (existing event timeline, theme manager, filter panel still function).

### Documentation
25. `.agents/skills/impeccable/NOTICE.md` has a "Local Patches" section listing all 4 patched files with upstream commit pin and identifiers `ADCL-2026-001` through `ADCL-2026-004`.

## Validation Commands

Execute these to validate completion:

```bash
# Build / type-check
cd apps/server && bun install && bun tsc --noEmit
cd apps/client && bun install && bun run build

# Unit tests
cd apps/server && bun test
cd apps/client && bun run test:smoke 2>/dev/null || echo "smoke runner not configured"

# Boot
just obs-bg && sleep 3
curl -s http://localhost:4000/health
curl -s 'http://localhost:4000/api/tokens/summary' | jq .
curl -s 'http://localhost:4000/api/tokens/timeseries?range=7d&bucket=day' | jq .
curl -s 'http://localhost:4000/api/tokens/breakdown?by=model' | jq .

# Security regression checks (impeccable live-server must be running)
curl -i -H 'Origin: https://evil.com' http://127.0.0.1:8400/live.js | head -10  # expect 403
curl -i 'http://127.0.0.1:8400/source?token=<uuid>&path=/etc/passwd'           # expect 403
curl -i 'http://127.0.0.1:8400/source?token=<uuid>&path=../sibling/x'         # expect 403

# Fuzz the API param coercion
curl -i 'http://localhost:4000/events/recent?limit=abc'                       # expect 200 with default

# Lifecycle
kill -TERM $(pgrep -f 'apps/server')
ls -la apps/server/events.db-wal                                              # expect file gone or near-zero size

# Push
git status
which no-mistakes && no-mistakes --version
git push no-mistakes claude/refine-local-plan-BYyga
gh pr checks 10
```

## Notes

- **Conventional Commits required**: every commit message follows `type(scope): subject`. Types: `fix`, `test`, `chore`, `docs`. Scopes: `server-ingest`, `server-api`, `server-math`, `client-data`, `client-ui`, `impeccable`, `tests`, `no-mistakes`. The validator MUST enforce this pattern when committing.
- **No-mistakes contract**: every push to PR #10 goes through `git push no-mistakes claude/refine-local-plan-BYyga`. If the pipeline reports issues, address them and push again — do not bypass with `git push origin`.
- **Vendored impeccable**: any patches go into `NOTICE.md` "Local Patches" with the upstream HEAD commit pin recorded at patch time, so a future re-vendor can 3-way merge cleanly.
- **No new issues guardrail**: validator runs the full validation matrix after EACH builder hands off, not just at the end. If a builder's commit breaks the build or a prior test, the validator pings the responsible builder before the next builder starts.
- **Commits are atomic per scope**: don't bundle unrelated fixes into one commit. Reviewers (and no-mistakes' pipeline) need clear scope boundaries.
- **Smoke runner**: if `vitest` isn't already configured for `apps/client`, `builder-tests` adds it (`bun add -d vitest @vue/test-utils jsdom` + minimal `vitest.config.ts`).
- **Path traversal regression test**: a permanent fixture under `apps/server/src/__tests__/security/` so the impeccable patches are gated by CI and don't silently regress on future re-vendor.
- **REST fallback endpoint**: `/api/tokens/event?session_id=&ts=&window=` is a small additive endpoint that supports `findCostForEvent`'s graceful degradation. It belongs in `routes/tokens.ts`, owned by builder-server-api in this same PR.
