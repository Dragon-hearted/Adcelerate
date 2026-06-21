// ─────────────────────────────────────────────────────────────────────────────
// /api/boards — Board persistence + open-into-Board + slot projection (slice #36).
//
//   POST /api/boards            → create a Board, return { id }
//   GET  /api/boards            → list { id, title, createdAt, runCount }
//   POST /api/boards/:id/runs   → open a Run into a Board (idempotent), broadcast,
//                                 return the fresh projection
//   GET  /api/boards/:id        → the Board's slot projection (re-folded)
//
// A Board is a join over already-persisted Runs (the `events` log + the read-side
// `projectStepGraph` fold are reused verbatim — no new persistence). Slot Identity
// `(producerSystem, slotId)` is captured into `board_runs` at open-into-Board time;
// `projectBoard` groups by it so re-generating the same slot stacks in one Board
// position. A Run is born Board-less — ingest is UNCHANGED; a Run only joins here.
// ─────────────────────────────────────────────────────────────────────────────

import type { FastifyInstance } from 'fastify';
import { eq, sql } from 'drizzle-orm';
import {
  projectStepGraph,
  projectBoard,
  type StepGraph,
  type BoardProjection,
} from '@command-center/shared';
import { db } from '../db/client';
import { boards, boardRuns } from '../db/schema';
import { eventBus } from '../bus/event-bus';
import { loadRunEnvelopes } from './ingest';

/** Load a board row by id (the 404 gate for the :id routes). */
function loadBoard(id: string) {
  return db.select().from(boards).where(eq(boards.id, id)).get();
}

/**
 * Re-fold a Board's slot projection from its memberships: each member Run's
 * StepGraph comes from the SAME read-side fold the Canvas already uses
 * (`projectStepGraph(loadRunEnvelopes(runId))`), then `projectBoard` groups them
 * by `(producerSystem, slotId)`. Pure read — no new persistence.
 */
function buildProjection(board: { id: string; title: string; createdAt: number }): BoardProjection {
  const memberships = db
    .select()
    .from(boardRuns)
    .where(eq(boardRuns.boardId, board.id))
    .all();

  const runGraphs: Record<string, StepGraph> = {};
  for (const m of memberships) {
    runGraphs[m.runId] = projectStepGraph(loadRunEnvelopes(m.runId));
  }

  return projectBoard(
    { boardId: board.id, title: board.title, createdAt: board.createdAt },
    memberships.map((m) => ({
      runId: m.runId,
      producerSystem: m.producerSystem,
      slotId: m.slotId,
    })),
    runGraphs,
  );
}

export async function boardRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/boards — create a Board. id = uuid, createdAt = now.
  app.post<{ Body: { title?: unknown } }>('/api/boards', async (req, reply) => {
    const title = typeof req.body?.title === 'string' && req.body.title.length > 0
      ? req.body.title
      : 'Untitled Board';
    const id = crypto.randomUUID();
    db.insert(boards).values({ id, title, createdAt: Date.now() }).run();
    return reply.code(201).send({ id });
  });

  // GET /api/boards — list boards with their Run count.
  app.get('/api/boards', async () => {
    const rows = db.select().from(boards).all();
    // ponytail: per-board count loop — Boards are few; a GROUP BY join isn't worth it.
    return rows.map((b) => {
      const c = db
        .select({ c: sql<number>`count(*)` })
        .from(boardRuns)
        .where(eq(boardRuns.boardId, b.id))
        .get();
      return { id: b.id, title: b.title, createdAt: b.createdAt, runCount: Number(c?.c ?? 0) };
    });
  });

  // POST /api/boards/:id/runs — open a Run into a Board (idempotent on (boardId,runId)).
  app.post<{ Params: { id: string }; Body: { runId?: unknown; slotId?: unknown } }>(
    '/api/boards/:id/runs',
    async (req, reply) => {
      const board = loadBoard(req.params.id);
      if (!board) return reply.code(404).send({ error: 'board not found' });

      const runId = typeof req.body?.runId === 'string' ? req.body.runId : '';
      if (!runId) return reply.code(400).send({ error: 'runId required' });

      // producerSystem + the producer-declared slotId come from the Run's
      // `run.started` envelope (already persisted by ingest).
      const envelopes = loadRunEnvelopes(runId);
      const started = envelopes.find((e) => e.kind === 'run.started');
      const producerSystem = started?.producerSystem ?? 'unknown';

      // ponytail: slotId fallback chain — explicit param > producer-declared
      // slotId (run.started) > runId (each Run its own slot → no accidental merge).
      const paramSlotId = typeof req.body?.slotId === 'string' && req.body.slotId.length > 0
        ? req.body.slotId
        : undefined;
      const declaredSlotId = started?.kind === 'run.started' ? started.slotId : undefined;
      const slotId = paramSlotId ?? declaredSlotId ?? runId;

      // Idempotent join: UNIQUE(boardId, runId) → re-opening the same Run is a no-op.
      db.insert(boardRuns)
        .values({ boardId: board.id, runId, producerSystem, slotId, joinedAt: Date.now() })
        .onConflictDoNothing()
        .run();

      const projection = buildProjection(board);
      eventBus.emitBoardUpdate(projection);
      return projection;
    },
  );

  // GET /api/boards/:id — the Board's slot projection (re-folded on read).
  app.get<{ Params: { id: string } }>('/api/boards/:id', async (req, reply) => {
    const board = loadBoard(req.params.id);
    if (!board) return reply.code(404).send({ error: 'board not found' });
    return buildProjection(board);
  });
}
