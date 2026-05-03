// TIME ORIGIN CHOICE
// ------------------
// All period boundaries (today / week / month) and time-bucket boundaries
// in this file are computed in the SERVER's LOCAL timezone. We chose local
// over UTC because users see "today's spend" relative to their wall clock,
// not relative to UTC midnight. Concretely:
//
//   * `startOfDayLocal(now)` returns the millisecond timestamp at local
//     midnight today.
//   * `startOfDayMinusN(now, n)` walks back n calendar days using
//     `Date#setDate`, which is DST-aware (24h on a fall-back day, 25h on a
//     spring-forward day are handled by the Date object, not by us).
//   * Hour/day buckets in `getTimeseries` use `(ts - tzOffsetMs)` before the
//     SQLite integer-division floor, then re-add `tzOffsetMs` afterwards, so
//     bucket boundaries land on local midnights/hours rather than UTC ones.
//
// `tzOffsetMs` is computed once per query from `Date#getTimezoneOffset`.
// On a DST transition day the offset will differ across the range; we
// accept this as a one-day rounding tradeoff (rare, and the totals stay
// correct — only the bucket label may shift by 1h on the transition).
//
// SUM NULL SAFETY
// ---------------
// We split combined sums like `SUM(input + cache_read + ...)` into
// `SUM(input) + SUM(cache_read) + ...`. With the combined form, a single
// NULL column poisons the per-row addition and contributes 0 (not NULL —
// SQLite ignores NULL rows in SUM, but `NULL + 5 = NULL` inside the row
// makes that whole row drop out of the aggregate). The split form treats
// each column independently and lets NULLs degrade to 0 per column.
// We additionally COALESCE every SUM at the outer layer so the JSON shape
// is stable.

import { db } from './db';

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

const EMPTY_PERIOD: PeriodTotals = {
  cost_usd: 0, input: 0, output: 0, cache_read: 0, cache_write_5m: 0, cache_write_1h: 0, count: 0,
};

// --- Local-timezone calendar helpers (DST-safe) ----------------------------

export function startOfDayLocal(now: Date): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function startOfDayMinusN(now: Date, n: number): number {
  const d = new Date(now);
  // setDate handles month/year rollover and DST transitions correctly.
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function tzOffsetMs(): number {
  // Date#getTimezoneOffset returns minutes WEST of UTC (positive for
  // negative offsets — e.g. America/New_York EST returns 300).
  // We want the offset to ADD to a UTC ms to get a local-wall-clock ms,
  // which is the negation: -getTimezoneOffset() * 60_000.
  return -new Date().getTimezoneOffset() * 60_000;
}

// --- Aggregation helpers ---------------------------------------------------

function totalsSince(sinceMs: number, cwd?: string): PeriodTotals {
  const where = cwd ? 'WHERE ts >= ? AND cwd = ?' : 'WHERE ts >= ?';
  const params: any[] = cwd ? [sinceMs, cwd] : [sinceMs];
  const row = db.prepare(`
    SELECT
      COALESCE(SUM(cost_usd), 0) AS cost_usd,
      COALESCE(SUM(input), 0) AS input,
      COALESCE(SUM(output), 0) AS output,
      COALESCE(SUM(cache_read), 0) AS cache_read,
      COALESCE(SUM(cache_write_5m), 0) AS cache_write_5m,
      COALESCE(SUM(cache_write_1h), 0) AS cache_write_1h,
      COUNT(*) AS count
    FROM token_events
    ${where}
  `).get(...params) as PeriodTotals | undefined;
  return row ?? EMPTY_PERIOD;
}

export function getSummary(cwd?: string): SummaryResponse {
  const now = new Date();
  const todayStartMs = startOfDayLocal(now);
  // Week = today + previous 6 calendar days (7-day rolling window aligned to local midnight).
  const weekStartMs = startOfDayMinusN(now, 6);
  // Month = today + previous 29 calendar days (30-day rolling window aligned to local midnight).
  const monthStartMs = startOfDayMinusN(now, 29);
  return {
    today: totalsSince(todayStartMs, cwd),
    week:  totalsSince(weekStartMs,  cwd),
    month: totalsSince(monthStartMs, cwd),
  };
}

export type Range = '1d' | '7d' | '30d';
export type Bucket = 'hour' | 'day';

export function getTimeseries(
  range: Range = '7d',
  bucket: Bucket = 'day',
  cwd?: string
): TimeseriesPoint[] {
  const now = new Date();
  // Range start uses the same calendar-arithmetic helpers so a 1d/7d/30d
  // window aligns to local midnight (no partial-day buckets at the leading edge).
  const rangeStartMs =
    range === '1d' ? startOfDayLocal(now) :
    range === '7d' ? startOfDayMinusN(now, 6) :
                     startOfDayMinusN(now, 29);
  const dayMs = 24 * 60 * 60 * 1000;
  const bucketMs = bucket === 'hour' ? 60 * 60 * 1000 : dayMs;
  const offsetMs = tzOffsetMs();

  const where = cwd ? 'WHERE ts >= ? AND cwd = ?' : 'WHERE ts >= ?';
  const params: any[] = cwd ? [rangeStartMs, cwd] : [rangeStartMs];

  // Bucket math: shift to local wall-clock space, floor to bucket, shift back.
  // Without the shift, day buckets land on UTC midnight, which is up to 23h
  // away from the user's local midnight — visually wrong on the chart.
  const rows = db.prepare(`
    SELECT
      ((ts + ${offsetMs}) / ${bucketMs}) * ${bucketMs} - ${offsetMs} AS bucket_ts,
      COALESCE(SUM(cost_usd), 0) AS cost_usd,
      COALESCE(SUM(input), 0)
        + COALESCE(SUM(cache_read), 0)
        + COALESCE(SUM(cache_write_5m), 0)
        + COALESCE(SUM(cache_write_1h), 0)
        + COALESCE(SUM(output), 0) AS tokens
    FROM token_events
    ${where}
    GROUP BY bucket_ts
    ORDER BY bucket_ts ASC
  `).all(...params) as { bucket_ts: number; cost_usd: number; tokens: number }[];

  return rows.map(r => ({ ts: r.bucket_ts, cost_usd: r.cost_usd, tokens: r.tokens }));
}

export type BreakdownDimension = 'model' | 'cwd' | 'git_branch';

export function getBreakdown(
  by: BreakdownDimension = 'model',
  cwd?: string
): BreakdownRow[] {
  const allowed: BreakdownDimension[] = ['model', 'cwd', 'git_branch'];
  if (!allowed.includes(by)) by = 'model';

  const where = cwd ? 'WHERE cwd = ?' : '';
  const params: any[] = cwd ? [cwd] : [];

  const rows = db.prepare(`
    SELECT
      COALESCE(${by}, '(unknown)') AS key,
      COALESCE(SUM(cost_usd), 0) AS cost_usd,
      COALESCE(SUM(input), 0)
        + COALESCE(SUM(cache_read), 0)
        + COALESCE(SUM(cache_write_5m), 0)
        + COALESCE(SUM(cache_write_1h), 0)
        + COALESCE(SUM(output), 0) AS tokens,
      COUNT(*) AS count
    FROM token_events
    ${where}
    GROUP BY key
    ORDER BY cost_usd DESC
  `).all(...params) as BreakdownRow[];

  return rows;
}
