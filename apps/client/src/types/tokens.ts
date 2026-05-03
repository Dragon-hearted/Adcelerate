// All `ts` fields in this module are milliseconds since the Unix epoch
// (matches `Date.now()`). Server is the single source of truth for the
// origin; runtime guard `assertMsTs` flags accidental seconds-precision
// or microsecond-precision values during development.

export interface TokenEvent {
  id: number;
  ts: number; // ts: ms unix epoch (matches Date.now())
  session_id: string;
  cwd: string | null;
  git_branch: string | null;
  model: string;
  input: number;
  cache_read: number;
  cache_write_5m: number;
  cache_write_1h: number;
  output: number;
  cost_usd: number | null;
  request_id: string | null;
  transcript_file: string;
  transcript_line_offset: number;
}

export interface PeriodTotals {
  cost_usd: number;
  input: number;
  output: number;
  cache_read: number;
  cache_write_5m: number;
  cache_write_1h: number;
  count: number;
}

export interface TokenSummary {
  today: PeriodTotals;
  week: PeriodTotals;
  month: PeriodTotals;
}

export interface TokenTimeseriesPoint {
  ts: number; // ts: ms unix epoch (matches Date.now())
  cost_usd: number;
  tokens: number;
}

export interface TokenBreakdownRow {
  key: string;
  cost_usd: number;
  tokens: number;
  count: number;
}

export type TokenRange = '1d' | '7d' | '30d';
export type TokenBucket = 'hour' | 'day';
export type TokenBreakdownDimension = 'model' | 'cwd' | 'git_branch';

/**
 * Runtime guard for ms-precision Unix epoch timestamps. Logs an error
 * if `ts` looks like a seconds-precision value (< 1e12), microseconds
 * (> 1e14), or anything non-finite. Non-throwing so a single bad event
 * doesn't tear down the dashboard.
 *
 * Range: 1e12 ms ≈ 2001-09-09, 1e14 ms ≈ 5138-11-16.
 */
export function assertMsTs(ts: number, where: string): void {
  if (typeof ts !== 'number' || !Number.isFinite(ts) || ts < 1e12 || ts > 1e14) {
    console.error(`[ts] invalid timestamp at ${where}: ${ts}`);
  }
}
