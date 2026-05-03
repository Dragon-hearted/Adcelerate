import { getSummary, getTimeseries, getBreakdown, type Range, type Bucket, type BreakdownDimension } from '../token-queries';
import { findTokenEventNear } from '../db';

const ALLOWED_RANGES: Range[] = ['1d', '7d', '30d'];
const ALLOWED_BUCKETS: Bucket[] = ['hour', 'day'];
const ALLOWED_BREAKDOWNS: BreakdownDimension[] = ['model', 'cwd', 'git_branch'];

const CWD_MAX_LEN = 4096;
const EVENT_WINDOW_DEFAULT_MS = 60_000;
const EVENT_WINDOW_MIN_MS = 1;
const EVENT_WINDOW_MAX_MS = 3_600_000;

export function handleTokensRequest(
  url: URL,
  req: Request,
  headers: Record<string, string>
): Response | null {
  if (!url.pathname.startsWith('/api/tokens/')) return null;
  if (req.method !== 'GET') return null;

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });

  const text = (body: string, status: number, extra: Record<string, string> = {}) =>
    new Response(body, {
      status,
      headers: { ...headers, 'Content-Type': 'text/plain', ...extra },
    });

  const cwd = url.searchParams.get('cwd') || undefined;
  if (cwd && cwd.length > CWD_MAX_LEN) {
    return text('cwd too long', 400);
  }

  if (url.pathname === '/api/tokens/summary') {
    return json(getSummary(cwd));
  }

  if (url.pathname === '/api/tokens/timeseries') {
    const rangeParam = url.searchParams.get('range') as Range | null;
    const bucketParam = url.searchParams.get('bucket') as Bucket | null;
    const range = rangeParam && ALLOWED_RANGES.includes(rangeParam) ? rangeParam : '7d';
    const bucket = bucketParam && ALLOWED_BUCKETS.includes(bucketParam) ? bucketParam : 'day';
    return json(getTimeseries(range, bucket, cwd));
  }

  if (url.pathname === '/api/tokens/breakdown') {
    const byParam = url.searchParams.get('by') as BreakdownDimension | null;
    const by = byParam && ALLOWED_BREAKDOWNS.includes(byParam) ? byParam : 'model';
    return json(getBreakdown(by, cwd));
  }

  // GET /api/tokens/event?session_id=&ts=&window= — closest token_events row
  // within ±window ms of ts. Returns the row or null. Used by the client's
  // findCostForEvent REST fallback when liveEvents has no match.
  if (url.pathname === '/api/tokens/event') {
    const sessionId = url.searchParams.get('session_id');
    if (!sessionId) {
      return text('session_id is required', 400);
    }

    const tsRaw = url.searchParams.get('ts');
    if (tsRaw === null) {
      return text('ts is required', 400);
    }
    const ts = Number(tsRaw);
    if (!Number.isFinite(ts)) {
      return text('ts must be a finite number', 400);
    }

    let windowMs = EVENT_WINDOW_DEFAULT_MS;
    const windowRaw = url.searchParams.get('window');
    if (windowRaw !== null) {
      const w = Number(windowRaw);
      if (!Number.isFinite(w) || w < EVENT_WINDOW_MIN_MS || w > EVENT_WINDOW_MAX_MS) {
        return text(`window must be a finite number between ${EVENT_WINDOW_MIN_MS} and ${EVENT_WINDOW_MAX_MS}`, 400);
      }
      windowMs = w;
    }

    const row = findTokenEventNear(sessionId, ts, windowMs);
    return json(row);
  }

  return null;
}
