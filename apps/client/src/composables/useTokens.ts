import { ref, computed } from 'vue';
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

const summary = ref<TokenSummary | null>(null);
const timeseries = ref<TokenTimeseriesPoint[]>([]);
const breakdown = ref<TokenBreakdownRow[]>([]);
const liveEvents = ref<TokenEvent[]>([]);
const lastEvent = ref<TokenEvent | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

const range = ref<TokenRange>('7d');
const bucket = ref<TokenBucket>('day');
const breakdownDim = ref<TokenBreakdownDimension>('model');

let refetchScheduled = false;

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`);
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

async function refetchAll(): Promise<void> {
  loading.value = true;
  try {
    const [s, t, b] = await Promise.all([
      fetchJson<TokenSummary>('/api/tokens/summary'),
      fetchJson<TokenTimeseriesPoint[]>(`/api/tokens/timeseries?range=${range.value}&bucket=${bucket.value}`),
      fetchJson<TokenBreakdownRow[]>(`/api/tokens/breakdown?by=${breakdownDim.value}`),
    ]);
    summary.value = s;
    timeseries.value = t;
    breakdown.value = b;
    error.value = null;
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }
}

// Coalesce WS-driven refetches: bursty token events still produce one refetch.
function scheduleRefetch(): void {
  if (refetchScheduled) return;
  refetchScheduled = true;
  setTimeout(() => {
    refetchScheduled = false;
    refetchAll();
  }, 1500);
}

export function applyTokenEvent(record: TokenEvent): void {
  liveEvents.value.push(record);
  if (liveEvents.value.length > 500) liveEvents.value.shift();
  lastEvent.value = record;
  scheduleRefetch();
}

const MATCH_WINDOW_MS = 60_000;

export function findCostForEvent(
  session_id: string,
  ts: number
): { cost_usd: number; tokens: number } | null {
  // Match: same session, token_event.ts within ±MATCH_WINDOW_MS of event.ts.
  let bestDelta = Infinity;
  let best: TokenEvent | null = null;
  for (const t of liveEvents.value) {
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

async function setRange(r: TokenRange): Promise<void> {
  range.value = r;
  bucket.value = r === '1d' ? 'hour' : 'day';
  await refetchAll();
}

async function setBreakdownDim(d: TokenBreakdownDimension): Promise<void> {
  breakdownDim.value = d;
  await refetchAll();
}

const totalSpend = computed(() => summary.value?.month.cost_usd ?? 0);

export function useTokens() {
  return {
    summary,
    timeseries,
    breakdown,
    liveEvents,
    lastEvent,
    loading,
    error,
    range,
    bucket,
    breakdownDim,
    totalSpend,
    refetchAll,
    setRange,
    setBreakdownDim,
  };
}
