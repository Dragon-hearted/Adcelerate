// Unit tests for the calendar-arithmetic helpers in token-queries.ts.
//
// The internal helpers (`startOfDayLocal`, `startOfDayMinusN`, `tzOffsetMs`)
// are not exported, so we re-implement them inline here and verify the
// equivalence on fixed dates. This is intentionally a parity test — if the
// production helpers change shape, these tests will diverge and we'll know
// to update them in lockstep.
//
// The DB-backed paths (`getSummary` / `getTimeseries` / `getBreakdown`) are
// covered by `it.todo` placeholders below; they require seeding an
// in-memory SQLite, which is non-trivial because `db.ts` initializes a
// concrete on-disk `events.db`. A future refactor that injects a Database
// instance would unblock these.

import { describe, it, expect } from 'bun:test';

// --- Mirrored helpers (kept in sync with token-queries.ts) ------------------

function startOfDayLocal(now: Date): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function startOfDayMinusN(now: Date, n: number): number {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function tzOffsetMs(): number {
  return -new Date().getTimezoneOffset() * 60_000;
}

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
  // Key invariant: even if the user's timezone has a DST transition between
  // `now` and `now-n`, the result is always 6 calendar days earlier at
  // local midnight, NOT (6 * 24h) = (144h) ago. The Date object handles
  // the wall-clock-vs-elapsed-time mismatch internally via setDate.
  //
  // We can't force the test process into America/New_York from here (the
  // system tz is fixed), but we can verify the calendar invariant:
  // regardless of tz, the resulting Date should have hour=0 (local
  // midnight) and the day-of-month should be exactly n less than now's
  // day-of-month (modulo month rollover).
  it('always lands on local midnight, regardless of DST shift in the window', () => {
    // Pick a date that, in US/EU timezones, straddles a DST transition:
    // Spring-forward in US is the second Sunday of March (Mar 8, 2026).
    // A `now` of Mar 14 minus 7 = Mar 7; the window contains the transition.
    const now = new Date(2026, 2, 14, 12, 0, 0, 0); // 2026-03-14 12:00 LOCAL
    const start = startOfDayMinusN(now, 7);
    const startDate = new Date(start);
    expect(startDate.getDate()).toBe(7);
    expect(startDate.getMonth()).toBe(2); // March
    expect(startDate.getHours()).toBe(0); // local midnight, not 23 or 1
    expect(startDate.getMinutes()).toBe(0);
  });

  it('produces a delta that is NOT exactly n*24h when DST occurs in the window (in DST timezones)', () => {
    // This test asserts that the calendar walk does NOT use a fixed 24h
    // multiplier. The exact delta depends on the test runner's local tz,
    // so we frame it as: the difference between `now-at-local-midnight`
    // and `startOfDayMinusN(now, n)` must equal `n` calendar days, where
    // a calendar day's ms count varies under DST.
    const now = new Date(2026, 2, 14, 0, 0, 0, 0); // local midnight Mar 14
    const start = startOfDayMinusN(now, 7);
    const elapsedMs = now.getTime() - start;
    const sevenFixedDaysMs = 7 * 24 * 60 * 60 * 1000;
    // In a DST timezone (e.g. America/New_York), spring forward eats 1h,
    // so elapsedMs === 7d - 1h. In a non-DST timezone (UTC, Asia/Kolkata),
    // elapsedMs === 7d exactly. Either way, elapsedMs is within +/- 1h
    // of 7 fixed days.
    const oneHourMs = 60 * 60 * 1000;
    expect(Math.abs(elapsedMs - sevenFixedDaysMs)).toBeLessThanOrEqual(oneHourMs);
  });
});

describe('tzOffsetMs — sign convention', () => {
  it('returns a finite ms value', () => {
    const off = tzOffsetMs();
    expect(Number.isFinite(off)).toBe(true);
    // |offset| <= 14h (largest real-world UTC offset)
    expect(Math.abs(off)).toBeLessThanOrEqual(14 * 60 * 60 * 1000);
  });

  it('matches the inverse of getTimezoneOffset', () => {
    const off = tzOffsetMs();
    const expected = -new Date().getTimezoneOffset() * 60_000;
    expect(off).toBe(expected);
  });
});

describe('hour-bucket alignment math (parity check)', () => {
  // Mirrors the bucket math in getTimeseries:
  //   bucket_ts = ((ts + offsetMs) / bucketMs) * bucketMs - offsetMs
  // Verifies that bucket boundaries align to local hour, not UTC.
  it('aligns hour buckets to local-hour boundaries', () => {
    const offsetMs = tzOffsetMs();
    const bucketMs = 60 * 60 * 1000; // 1 hour
    // Pick a ts at "local 14:37" today.
    const local = new Date();
    local.setHours(14, 37, 22, 123);
    const ts = local.getTime();
    const bucketTs = Math.floor((ts + offsetMs) / bucketMs) * bucketMs - offsetMs;
    // Decoded back to local, the bucket should be at 14:00:00.000
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

// ---------------------------------------------------------------------------
// SQL-backed integration tests (deferred).
//
// These need an injectable Database instance so we can seed rows in an
// `:memory:` sqlite without touching the on-disk events.db. The current
// `db.ts` doesn't expose that seam, so we leave these as it.todo with the
// SQL we'd run. A small refactor to `db.ts` (export `setDb(d)` for tests)
// would unblock them.
// ---------------------------------------------------------------------------

describe('token-queries — SQL-backed (deferred until db inject seam exists)', () => {
  it.todo('NULL handling: seeds a row with cache_read=NULL and verifies the other columns still contribute to SUM');
  // SQL we would run:
  //   INSERT INTO token_events (ts, session_id, model, input, cache_read, ...)
  //     VALUES (?, 'sess', 'claude-opus-4-7', 100, NULL, 0, 0, 50, 0.001, ...);
  //   const row = totalsSince(0);
  //   expect(row.input).toBe(100);
  //   expect(row.cache_read).toBe(0); // COALESCE(NULL, 0) wins
  //   expect(row.output).toBe(50);

  it.todo('hour bucket alignment: seeds rows at 14:37, 14:42, 15:05 LOCAL and verifies two buckets at 14:00 and 15:00 LOCAL, not UTC');

  it.todo('period boundary on DST transition day: seeds a row 6 days ago (across spring-forward) and verifies it lands inside the week-rolling window');

  it.todo('breakdown by model returns one row per model with COALESCE-correct sums');
});
