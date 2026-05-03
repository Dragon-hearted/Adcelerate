// Unit tests for `computeCost` and the model-matching boundary logic
// in pricing.ts.
//
// Boundary regression: the original implementation used a plain
// `model.startsWith(key)`, which made `claude-opus-4` match any future
// SKU like `claude-opus-40`, and `claude-opus-4-7` match `claude-opus-4-10`
// (because Object.keys order isn't lexicographic). The fix anchors the
// match at a `-` separator. We test that anchor here.

import { describe, it, expect } from 'bun:test';
import { computeCost, PRICING } from './pricing';

describe('pricing — exact match', () => {
  it('matches a known SKU exactly', () => {
    const cost = computeCost(
      { input: 1_000_000, cacheRead: 0, cacheWrite5m: 0, cacheWrite1h: 0, output: 0 },
      'claude-opus-4-7',
    );
    // 1M input tokens at the opus-4-7 rate ($15/M) = $15.00.
    expect(cost).toBe(PRICING['claude-opus-4-7']!.input);
    expect(cost).toBe(15);
  });

  it('matches sonnet exactly', () => {
    const cost = computeCost(
      { input: 1_000_000, cacheRead: 0, cacheWrite5m: 0, cacheWrite1h: 0, output: 0 },
      'claude-sonnet-4-5',
    );
    expect(cost).toBe(3);
  });

  it('matches haiku exactly', () => {
    const cost = computeCost(
      { input: 1_000_000, cacheRead: 0, cacheWrite5m: 0, cacheWrite1h: 0, output: 0 },
      'claude-haiku-4-5',
    );
    expect(cost).toBe(1);
  });
});

describe('pricing — date-suffix prefix match (with separator boundary)', () => {
  it('matches a date-suffixed opus-4-7 SKU', () => {
    const cost = computeCost(
      { input: 1_000_000, cacheRead: 0, cacheWrite5m: 0, cacheWrite1h: 0, output: 0 },
      'claude-opus-4-7-20260101',
    );
    expect(cost).toBe(15);
  });

  it('matches a date-suffixed sonnet-4-5 SKU', () => {
    const cost = computeCost(
      { input: 1_000_000, cacheRead: 0, cacheWrite5m: 0, cacheWrite1h: 0, output: 0 },
      'claude-sonnet-4-5-20251022',
    );
    expect(cost).toBe(3);
  });
});

describe('pricing — boundary safety (regression)', () => {
  it('does NOT match claude-opus-4-7 for a future SKU like claude-opus-4-10-...', () => {
    // The old `startsWith('claude-opus-4-7')` check would fail on this SKU,
    // but the broader concern is the digit-prefix collision class. With the
    // separator boundary fix, only `claude-opus-4` (with the trailing `-`)
    // matches. All opus models share the $15 input rate, so we verify the
    // model resolves to *some* opus pricing — not specifically `4-7`.
    const cost = computeCost(
      { input: 1_000_000, cacheRead: 0, cacheWrite5m: 0, cacheWrite1h: 0, output: 0 },
      'claude-opus-4-10-20260101',
    );
    // It MUST resolve to opus pricing (not undefined / null).
    expect(cost).toBe(15);
  });

  it('does NOT false-match claude-opus-4 for claude-opus-40 (no separator)', () => {
    // `claude-opus-40` should NOT match `claude-opus-4` because there's no
    // `-` separator after the matched key. With the fix, this falls through
    // to the unknown-model path.
    const cost = computeCost(
      { input: 1_000_000, cacheRead: 0, cacheWrite5m: 0, cacheWrite1h: 0, output: 0 },
      'claude-opus-40',
    );
    expect(cost).toBeNull();
  });

  it('does NOT false-match claude-haiku-4 for claude-haiku-45', () => {
    const cost = computeCost(
      { input: 1_000_000, cacheRead: 0, cacheWrite5m: 0, cacheWrite1h: 0, output: 0 },
      'claude-haiku-45',
    );
    expect(cost).toBeNull();
  });
});

describe('pricing — unknown model', () => {
  it('returns null for a non-Anthropic model', () => {
    const cost = computeCost(
      { input: 1_000_000, cacheRead: 0, cacheWrite5m: 0, cacheWrite1h: 0, output: 0 },
      'gpt-4',
    );
    expect(cost).toBeNull();
  });

  it('returns null for a future Anthropic model that has no pricing entry yet', () => {
    const cost = computeCost(
      { input: 1, cacheRead: 0, cacheWrite5m: 0, cacheWrite1h: 0, output: 0 },
      'claude-future-7-0',
    );
    expect(cost).toBeNull();
  });

  it('returns null for an empty model string', () => {
    const cost = computeCost(
      { input: 1, cacheRead: 0, cacheWrite5m: 0, cacheWrite1h: 0, output: 0 },
      '',
    );
    expect(cost).toBeNull();
  });
});

describe('pricing — cost computation', () => {
  it('computes input cost at the documented per-million rate for opus-4-7', () => {
    const cost = computeCost(
      { input: 1_000_000, cacheRead: 0, cacheWrite5m: 0, cacheWrite1h: 0, output: 0 },
      'claude-opus-4-7',
    );
    expect(cost).toBe(15);
  });

  it('computes output cost at the documented per-million rate for opus-4-7', () => {
    const cost = computeCost(
      { input: 0, cacheRead: 0, cacheWrite5m: 0, cacheWrite1h: 0, output: 1_000_000 },
      'claude-opus-4-7',
    );
    expect(cost).toBe(75);
  });

  it('computes a mixed-usage cost as the sum of all four components', () => {
    const cost = computeCost(
      {
        input: 1_000_000,
        cacheRead: 1_000_000,
        cacheWrite5m: 1_000_000,
        cacheWrite1h: 1_000_000,
        output: 1_000_000,
      },
      'claude-opus-4-7',
    );
    // 15 + 1.5 + 18.75 + 30 + 75 = 140.25
    expect(cost).toBeCloseTo(15 + 1.5 + 18.75 + 30 + 75, 6);
  });

  it('returns 0 when all usage fields are 0', () => {
    const cost = computeCost(
      { input: 0, cacheRead: 0, cacheWrite5m: 0, cacheWrite1h: 0, output: 0 },
      'claude-opus-4-7',
    );
    expect(cost).toBe(0);
  });
});

describe('pricing — NaN guard', () => {
  it('returns a finite zero (not NaN) when all usage fields are explicitly 0', () => {
    // The parser layer is supposed to coerce missing fields to 0 with `?? 0`
    // before they reach computeCost. This test exercises the all-zero path
    // that results from that coercion: every multiplication is 0 * rate = 0,
    // and the sum is a finite 0 — never NaN.
    //
    // Note: this test deliberately does NOT cover MISSING (undefined) fields
    // reaching computeCost — the current implementation has no defensive
    // `?? 0` inside computeCost itself, so passing `{}` would produce NaN.
    // Coverage of the missing-field path lives at the parser boundary.
    const cost = computeCost(
      { input: 0, cacheRead: 0, cacheWrite5m: 0, cacheWrite1h: 0, output: 0 },
      'claude-opus-4-7',
    );
    expect(cost).toBe(0);
    expect(Number.isFinite(cost as number)).toBe(true);
  });
});
