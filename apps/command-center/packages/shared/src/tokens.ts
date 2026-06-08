// ─────────────────────────────────────────────────────────────────────────────
// Token analytics contract — mirrors apps/server/src/token-queries.ts exactly so
// the ported Drizzle query layer stays JSON-shape-compatible with the legacy
// `/api/tokens/*` endpoints (parity is an acceptance criterion).
// ─────────────────────────────────────────────────────────────────────────────

export interface PeriodTotals {
  cost_usd: number;
  input: number;
  output: number;
  cache_read: number;
  cache_write_5m: number;
  cache_write_1h: number;
  count: number;
}

export interface SummaryResponse {
  today: PeriodTotals;
  week: PeriodTotals;
  month: PeriodTotals;
}

export interface TimeseriesPoint {
  ts: number;
  cost_usd: number;
  tokens: number;
}

export interface BreakdownRow {
  key: string;
  cost_usd: number;
  tokens: number;
  count: number;
}

// Query parameter unions (mirror token-queries.ts).
export type TokenRange = '1d' | '7d' | '30d';
export type TokenBucket = 'hour' | 'day';
export type BreakdownDimension = 'model' | 'cwd' | 'git_branch';

// Real-time fast-path payload, emitted as `token:tick` from the SDK `result`
// message usage (transcript ingest remains the source of truth).
export interface TokenTick {
  session_id: string;
  input: number;
  output: number;
  cost_usd: number;
}

export const EMPTY_PERIOD: PeriodTotals = {
  cost_usd: 0,
  input: 0,
  output: 0,
  cache_read: 0,
  cache_write_5m: 0,
  cache_write_1h: 0,
  count: 0,
};
