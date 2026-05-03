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

function startOfDayMs(now: Date): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function getSummary(cwd?: string): SummaryResponse {
  const now = new Date();
  const todayStart = startOfDayMs(now);
  const dayMs = 24 * 60 * 60 * 1000;
  return {
    today: totalsSince(todayStart, cwd),
    week:  totalsSince(todayStart - 6 * dayMs, cwd),
    month: totalsSince(todayStart - 29 * dayMs, cwd),
  };
}

export type Range = '1d' | '7d' | '30d';
export type Bucket = 'hour' | 'day';

export function getTimeseries(
  range: Range = '7d',
  bucket: Bucket = 'day',
  cwd?: string
): TimeseriesPoint[] {
  const dayMs = 24 * 60 * 60 * 1000;
  const rangeMs = range === '1d' ? dayMs : range === '7d' ? 7 * dayMs : 30 * dayMs;
  const sinceMs = Date.now() - rangeMs;
  const bucketMs = bucket === 'hour' ? 60 * 60 * 1000 : dayMs;

  const where = cwd ? 'WHERE ts >= ? AND cwd = ?' : 'WHERE ts >= ?';
  const params: any[] = cwd ? [sinceMs, cwd] : [sinceMs];

  const rows = db.prepare(`
    SELECT
      (ts / ${bucketMs}) * ${bucketMs} AS bucket_ts,
      COALESCE(SUM(cost_usd), 0) AS cost_usd,
      COALESCE(SUM(input + cache_read + cache_write_5m + cache_write_1h + output), 0) AS tokens
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
      COALESCE(SUM(input + cache_read + cache_write_5m + cache_write_1h + output), 0) AS tokens,
      COUNT(*) AS count
    FROM token_events
    ${where}
    GROUP BY key
    ORDER BY cost_usd DESC
  `).all(...params) as BreakdownRow[];

  return rows;
}
