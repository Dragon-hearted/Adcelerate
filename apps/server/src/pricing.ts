// Anthropic public list pricing per million tokens (USD).
// Update when Anthropic ships a new model or changes prices.
// Source: https://www.anthropic.com/pricing
//
// Cache pricing follows Anthropic's standard ratio:
//   cacheWrite5m = 1.25× input
//   cacheWrite1h = 2.00× input
//   cacheRead    = 0.10× input

export interface ModelPricing {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite5m: number;
  cacheWrite1h: number;
}

export const PRICING: Record<string, ModelPricing> = {
  'claude-opus-4-7':   { input: 15,    output: 75,  cacheRead: 1.5,  cacheWrite5m: 18.75, cacheWrite1h: 30 },
  'claude-opus-4-6':   { input: 15,    output: 75,  cacheRead: 1.5,  cacheWrite5m: 18.75, cacheWrite1h: 30 },
  'claude-opus-4-5':   { input: 15,    output: 75,  cacheRead: 1.5,  cacheWrite5m: 18.75, cacheWrite1h: 30 },
  'claude-opus-4':     { input: 15,    output: 75,  cacheRead: 1.5,  cacheWrite5m: 18.75, cacheWrite1h: 30 },
  'claude-sonnet-4-6': { input: 3,     output: 15,  cacheRead: 0.3,  cacheWrite5m: 3.75,  cacheWrite1h: 6  },
  'claude-sonnet-4-5': { input: 3,     output: 15,  cacheRead: 0.3,  cacheWrite5m: 3.75,  cacheWrite1h: 6  },
  'claude-sonnet-4':   { input: 3,     output: 15,  cacheRead: 0.3,  cacheWrite5m: 3.75,  cacheWrite1h: 6  },
  'claude-haiku-4-5':  { input: 1,     output: 5,   cacheRead: 0.1,  cacheWrite5m: 1.25,  cacheWrite1h: 2  },
  'claude-haiku-4':    { input: 1,     output: 5,   cacheRead: 0.1,  cacheWrite5m: 1.25,  cacheWrite1h: 2  },
};

const warnedModels = new Set<string>();

export interface UsageBreakdown {
  input: number;
  cacheRead: number;
  cacheWrite5m: number;
  cacheWrite1h: number;
  output: number;
}

function findPricing(model: string): ModelPricing | null {
  if (PRICING[model]) return PRICING[model]!;
  // Date-suffix match: "claude-opus-4-7-20251101" → "claude-opus-4-7"
  //
  // BOUNDARY REQUIREMENT: we must require either an exact match OR that the
  // matched key is followed by a literal '-' separator. Plain `startsWith(key)`
  // is unsafe because, depending on the iteration order of `Object.keys`, a
  // shorter SKU like 'claude-opus-4' would swallow a future SKU like
  // 'claude-opus-4-10-20260101' (and similarly 'claude-opus-4-7' would
  // incorrectly match 'claude-opus-4-10' if the version tokens are
  // numerically multi-digit). The '-' boundary check anchors the match to
  // a real version segment, not a digit-prefix collision.
  for (const key of Object.keys(PRICING)) {
    if (model === key || model.startsWith(key + '-')) return PRICING[key]!;
  }
  return null;
}

// UNKNOWN MODEL HANDLING:
// `computeCost` returns `null` (NOT 0) for unknown models. Callers and SQL
// aggregations MUST handle this distinction:
//   - In SQL, wrap with `COALESCE(SUM(cost_usd), 0)` so reporting renders 0
//     for periods with only unpriced rows (instead of NULL → empty cell).
//   - Token volume from unpriced rows still counts in `SUM(input)` etc., so
//     dashboards may want to surface "unpriced_tokens" separately to flag
//     coverage gaps. Today we don't, but the seam is here when needed.
// The `null` return is a load-bearing signal that pricing data is missing,
// not zero — do not coerce it upstream.
export function computeCost(usage: UsageBreakdown, model: string): number | null {
  const p = findPricing(model);
  if (!p) {
    if (!warnedModels.has(model)) {
      warnedModels.add(model);
      console.warn(`[pricing] unknown model "${model}" — token counts persisted, cost left null`);
    }
    return null;
  }
  return (
    (usage.input        * p.input)        / 1_000_000 +
    (usage.cacheRead    * p.cacheRead)    / 1_000_000 +
    (usage.cacheWrite5m * p.cacheWrite5m) / 1_000_000 +
    (usage.cacheWrite1h * p.cacheWrite1h) / 1_000_000 +
    (usage.output       * p.output)       / 1_000_000
  );
}
