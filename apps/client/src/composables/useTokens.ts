import { ref, computed, getCurrentScope, onScopeDispose, type Ref } from 'vue';
import { API_BASE_URL } from '../config';
import type {
  TokenEvent,
  TokenSummary,
  TokenTimeseriesPoint,
  TokenBreakdownRow,
  TokenRange,
  TokenBucket,
  TokenBreakdownDimension,
} from '../types/tokens';

// =============================================================================
// Per-mount state via shared singleton with reference counting.
//
// All reactive state is owned by a single `state` object created the first
// time `useTokens()` is called. Each call increments `subscribers`; when
// the last subscriber unmounts (`onScopeDispose`), state is reset to defaults
// and any in-flight fetches are aborted. This avoids both:
//   - the previous module-scoped leak (state survived across remount, mixing
//     stale results into the new mount), and
//   - the cost of allocating a fresh state per consumer in the same mount tree.
// =============================================================================

interface TokensState {
  summary: Ref<TokenSummary | null>;
  timeseries: Ref<TokenTimeseriesPoint[]>;
  breakdown: Ref<TokenBreakdownRow[]>;
  liveEvents: Ref<TokenEvent[]>;
  lastEvent: Ref<TokenEvent | null>;
  loading: Ref<boolean>;
  error: Ref<string | null>;
  range: Ref<TokenRange>;
  bucket: Ref<TokenBucket>;
  breakdownDim: Ref<TokenBreakdownDimension>;
  refetchScheduled: { value: boolean };
  // Monotonic per-endpoint sequence counters; a fetch captures the seq
  // before its await and discards the result if a newer fetch superseded it.
  seq: { summary: number; timeseries: number; breakdown: number };
  // AbortControllers tracked per endpoint so a new fetch can cancel its
  // predecessor and unmount can cancel everything in flight.
  controllers: {
    summary: AbortController | null;
    timeseries: AbortController | null;
    breakdown: AbortController | null;
  };
  // Cache for the REST event-cost fallback, keyed by `${session_id}|${ts}`.
  // The Map itself is plain (not reactive), but every mutation bumps
  // `costCacheVersion` so consumers reading the cache via the public
  // `findCostForEvent` register a reactive dep that refires when the
  // async REST fallback resolves.
  costCache: Map<string, { cost_usd: number; tokens: number } | null>;
  costCacheVersion: Ref<number>;
}

let sharedState: TokensState | null = null;
let subscribers = 0;

const MAX_LIVE_EVENTS = 500;
const MATCH_WINDOW_MS = 60_000;

function createState(): TokensState {
  return {
    summary: ref<TokenSummary | null>(null),
    timeseries: ref<TokenTimeseriesPoint[]>([]),
    breakdown: ref<TokenBreakdownRow[]>([]),
    liveEvents: ref<TokenEvent[]>([]),
    lastEvent: ref<TokenEvent | null>(null),
    loading: ref(false),
    error: ref<string | null>(null),
    range: ref<TokenRange>('7d'),
    bucket: ref<TokenBucket>('day'),
    breakdownDim: ref<TokenBreakdownDimension>('model'),
    refetchScheduled: { value: false },
    seq: { summary: 0, timeseries: 0, breakdown: 0 },
    controllers: { summary: null, timeseries: null, breakdown: null },
    costCache: new Map(),
    costCacheVersion: ref(0),
  };
}

function resetState(s: TokensState): void {
  // Abort anything still in flight before tearing down state, otherwise
  // a late response could mutate refs that no longer have subscribers.
  s.controllers.summary?.abort();
  s.controllers.timeseries?.abort();
  s.controllers.breakdown?.abort();
  s.controllers.summary = null;
  s.controllers.timeseries = null;
  s.controllers.breakdown = null;
  s.summary.value = null;
  s.timeseries.value = [];
  s.breakdown.value = [];
  s.liveEvents.value = [];
  s.lastEvent.value = null;
  s.loading.value = false;
  s.error.value = null;
  s.range.value = '7d';
  s.bucket.value = 'day';
  s.breakdownDim.value = 'model';
  s.refetchScheduled.value = false;
  s.seq.summary = 0;
  s.seq.timeseries = 0;
  s.seq.breakdown = 0;
  s.costCache.clear();
  s.costCacheVersion.value = 0;
}

// Mutate the cache and bump the reactive version counter in one place so
// every write is visible to reactive consumers without making the Map
// itself reactive (which Vue 3 cannot track on Map mutations).
function setCostCache(
  s: TokensState,
  key: string,
  value: { cost_usd: number; tokens: number } | null
): void {
  s.costCache.set(key, value);
  s.costCacheVersion.value++;
}

// -----------------------------------------------------------------------------
// Number coercion helpers — server is authoritative, but if a value ever comes
// back as a string (e.g. SQLite numeric edge case, JSON serializer quirk), we
// don't want NaN propagating into reactive bindings and the chart canvas.
// -----------------------------------------------------------------------------

function coerceNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function coercePeriod<T extends Record<string, unknown>>(p: T): T {
  const out: Record<string, unknown> = { ...p };
  for (const k of ['cost_usd', 'input', 'output', 'cache_read', 'cache_write_5m', 'cache_write_1h', 'count', 'tokens']) {
    if (k in out) out[k] = coerceNum(out[k]);
  }
  return out as T;
}

function coerceSummary(s: TokenSummary): TokenSummary {
  return {
    today: coercePeriod(s.today as unknown as Record<string, unknown>) as unknown as TokenSummary['today'],
    week: coercePeriod(s.week as unknown as Record<string, unknown>) as unknown as TokenSummary['week'],
    month: coercePeriod(s.month as unknown as Record<string, unknown>) as unknown as TokenSummary['month'],
  };
}

function coerceTimeseries(rows: TokenTimeseriesPoint[]): TokenTimeseriesPoint[] {
  return rows.map((r) => ({
    ts: coerceNum(r.ts),
    cost_usd: coerceNum(r.cost_usd),
    tokens: coerceNum(r.tokens),
  }));
}

function coerceBreakdown(rows: TokenBreakdownRow[]): TokenBreakdownRow[] {
  return rows.map((r) => ({
    key: r.key,
    cost_usd: coerceNum(r.cost_usd),
    tokens: coerceNum(r.tokens),
    count: coerceNum(r.count),
  }));
}

function coerceEvent(e: TokenEvent): TokenEvent {
  return {
    ...e,
    ts: coerceNum(e.ts),
    input: coerceNum(e.input),
    output: coerceNum(e.output),
    cache_read: coerceNum(e.cache_read),
    cache_write_5m: coerceNum(e.cache_write_5m),
    cache_write_1h: coerceNum(e.cache_write_1h),
    cost_usd: e.cost_usd == null ? null : coerceNum(e.cost_usd),
  };
}

// -----------------------------------------------------------------------------
// Fetch helpers — each endpoint owns its own AbortController + seq, so a
// burst of `setRange()` calls cancels prior in-flight requests and only the
// most recent response is allowed to mutate state.
// -----------------------------------------------------------------------------

async function fetchSummary(s: TokensState): Promise<void> {
  s.controllers.summary?.abort();
  const controller = new AbortController();
  s.controllers.summary = controller;
  const seq = ++s.seq.summary;
  try {
    const res = await fetch(`${API_BASE_URL}/api/tokens/summary`, { signal: controller.signal });
    if (!res.ok) throw new Error(`/api/tokens/summary: ${res.status}`);
    const json = (await res.json()) as TokenSummary;
    if (seq !== s.seq.summary) return;
    s.summary.value = coerceSummary(json);
  } catch (e) {
    if ((e as { name?: string })?.name === 'AbortError') return;
    if (seq !== s.seq.summary) return;
    s.error.value = e instanceof Error ? e.message : String(e);
  } finally {
    if (s.controllers.summary === controller) s.controllers.summary = null;
  }
}

async function fetchTimeseries(s: TokensState): Promise<void> {
  s.controllers.timeseries?.abort();
  const controller = new AbortController();
  s.controllers.timeseries = controller;
  const seq = ++s.seq.timeseries;
  try {
    const url = `${API_BASE_URL}/api/tokens/timeseries?range=${s.range.value}&bucket=${s.bucket.value}`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`/api/tokens/timeseries: ${res.status}`);
    const json = (await res.json()) as TokenTimeseriesPoint[];
    if (seq !== s.seq.timeseries) return;
    s.timeseries.value = coerceTimeseries(json);
  } catch (e) {
    if ((e as { name?: string })?.name === 'AbortError') return;
    if (seq !== s.seq.timeseries) return;
    s.error.value = e instanceof Error ? e.message : String(e);
  } finally {
    if (s.controllers.timeseries === controller) s.controllers.timeseries = null;
  }
}

async function fetchBreakdown(s: TokensState): Promise<void> {
  s.controllers.breakdown?.abort();
  const controller = new AbortController();
  s.controllers.breakdown = controller;
  const seq = ++s.seq.breakdown;
  try {
    const url = `${API_BASE_URL}/api/tokens/breakdown?by=${s.breakdownDim.value}`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`/api/tokens/breakdown: ${res.status}`);
    const json = (await res.json()) as TokenBreakdownRow[];
    if (seq !== s.seq.breakdown) return;
    s.breakdown.value = coerceBreakdown(json);
  } catch (e) {
    if ((e as { name?: string })?.name === 'AbortError') return;
    if (seq !== s.seq.breakdown) return;
    s.error.value = e instanceof Error ? e.message : String(e);
  } finally {
    if (s.controllers.breakdown === controller) s.controllers.breakdown = null;
  }
}

async function refetchAllInternal(s: TokensState): Promise<void> {
  s.loading.value = true;
  try {
    await Promise.all([fetchSummary(s), fetchTimeseries(s), fetchBreakdown(s)]);
    // If every fetch succeeded, clear any prior error banner.
    s.error.value = null;
  } finally {
    s.loading.value = false;
  }
}

function applyTokenEventInternal(s: TokensState, raw: TokenEvent): void {
  const record = coerceEvent(raw);
  s.liveEvents.value.push(record);
  // Splice-based eviction: a single reactive trigger instead of N shifts.
  // (The previous `while … shift()` loop was O(n²) on the reactive proxy.)
  const len = s.liveEvents.value.length;
  if (len > MAX_LIVE_EVENTS) {
    s.liveEvents.value.splice(0, len - MAX_LIVE_EVENTS);
  }
  s.lastEvent.value = record;
  scheduleRefetchInternal(s);
}

function scheduleRefetchInternal(s: TokensState): void {
  if (s.refetchScheduled.value) return;
  s.refetchScheduled.value = true;
  setTimeout(() => {
    s.refetchScheduled.value = false;
    // If state was reset (last unmount) the controllers will be null and
    // refetchAllInternal is a cheap no-op; we still gate on subscribers
    // to avoid a dangling fetch storm right after unmount.
    if (subscribers > 0) refetchAllInternal(s);
  }, 1500);
}

// Synchronous live-events lookup. Returns immediately from the in-memory
// ring buffer; callers that need the fallback path should use
// `findCostForEventAsync` (or wire a `watchEffect` that re-reads after the
// fallback resolves and writes the result into `s.costCache`).
function findCostInLive(
  s: TokensState,
  session_id: string,
  ts: number
): { cost_usd: number; tokens: number } | null {
  let bestDelta = Infinity;
  let best: TokenEvent | null = null;
  for (const t of s.liveEvents.value) {
    if (t.session_id !== session_id) continue;
    const delta = Math.abs(t.ts - ts);
    if (delta > MATCH_WINDOW_MS) continue;
    if (delta < bestDelta) {
      bestDelta = delta;
      best = t;
    }
  }
  if (!best || best.cost_usd == null) return null;
  return {
    cost_usd: best.cost_usd,
    tokens: best.input + best.output + best.cache_read + best.cache_write_5m + best.cache_write_1h,
  };
}

async function findCostForEventInternal(
  s: TokensState,
  session_id: string,
  ts: number
): Promise<{ cost_usd: number; tokens: number } | null> {
  // First try the in-memory live ring buffer — covers the common case
  // where the assistant turn and the cost event arrive within the same
  // dashboard session.
  const live = findCostInLive(s, session_id, ts);
  if (live) return live;

  // Fall back to the REST endpoint for older / pre-mount events. Cache by
  // `session_id|ts` so we don't hammer the server for repeated lookups
  // (e.g. a sticky tooltip re-rendering on every scroll).
  const cacheKey = `${session_id}|${ts}`;
  if (s.costCache.has(cacheKey)) return s.costCache.get(cacheKey) ?? null;

  try {
    const url = `${API_BASE_URL}/api/tokens/event?session_id=${encodeURIComponent(session_id)}&ts=${ts}&window=${MATCH_WINDOW_MS}`;
    const res = await fetch(url);
    if (res.status === 404 || !res.ok) {
      setCostCache(s, cacheKey, null);
      return null;
    }
    const row = (await res.json()) as TokenEvent | null;
    if (!row || row.cost_usd == null) {
      setCostCache(s, cacheKey, null);
      return null;
    }
    const ev = coerceEvent(row);
    const result = {
      cost_usd: ev.cost_usd as number,
      tokens: ev.input + ev.output + ev.cache_read + ev.cache_write_5m + ev.cache_write_1h,
    };
    setCostCache(s, cacheKey, result);
    return result;
  } catch {
    // Network errors should not surface as an exception to UI callers —
    // a missing cost is a routine "not yet ingested" state, not an error.
    setCostCache(s, cacheKey, null);
    return null;
  }
}

// -----------------------------------------------------------------------------
// Module-level applyTokenEvent: invoked from the WebSocket layer, which has
// no access to the per-mount factory return value. Routes through the shared
// state if any subscriber exists; drops the event otherwise.
// -----------------------------------------------------------------------------

export function applyTokenEvent(record: TokenEvent): void {
  if (!sharedState) return;
  applyTokenEventInternal(sharedState, record);
}

/**
 * Module-level refetchAll handle for the WebSocket layer to call on
 * reconnect-backfill. No-op if there are no current subscribers.
 */
export function refetchAllExternal(): Promise<void> {
  if (!sharedState || subscribers === 0) return Promise.resolve();
  return refetchAllInternal(sharedState);
}

/**
 * Synchronous live-events-only lookup. Returns the closest matching cost
 * from the in-memory ring buffer, or null. Backwards-compatible signature
 * for existing template `computed()` callers — fires the async REST
 * fallback on cache miss as a side effect, so a subsequent re-render
 * (after the cache populates) will pick up the result.
 */
export function findCostForEvent(
  session_id: string,
  ts: number
): { cost_usd: number; tokens: number } | null {
  if (!sharedState) return null;
  const s = sharedState;
  // Read the version BEFORE checking the cache so that consumers running
  // inside a reactive scope (computed/template) register a dep on the
  // version counter. Any subsequent setCostCache() bumps the counter and
  // re-fires this read with the freshly-populated value.
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  s.costCacheVersion.value;
  const live = findCostInLive(s, session_id, ts);
  if (live) return live;
  // Cache hit (possibly null) — return it without firing another fetch.
  const cacheKey = `${session_id}|${ts}`;
  if (s.costCache.has(cacheKey)) return s.costCache.get(cacheKey) ?? null;
  // Kick the async fallback in the background. The first call returns null;
  // when the response lands and `costCache` is populated, the next reactive
  // re-read will see the cached value.
  void findCostForEventInternal(s, session_id, ts);
  return null;
}

/**
 * Async variant that resolves to the live-events match if available,
 * otherwise hits `/api/tokens/event` and caches the result.
 */
export function findCostForEventAsync(
  session_id: string,
  ts: number
): Promise<{ cost_usd: number; tokens: number } | null> {
  if (!sharedState) return Promise.resolve(null);
  return findCostForEventInternal(sharedState, session_id, ts);
}

export function useTokens() {
  if (!sharedState) {
    sharedState = createState();
  }
  const s = sharedState;
  subscribers += 1;

  // Decrement on scope dispose. `getCurrentScope()` lets this work outside
  // of `setup()` (e.g. inside a composable invoked from another composable);
  // if there's no active scope we fall back to a no-op lifecycle hook so
  // the caller is responsible for managing subscription.
  if (getCurrentScope()) {
    onScopeDispose(() => {
      subscribers -= 1;
      if (subscribers <= 0) {
        subscribers = 0;
        if (sharedState) {
          resetState(sharedState);
        }
      }
    });
  }

  async function refetchAll(): Promise<void> {
    return refetchAllInternal(s);
  }

  async function setRange(r: TokenRange): Promise<void> {
    s.range.value = r;
    s.bucket.value = r === '1d' ? 'hour' : 'day';
    await refetchAllInternal(s);
  }

  async function setBreakdownDim(d: TokenBreakdownDimension): Promise<void> {
    s.breakdownDim.value = d;
    await refetchAllInternal(s);
  }

  const totalSpend = computed(() => s.summary.value?.month.cost_usd ?? 0);

  return {
    summary: s.summary,
    timeseries: s.timeseries,
    breakdown: s.breakdown,
    liveEvents: s.liveEvents,
    lastEvent: s.lastEvent,
    loading: s.loading,
    error: s.error,
    range: s.range,
    bucket: s.bucket,
    breakdownDim: s.breakdownDim,
    totalSpend,
    refetchAll,
    setRange,
    setBreakdownDim,
  };
}
