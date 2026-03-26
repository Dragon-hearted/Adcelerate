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
