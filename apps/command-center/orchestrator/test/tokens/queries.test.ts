// Tests for tokens/queries.ts.
//
// Two layers:
//   1. The calendar-arithmetic helpers (startOfDayLocal / startOfDayMinusN /
//      tzOffsetMs + bucket math) — PORTED VERBATIM from the legacy
//      apps/server/src/token-queries.test.ts. Parity guard for the DST-safe
//      timezone logic.
//   2. The SQL-backed aggregations (getSummary / getTimeseries / getBreakdown).
//      The legacy suite left these as `it.todo` because db.ts opened a concrete
//      on-disk events.db with no inject seam. The Drizzle client here runs
//      against an in-memory SQLite (CC_DB_PATH=:memory: in the package "test"
//      script), so we can finally seed rows and assert the real query output —
//      reconciling /api/tokens numbers against token_events ingest.

import { describe, it, expect, beforeAll, beforeEach } from 'bun:test';
import { runMigrations } from '../../src/db/migrate';
import { sqlite } from '../../src/db/client';
import { insertTokenEvent, type TokenEventRow } from '../../src/tokens/store';
import {
  getSummary,
  getTimeseries,
  getBreakdown,
  startOfDayLocal,
  startOfDayMinusN,
  tzOffsetMs,
} from '../../src/tokens/queries';

// ── Layer 1: calendar-arithmetic helpers (verbatim parity) ──────────────────

describe('startOfDayLocal — local-midnight floor', () => {
  it('returns the local-midnight ms for a mid-afternoon Date', () => {
    const now = new Date(2026, 0, 15, 14, 37, 22, 123); // 2026-01-15 14:37:22.123 LOCAL
    const start = startOfDayLocal(now);
    const startDate = new Date(start);
    expect(startDate.getFullYear()).toBe(2026);
    expect(startDate.getMonth()).toBe(0);
    expect(startDate.getDate()).toBe(15);
    expect(startDate.getHours()).toBe(0);
    expect(startDate.getMinutes()).toBe(0);
    expect(startDate.getSeconds()).toBe(0);
    expect(startDate.getMilliseconds()).toBe(0);
  });

  it('is idempotent on a value already at local midnight', () => {
    const midnight = new Date(2026, 5, 1, 0, 0, 0, 0);
    expect(startOfDayLocal(midnight)).toBe(midnight.getTime());
  });

  it('does not mutate its input', () => {
    const before = new Date(2026, 0, 15, 14, 37, 22, 123);
    const beforeMs = before.getTime();
    startOfDayLocal(before);
    expect(before.getTime()).toBe(beforeMs);
  });
});

describe('startOfDayMinusN — calendar-day arithmetic', () => {
  it('walks back 6 calendar days for the week-rolling window', () => {
    const now = new Date(2026, 0, 15, 14, 0, 0, 0); // Thu 2026-01-15
    const start = startOfDayMinusN(now, 6);
    const startDate = new Date(start);
    // 6 days before Thu 2026-01-15 is Fri 2026-01-09.
    expect(startDate.getFullYear()).toBe(2026);
    expect(startDate.getMonth()).toBe(0);
    expect(startDate.getDate()).toBe(9);
    expect(startDate.getHours()).toBe(0);
  });

  it('walks back 29 calendar days for the month-rolling window', () => {
    const now = new Date(2026, 1, 15, 0, 0, 0, 0); // Sun 2026-02-15
    const start = startOfDayMinusN(now, 29);
    const startDate = new Date(start);
    // 29 days before Feb 15 is Jan 17.
    expect(startDate.getFullYear()).toBe(2026);
    expect(startDate.getMonth()).toBe(0);
    expect(startDate.getDate()).toBe(17);
    expect(startDate.getHours()).toBe(0);
  });

  it('handles month boundary cleanly (Mar 1 minus 1 = Feb 28 or 29)', () => {
    const now = new Date(2026, 2, 1, 12, 0, 0, 0); // 2026-03-01 (2026 is NOT a leap year)
    const start = startOfDayMinusN(now, 1);
    const startDate = new Date(start);
    // 2026 is not a leap year, so 2026-03-01 minus 1 = 2026-02-28.
    expect(startDate.getMonth()).toBe(1);
    expect(startDate.getDate()).toBe(28);
  });

  it('handles year boundary cleanly (Jan 1 minus 1 = previous Dec 31)', () => {
    const now = new Date(2026, 0, 1, 12, 0, 0, 0); // 2026-01-01
    const start = startOfDayMinusN(now, 1);
    const startDate = new Date(start);
    expect(startDate.getFullYear()).toBe(2025);
    expect(startDate.getMonth()).toBe(11); // December
    expect(startDate.getDate()).toBe(31);
  });

  it('does not mutate its input', () => {
    const before = new Date(2026, 0, 15, 14, 0, 0, 0);
    const beforeMs = before.getTime();
    startOfDayMinusN(before, 6);
    expect(before.getTime()).toBe(beforeMs);
  });
});

describe('startOfDayMinusN — DST transition (calendar-arithmetic, NOT 24h fixed)', () => {
  it('always lands on local midnight, regardless of DST shift in the window', () => {
    const now = new Date(2026, 2, 14, 12, 0, 0, 0); // 2026-03-14 12:00 LOCAL
    const start = startOfDayMinusN(now, 7);
    const startDate = new Date(start);
    expect(startDate.getDate()).toBe(7);
    expect(startDate.getMonth()).toBe(2); // March
    expect(startDate.getHours()).toBe(0); // local midnight, not 23 or 1
    expect(startDate.getMinutes()).toBe(0);
  });

  it('produces a delta that is NOT exactly n*24h when DST occurs in the window (in DST timezones)', () => {
    const now = new Date(2026, 2, 14, 0, 0, 0, 0); // local midnight Mar 14
    const start = startOfDayMinusN(now, 7);
    const elapsedMs = now.getTime() - start;
    const sevenFixedDaysMs = 7 * 24 * 60 * 60 * 1000;
    const oneHourMs = 60 * 60 * 1000;
    expect(Math.abs(elapsedMs - sevenFixedDaysMs)).toBeLessThanOrEqual(oneHourMs);
  });
});

describe('tzOffsetMs — sign convention', () => {
  it('returns a finite ms value', () => {
    const off = tzOffsetMs();
    expect(Number.isFinite(off)).toBe(true);
    expect(Math.abs(off)).toBeLessThanOrEqual(14 * 60 * 60 * 1000);
  });

  it('matches the inverse of getTimezoneOffset', () => {
    const off = tzOffsetMs();
    const expected = -new Date().getTimezoneOffset() * 60_000;
    expect(off).toBe(expected);
  });
});

describe('hour-bucket alignment math (parity check)', () => {
  it('aligns hour buckets to local-hour boundaries', () => {
    const offsetMs = tzOffsetMs();
    const bucketMs = 60 * 60 * 1000; // 1 hour
    const local = new Date();
    local.setHours(14, 37, 22, 123);
    const ts = local.getTime();
    const bucketTs = Math.floor((ts + offsetMs) / bucketMs) * bucketMs - offsetMs;
    const bucketLocal = new Date(bucketTs);
    expect(bucketLocal.getHours()).toBe(14);
    expect(bucketLocal.getMinutes()).toBe(0);
    expect(bucketLocal.getSeconds()).toBe(0);
    expect(bucketLocal.getMilliseconds()).toBe(0);
  });

  it('aligns day buckets to local-midnight boundaries', () => {
    const offsetMs = tzOffsetMs();
    const dayMs = 24 * 60 * 60 * 1000;
    const local = new Date(2026, 5, 1, 14, 37, 22, 123);
    const ts = local.getTime();
    const bucketTs = Math.floor((ts + offsetMs) / dayMs) * dayMs - offsetMs;
    const bucketLocal = new Date(bucketTs);
    expect(bucketLocal.getHours()).toBe(0);
    expect(bucketLocal.getMinutes()).toBe(0);
    expect(bucketLocal.getDate()).toBe(1);
    expect(bucketLocal.getMonth()).toBe(5);
    expect(bucketLocal.getFullYear()).toBe(2026);
  });
});

// ── Layer 2: SQL-backed aggregations (formerly it.todo) ─────────────────────

// A ts at local noon today — safely inside today/week/month windows and away
// from a midnight boundary that could make the assertions flaky.
function noonTodayMs(): number {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d.getTime();
}

// Minimal row factory. Each call must use a unique (transcript_file, offset)
// pair or the UNIQUE dedupe will drop it.
let offsetCounter = 0;
function seed(partial: Partial<TokenEventRow> & { ts: number }): void {
  offsetCounter += 1;
  const row: TokenEventRow = {
    session_id: 'sess',
    cwd: '/repo',
    git_branch: 'main',
    model: 'claude-opus-4-7',
    input: 0,
    cache_read: 0,
    cache_write_5m: 0,
    cache_write_1h: 0,
    output: 0,
    cost_usd: 0,
    request_id: null,
    transcript_file: `/tmp/seed-${offsetCounter}.jsonl`,
    transcript_line_offset: offsetCounter,
    inode: 1000 + offsetCounter,
    ...partial,
  };
  const saved = insertTokenEvent(row);
  expect(saved).not.toBeNull();
}

beforeAll(() => {
  runMigrations();
});

beforeEach(() => {
  sqlite.exec('DELETE FROM token_events');
});

describe('getSummary — reconciles with token_events ingest', () => {
  it('sums today/week/month totals and counts for rows inserted today', () => {
    const ts = noonTodayMs();
    seed({ ts, input: 100, output: 50, cache_read: 20, cache_write_5m: 6, cache_write_1h: 4, cost_usd: 0.5 });
    seed({ ts, input: 10, output: 5, cost_usd: 0.25 });

    const s = getSummary();
    // Both rows are "today", so today === week === month.
    for (const period of [s.today, s.week, s.month]) {
      expect(period.count).toBe(2);
      expect(period.input).toBe(110);
      expect(period.output).toBe(55);
      expect(period.cache_read).toBe(20);
      expect(period.cache_write_5m).toBe(6);
      expect(period.cache_write_1h).toBe(4);
      expect(period.cost_usd).toBeCloseTo(0.75, 9);
    }
  });

  it('returns the zeroed EMPTY_PERIOD shape when there are no rows', () => {
    const s = getSummary();
    expect(s.today).toEqual({
      cost_usd: 0, input: 0, output: 0, cache_read: 0, cache_write_5m: 0, cache_write_1h: 0, count: 0,
    });
  });

  it('filters by cwd when provided', () => {
    const ts = noonTodayMs();
    seed({ ts, input: 100, cwd: '/repo-a', cost_usd: 1 });
    seed({ ts, input: 7, cwd: '/repo-b', cost_usd: 2 });

    const a = getSummary('/repo-a');
    expect(a.today.count).toBe(1);
    expect(a.today.input).toBe(100);
    expect(a.today.cost_usd).toBeCloseTo(1, 9);
  });
});

describe('getSummary — NULL cost_usd safety (COALESCE)', () => {
  it('counts token volume from an unpriced (cost_usd NULL) row but contributes 0 to cost', () => {
    const ts = noonTodayMs();
    // An unpriced row — token counts still recorded, cost_usd NULL.
    seed({ ts, input: 100, output: 50, cost_usd: null });
    // A priced row.
    seed({ ts, input: 10, output: 5, cost_usd: 0.4 });

    const s = getSummary();
    expect(s.today.count).toBe(2);
    expect(s.today.input).toBe(110);   // both rows' input volume counts
    expect(s.today.output).toBe(55);
    // COALESCE(SUM(cost_usd),0): the NULL row contributes 0, total is the priced row only.
    expect(s.today.cost_usd).toBeCloseTo(0.4, 9);
  });
});

describe('getBreakdown — one row per dimension key, COALESCE-correct sums', () => {
  it('groups by model and orders by cost desc', () => {
    const ts = noonTodayMs();
    seed({ ts, model: 'claude-opus-4-7', input: 100, output: 50, cost_usd: 5 });
    seed({ ts, model: 'claude-opus-4-7', input: 100, output: 0, cost_usd: 1 });
    seed({ ts, model: 'claude-sonnet-4-5', input: 1000, output: 0, cost_usd: 3 });

    const rows = getBreakdown('model');
    expect(rows.length).toBe(2);
    // Ordered by cost_usd DESC: opus (6) before sonnet (3).
    expect(rows[0]!.key).toBe('claude-opus-4-7');
    expect(rows[0]!.cost_usd).toBeCloseTo(6, 9);
    expect(rows[0]!.count).toBe(2);
    expect(rows[0]!.tokens).toBe(250); // (100+50) + (100)
    expect(rows[1]!.key).toBe('claude-sonnet-4-5');
    expect(rows[1]!.cost_usd).toBeCloseTo(3, 9);
    expect(rows[1]!.tokens).toBe(1000);
  });

  it('coalesces a NULL dimension value to "(unknown)"', () => {
    const ts = noonTodayMs();
    seed({ ts, git_branch: null, input: 5, cost_usd: 1 });
    const rows = getBreakdown('git_branch');
    expect(rows.length).toBe(1);
    expect(rows[0]!.key).toBe('(unknown)');
  });
});

describe('getTimeseries — local-bucket aggregation', () => {
  it('aggregates today rows into a single local-day bucket with summed tokens', () => {
    const ts = noonTodayMs();
    seed({ ts, input: 100, cache_read: 20, cache_write_5m: 6, cache_write_1h: 4, output: 50, cost_usd: 0.5 });
    seed({ ts, input: 10, output: 5, cost_usd: 0.25 });

    const points = getTimeseries('1d', 'day');
    expect(points.length).toBe(1);
    // tokens = sum of all five token columns across both rows.
    // (100+20+6+4+50) + (10+0+0+0+5) = 180 + 15 = 195
    expect(points[0]!.tokens).toBe(195);
    expect(points[0]!.cost_usd).toBeCloseTo(0.75, 9);
    // The bucket boundary lands on local midnight today.
    const bucketLocal = new Date(points[0]!.ts);
    expect(bucketLocal.getHours()).toBe(0);
    expect(bucketLocal.getMinutes()).toBe(0);
  });

  it('respects the cwd filter', () => {
    const ts = noonTodayMs();
    seed({ ts, input: 100, cwd: '/repo-a', cost_usd: 1 });
    seed({ ts, input: 7, cwd: '/repo-b', cost_usd: 2 });
    const points = getTimeseries('1d', 'day', '/repo-a');
    expect(points.length).toBe(1);
    expect(points[0]!.tokens).toBe(100);
  });
});
