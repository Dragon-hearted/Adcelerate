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

export function parseLine(
  line: string,
  file: string,
  offset: number
): TokenEventRow | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  let obj: RawAssistantLine;
  try {
    obj = JSON.parse(trimmed);
  } catch {
    return null;
  }

  if (obj.type !== 'assistant') return null;
  const usage = obj.message?.usage;
  if (!usage) return null;

  const model = obj.message?.model;
  if (!model) return null;

  const sessionId = obj.sessionId;
  if (!sessionId) return null;

  const ts = obj.timestamp ? Date.parse(obj.timestamp) : Date.now();
  if (Number.isNaN(ts)) return null;

  const input          = usage.input_tokens ?? 0;
  const cacheRead      = usage.cache_read_input_tokens ?? 0;
  const totalCacheCreate = usage.cache_creation_input_tokens ?? 0;
  const ephemeral5m    = usage.cache_creation?.ephemeral_5m_input_tokens ?? 0;
  const ephemeral1h    = usage.cache_creation?.ephemeral_1h_input_tokens ?? 0;
  // Prefer the split fields when present; otherwise treat all cache_creation as 5m.
  const cacheWrite5m = ephemeral5m + ephemeral1h > 0 ? ephemeral5m : totalCacheCreate;
  const cacheWrite1h = ephemeral1h;
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
