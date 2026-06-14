// ─────────────────────────────────────────────────────────────────────────────
// /api/tokens/{summary,timeseries,breakdown,event}
//
// Re-exposes the legacy apps/server/src/routes/tokens.ts surface under Fastify.
// The query layer (../tokens/queries) is ported wholesale; this file mirrors
// the legacy validation EXACTLY — same allow-lists, same defaults, same error
// strings and status codes — so existing clients keep working byte-for-byte:
//
//   • cwd longer than CWD_MAX_LEN → 400 "cwd too long"
//   • range/bucket/by fall back to defaults when absent or not allow-listed
//   • /event: session_id required (400), ts required + finite (400),
//     window optional but must be finite within [1, 3_600_000] (400)
//   • /event success returns the row OR the JSON literal `null` (not 204),
//     matching the legacy `JSON.stringify(row)` body.
// ─────────────────────────────────────────────────────────────────────────────

import type { FastifyInstance } from 'fastify';
import {
  getSummary,
  getTimeseries,
  getBreakdown,
  type Range,
  type Bucket,
  type BreakdownDimension,
} from '../tokens/queries';
import { findTokenEventNear } from '../tokens/store';

const ALLOWED_RANGES: Range[] = ['1d', '7d', '30d'];
const ALLOWED_BUCKETS: Bucket[] = ['hour', 'day'];
const ALLOWED_BREAKDOWNS: BreakdownDimension[] = ['model', 'cwd', 'git_branch'];

const CWD_MAX_LEN = 4096;
const EVENT_WINDOW_DEFAULT_MS = 60_000;
const EVENT_WINDOW_MIN_MS = 1;
const EVENT_WINDOW_MAX_MS = 3_600_000;

interface TokensQuery {
  cwd?: string;
  range?: string;
  bucket?: string;
  by?: string;
  session_id?: string;
  ts?: string;
  window?: string;
}

export async function tokenRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/tokens/summary?cwd= → { today, week, month } PeriodTotals.
  app.get<{ Querystring: TokensQuery }>('/api/tokens/summary', async (req, reply) => {
    // `|| undefined` collapses an empty-string cwd to undefined (legacy parity).
    const cwd = req.query.cwd || undefined;
    if (cwd && cwd.length > CWD_MAX_LEN) {
      return reply.code(400).type('text/plain').send('cwd too long');
    }
    return getSummary(cwd);
  });

  // GET /api/tokens/timeseries?range=&bucket=&cwd=
  app.get<{ Querystring: TokensQuery }>('/api/tokens/timeseries', async (req, reply) => {
    const cwd = req.query.cwd || undefined;
    if (cwd && cwd.length > CWD_MAX_LEN) {
      return reply.code(400).type('text/plain').send('cwd too long');
    }
    const rangeParam = (req.query.range ?? null) as Range | null;
    const bucketParam = (req.query.bucket ?? null) as Bucket | null;
    const range = rangeParam && ALLOWED_RANGES.includes(rangeParam) ? rangeParam : '7d';
    const bucket = bucketParam && ALLOWED_BUCKETS.includes(bucketParam) ? bucketParam : 'day';
    return getTimeseries(range, bucket, cwd);
  });

  // GET /api/tokens/breakdown?by=&cwd=
  app.get<{ Querystring: TokensQuery }>('/api/tokens/breakdown', async (req, reply) => {
    const cwd = req.query.cwd || undefined;
    if (cwd && cwd.length > CWD_MAX_LEN) {
      return reply.code(400).type('text/plain').send('cwd too long');
    }
    const byParam = (req.query.by ?? null) as BreakdownDimension | null;
    const by = byParam && ALLOWED_BREAKDOWNS.includes(byParam) ? byParam : 'model';
    return getBreakdown(by, cwd);
  });

  // GET /api/tokens/event?session_id=&ts=&window= — closest token_events row
  // within ±window ms of ts. Returns the row or the JSON literal `null`. Used
  // by the client's findCostForEvent REST fallback when liveEvents has no match.
  app.get<{ Querystring: TokensQuery }>('/api/tokens/event', async (req, reply) => {
    const sessionId = req.query.session_id;
    if (!sessionId) {
      return reply.code(400).type('text/plain').send('session_id is required');
    }

    const tsRaw = req.query.ts;
    if (tsRaw === undefined) {
      return reply.code(400).type('text/plain').send('ts is required');
    }
    const ts = Number(tsRaw);
    if (!Number.isFinite(ts)) {
      return reply.code(400).type('text/plain').send('ts must be a finite number');
    }

    let windowMs = EVENT_WINDOW_DEFAULT_MS;
    const windowRaw = req.query.window;
    if (windowRaw !== undefined) {
      const w = Number(windowRaw);
      if (!Number.isFinite(w) || w < EVENT_WINDOW_MIN_MS || w > EVENT_WINDOW_MAX_MS) {
        return reply
          .code(400)
          .type('text/plain')
          .send(`window must be a finite number between ${EVENT_WINDOW_MIN_MS} and ${EVENT_WINDOW_MAX_MS}`);
      }
      windowMs = w;
    }

    const row = findTokenEventNear(sessionId, ts, windowMs);
    // Serialize explicitly so a no-match returns the JSON literal `null`
    // (Fastify would otherwise send an empty 200 body for `null`).
    return reply.type('application/json').send(JSON.stringify(row));
  });
}
