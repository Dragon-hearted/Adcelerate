import { computeCost } from './pricing';
import type { TokenEventRow } from './db';

interface RawAssistantLine {
  type?: string;
  sessionId?: string;
  cwd?: string;
  gitBranch?: string;
  timestamp?: string;
  requestId?: string;
  message?: {
    model?: string;
    usage?: {
      input_tokens?: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
      output_tokens?: number;
      cache_creation?: {
        ephemeral_5m_input_tokens?: number;
        ephemeral_1h_input_tokens?: number;
      };
    };
  };
}

/**
 * Parse one JSONL transcript line.
 *
 * `mtimeMs` is the file's last-modified time (ms since epoch). It is used as a
 * fallback when the line does not include a `timestamp` field. If both are
 * missing, the line is skipped (returns null) — we never silently substitute
 * `Date.now()`, which would attribute backfilled rows to the current wall
 * clock instead of when the turn actually happened.
 */
export function parseLine(
  line: string,
  file: string,
  offset: number,
  mtimeMs?: number
): TokenEventRow | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  let obj: RawAssistantLine;
  try {
    obj = JSON.parse(trimmed);
  } catch {
    return null;
  }
  if (!obj || typeof obj !== 'object') return null;

  if (obj.type !== 'assistant') return null;
  const usage = obj.message?.usage;
  if (!usage) return null;

  const model = obj.message?.model;
  if (!model) return null;

  const sessionId = obj.sessionId;
  if (!sessionId) return null;

  let ts: number;
  if (obj.timestamp) {
    ts = Date.parse(obj.timestamp);
    if (Number.isNaN(ts)) return null;
  } else if (typeof mtimeMs === 'number' && Number.isFinite(mtimeMs)) {
    ts = mtimeMs;
  } else {
    // No transcript timestamp and no fallback mtime — refuse to invent one.
    return null;
  }

  const input          = usage.input_tokens ?? 0;
  const cacheRead      = usage.cache_read_input_tokens ?? 0;
  const totalCacheCreate = usage.cache_creation_input_tokens ?? 0;
  // Detect the ephemeral split fields by PRESENCE, not by summed value.
  // A transcript with an explicit split where both fields are 0 is a legitimate
  // shape — the previous `(ephemeral5m + ephemeral1h) > 0` check incorrectly
  // treated that case as if the split were absent and fell back to dumping
  // `cache_creation_input_tokens` into cacheWrite5m, drifting both token totals
  // and cost. Inspecting the keys on `cache_creation` (rather than coalesced
  // values) preserves the explicit zero case correctly.
  const cacheCreation = usage.cache_creation;
  const hasSplitCacheFields =
    cacheCreation !== undefined &&
    cacheCreation !== null &&
    (
      'ephemeral_5m_input_tokens' in cacheCreation ||
      'ephemeral_1h_input_tokens' in cacheCreation
    );
  const ephemeral5m    = cacheCreation?.ephemeral_5m_input_tokens ?? 0;
  const ephemeral1h    = cacheCreation?.ephemeral_1h_input_tokens ?? 0;
  // Prefer the split fields when present; otherwise treat all cache_creation as 5m.
  const cacheWrite5m = hasSplitCacheFields ? ephemeral5m : totalCacheCreate;
  const cacheWrite1h = hasSplitCacheFields ? ephemeral1h : 0;
  const output         = usage.output_tokens ?? 0;

  // Drop empty turns (keep-alives etc.)
  if (input + cacheRead + cacheWrite5m + cacheWrite1h + output === 0) return null;

  const cost_usd = computeCost(
    { input, cacheRead, cacheWrite5m, cacheWrite1h, output },
    model
  );

  return {
    ts,
    session_id: sessionId,
    cwd: obj.cwd ?? null,
    git_branch: obj.gitBranch ?? null,
    model,
    input,
    cache_read: cacheRead,
    cache_write_5m: cacheWrite5m,
    cache_write_1h: cacheWrite1h,
    output,
    cost_usd,
    request_id: obj.requestId ?? null,
    transcript_file: file,
    transcript_line_offset: offset,
  };
}
