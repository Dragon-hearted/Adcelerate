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
  for (const key of Object.keys(PRICING)) {
    if (model.startsWith(key)) return PRICING[key]!;
  }
  return null;
}

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
