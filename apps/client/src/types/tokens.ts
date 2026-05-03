export interface TokenEvent {
  id: number;
  ts: number;
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
  ts: number;
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
