// ─────────────────────────────────────────────────────────────────────────────
// /api/sessions — session lifecycle + replay.
//
// SKELETON (task #2): the read paths (list / descriptor / replay) are fully
// functional against persisted state right now. The mutating paths (create /
// prompt / stop) delegate to a `SessionEngine` that the agent-session task (#3)
// registers via `setSessionEngine`. Until then they answer 503 (engine not
// ready) rather than pretending to succeed.
// ─────────────────────────────────────────────────────────────────────────────

import type { FastifyInstance } from 'fastify';
import { asc, desc, eq } from 'drizzle-orm';
import type { AgentDescriptor, AgentRole } from '@command-center/shared';
import { db } from '../db/client';
import { sessions, events } from '../db/schema';
import { rowToDescriptor, rowToEvent } from '../db/mappers';

/** Implemented by the SessionRegistry in task #3. */
export interface SessionEngine {
  create(input: {
    name: string;
    role: AgentRole;
    model?: string;
    cwd?: string;
  }): Promise<AgentDescriptor>;
  prompt(sessionId: string, text: string): Promise<void> | void;
  stop(sessionId: string): Promise<void> | void;
}

let engine: SessionEngine | null = null;

export function setSessionEngine(next: SessionEngine | null): void {
  engine = next;
}

const ENGINE_UNAVAILABLE = {
  error: 'Session engine not yet available',
} as const;

export async function sessionRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/sessions — list active + recent sessions (most-recent first).
  app.get('/api/sessions', async () => {
    const rows = db.select().from(sessions).orderBy(desc(sessions.startedAt)).all();
    return rows.map(rowToDescriptor);
  });

  // GET /api/sessions/:id — descriptor + last N events.
  app.get<{ Params: { id: string }; Querystring: { limit?: string } }>(
    '/api/sessions/:id',
    async (req, reply) => {
      const { id } = req.params;
      const row = db.select().from(sessions).where(eq(sessions.sessionId, id)).get();
      if (!row) return reply.code(404).send({ error: 'Session not found' });

      const limit = clampLimit(req.query.limit, 100, 1000);
      const recent = db
        .select()
        .from(events)
        .where(eq(events.sessionId, id))
        .orderBy(desc(events.seq))
        .limit(limit)
        .all()
        .map(rowToEvent)
        .reverse();

      return { descriptor: rowToDescriptor(row), events: recent };
    },
  );

  // GET /api/sessions/:id/replay — full ordered event log (deterministic replay).
  app.get<{ Params: { id: string } }>('/api/sessions/:id/replay', async (req) => {
    const { id } = req.params;
    const log = db
      .select()
      .from(events)
      .where(eq(events.sessionId, id))
      .orderBy(asc(events.seq))
      .all()
      .map(rowToEvent);
    return { sessionId: id, events: log };
  });

  // POST /api/sessions — create + start an agent. (wired in #3)
  app.post<{ Body: { name?: string; role?: AgentRole; model?: string; cwd?: string } }>(
    '/api/sessions',
    async (req, reply) => {
      const body = req.body ?? {};
      if (!body.name || !body.role) {
        return reply.code(400).send({ error: 'name and role are required' });
      }
      if (!engine) return reply.code(503).send(ENGINE_UNAVAILABLE);
      const descriptor = await engine.create({
        name: body.name,
        role: body.role,
        model: body.model,
        cwd: body.cwd,
      });
      return reply.code(201).send(descriptor);
    },
  );

  // POST /api/sessions/:id/prompt — push a user turn into the input queue. (wired in #3)
  app.post<{ Params: { id: string }; Body: { text?: string } }>(
    '/api/sessions/:id/prompt',
    async (req, reply) => {
      const text = req.body?.text;
      if (typeof text !== 'string' || text.length === 0) {
        return reply.code(400).send({ error: 'text is required' });
      }
      if (!engine) return reply.code(503).send(ENGINE_UNAVAILABLE);
      await engine.prompt(req.params.id, text);
      return reply.code(202).send({ ok: true });
    },
  );

  // POST /api/sessions/:id/stop — graceful interrupt. (wired in #3)
  app.post<{ Params: { id: string } }>('/api/sessions/:id/stop', async (req, reply) => {
    if (!engine) return reply.code(503).send(ENGINE_UNAVAILABLE);
    await engine.stop(req.params.id);
    return reply.code(202).send({ ok: true });
  });
}

function clampLimit(raw: string | undefined, fallback: number, max: number): number {
  if (raw === undefined) return fallback;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(n, max);
}
