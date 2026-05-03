/**
 * Format model name for display (e.g., "claude-haiku-4-5-20251001" -> "haiku-4-5")
 */
export const formatModelName = (name: string | null | undefined): string => {
  if (!name) return '';

  const parts = name.split('-');
  if (parts.length >= 4) {
    return `${parts[1]}-${parts[2]}-${parts[3]}`;
  }
  return name;
};

/**
 * Format gap time in ms to readable string (e.g., "125ms" or "1.2s")
 */
export const formatGap = (gapMs: number): string => {
  if (gapMs === 0) return '—';
  if (gapMs < 1000) {
    return `${Math.round(gapMs)}ms`;
  }
  return `${(gapMs / 1000).toFixed(1)}s`;
};

// Locale-aware money + token formatters. Constructed once and reused so
// we don't pay the Intl construction cost on every render.
const usdFormatter = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const usdSubCent = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});

const tokenFormatter = new Intl.NumberFormat(undefined, {
  notation: 'compact',
  maximumFractionDigits: 1,
});

/**
 * Format a USD value for display. Sub-cent values render with 4 decimals
 * so micro-costs aren't rounded to `$0.00`. Non-finite input renders as `—`.
 */
export function formatCost(usd: number | null | undefined): string {
  const n = Number(usd);
  if (!Number.isFinite(n)) return '—';
  if (n === 0) return usdFormatter.format(0);
  if (Math.abs(n) < 0.01) return usdSubCent.format(n);
  return usdFormatter.format(n);
}

/**
 * Format a token count using compact notation (e.g. 12.3K, 4.5M).
 * Non-finite input renders as `—`.
 */
export function formatTokens(n: number | null | undefined): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  return tokenFormatter.format(v);
}

/**
 * Format a millisecond Unix epoch timestamp relative to `nowMs` using
 * `Intl.RelativeTimeFormat`. Picks the largest sensible unit (second /
 * minute / hour / day).
 */
export function formatRelative(tsMs: number, nowMs: number = Date.now()): string {
  const diff = tsMs - nowMs;
  const absSec = Math.abs(diff) / 1000;
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  if (absSec < 60) return rtf.format(Math.round(diff / 1000), 'second');
  if (absSec < 3600) return rtf.format(Math.round(diff / 60000), 'minute');
  if (absSec < 86400) return rtf.format(Math.round(diff / 3600000), 'hour');
  return rtf.format(Math.round(diff / 86400000), 'day');
}
