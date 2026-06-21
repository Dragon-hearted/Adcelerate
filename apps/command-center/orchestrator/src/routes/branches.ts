// ─────────────────────────────────────────────────────────────────────────────
// /api/branches — Console-as-control-plane Branch/Lineage editing (slice #41).
//
//   POST /api/branches               → fork a Step into a fresh human Branch,
//                                       activate it (human-sticky), stale downstream
//   POST /api/branches/:id/activate  → activate a Branch (human-sticky)
//   POST /api/runs/:runId/replan     → diff the Run's slot set, orphan dropped slots
//   GET  /api/runs/:runId/branches   → the Run's BranchProjection (folded)
//
// ponytail: no-branches-table-fold-instead. ADR-0015 supersedes ADR-0005's mutable
// active/stale columns: the active pointer is EVENT-SOURCED, never an UPDATE. We
// persist `cc.branch.*` CCEvents on the existing `events` log (the same ordered log
// the Emitter Run/Step envelopes ride) via `eventBus.emit`, and DERIVE everything
// read-side via the pure `projectBranches` fold — no branches table, no migration.
//
// The Console is a NET-NEW control-plane producer (ADR-0015): unlike `/api/ingest`
// (data-plane, from the Emitter) it ORIGINATES the control events. Each mutating
// route persists-then-broadcasts (same discipline as ingest): emit the control
// event(s), re-fold, push `branch:update` + `step-graph:update` over the socket.
//
// ponytail: flag-not-cascade — #41 only FLAGS Stale/Orphaned (overlays, preserved
// never deleted); the provenance-aware auto-regeneration of agent Branches is #42.
// ponytail: generation-tag-is-ordering-not-vectorclock — `generation` is the run's
// ingest seq watermark, compared by the fold for human-stickiness, not a clock.
// ─────────────────────────────────────────────────────────────────────────────

import type { FastifyInstance } from 'fastify';
import { asc, eq, sql } from 'drizzle-orm';
import {
  projectBranches,
  projectStepGraph,
  staleDownstream,
  diffSlots,
  rootBranchId,
  type CCEvent,
  type BranchProjection,
} from '@command-center/shared';
import { db } from '../db/client';
import { events } from '../db/schema';
import { rowToEvent } from '../db/mappers';
import { eventBus } from '../bus/event-bus';
import { loadRunEnvelopes } from './ingest';

/** Load a Run's persisted `cc.branch.*` control events in append (seq) order. */
// Distinct from `loadRunEnvelopes` (which loads only Run/Step DATA-plane envelopes);
// the branch fold reads the CONTROL-plane events the Console originates here.
export function loadRunControlEvents(runId: string): CCEvent[] {
  const rows = db
    .select()
    .from(events)
    .where(eq(events.sessionId, runId))
    .orderBy(asc(events.seq))
    .all();
  const out: CCEvent[] = [];
  for (const r of rows) {
    if (typeof r.hookEventType === 'string' && r.hookEventType.startsWith('cc.branch.')) {
      out.push(rowToEvent(r));
    }
  }
  return out;
}

/**
 * The current generation tag for a Run = its highest persisted seq + 1. A monotonic
 * ordering ordinal (ADR-0015 §2): each human edit lands after more ingest, so its
 * generation strictly exceeds earlier ones, and a later agent cascade carrying the
 * triggering edit's (lower) generation can never clobber a human pick.
 * ponytail: generation-tag-is-ordering-not-vectorclock.
 */
function currentGeneration(runId: string): number {
  const row = db
    .select({ max: sql<number>`COALESCE(MAX(${events.seq}), 0)` })
    .from(events)
    .where(eq(events.sessionId, runId))
    .get();
  return Number(row?.max ?? 0) + 1;
}

/** Coerce an arbitrary edit body to the BranchInfo payload shape (ref/text only). */
function sanitizePayload(raw: unknown): { ref?: string; text?: string } | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as { ref?: unknown; text?: unknown };
  const out: { ref?: string; text?: string } = {};
  if (typeof r.ref === 'string') out.ref = r.ref;
  if (typeof r.text === 'string') out.text = r.text;
  return out.ref !== undefined || out.text !== undefined ? out : undefined;
}

/**
 * Derive the StepGraph overlay sets by FOLDING the Run's control events: a
 * `cc.branch.staled` with `orphaned === true` → orphaned overlay; otherwise →
 * stale overlay. Replay-safe: a reopened Run re-derives both sets from the log, so
 * `projectStepGraph` re-stamps the same flags (PRESERVED, never deleted).
 */
export function overlaySetsFromControl(
  controlEvents: CCEvent[],
): { stale: Set<string>; orphaned: Set<string> } {
  const stale = new Set<string>();
  const orphaned = new Set<string>();
  for (const ev of controlEvents) {
    if (ev.hook_event_type !== 'cc.branch.staled') continue;
    const stepKey = ev.payload?.stepKey;
    if (typeof stepKey !== 'string') continue;
    if (ev.payload?.orphaned === true) orphaned.add(stepKey);
    else stale.add(stepKey);
  }
  return { stale, orphaned };
}

/**
 * Re-fold + broadcast after a control mutation (mirrors ingest's persist-then-
 * broadcast): push the whole BranchProjection on `branch:update` and the re-stamped
 * StepGraph on `step-graph:update`. Returns the BranchProjection for the response.
 */
function reprojectAndBroadcast(runId: string): BranchProjection {
  const control = loadRunControlEvents(runId);
  const branchProjection = projectBranches(control);
  eventBus.emitBranchUpdate(branchProjection);

  const { stale, orphaned } = overlaySetsFromControl(control);
  const graph = projectStepGraph(loadRunEnvelopes(runId), { stale, orphaned });
  eventBus.emitStepGraphUpdate(graph);

  return branchProjection;
}

export async function branchRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/branches — fork a Step into a fresh, immutable HUMAN Branch, activate
  // it (human-sticky), then FLAG declared-downstream Steps Stale.
  app.post<{
    Body: {
      runId?: unknown;
      stepKey?: unknown;
      payload?: unknown;
      parentBranchId?: unknown;
    };
  }>('/api/branches', async (req, reply) => {
    const runId = typeof req.body?.runId === 'string' ? req.body.runId : '';
    const stepKey = typeof req.body?.stepKey === 'string' ? req.body.stepKey : '';
    if (!runId || !stepKey) {
      return reply.code(400).send({ error: 'runId and stepKey required' });
    }

    // Parent = the explicit param, else the Step's CURRENT active branch, else the
    // data-plane ROOT branch (rootBranchId === stepKey) when no fork exists yet.
    const proj = projectBranches(loadRunControlEvents(runId));
    const parentBranchId =
      typeof req.body?.parentBranchId === 'string' && req.body.parentBranchId.length > 0
        ? req.body.parentBranchId
        : proj.steps[stepKey]?.activeBranchId ?? rootBranchId(stepKey);

    const branchId = crypto.randomUUID();
    const createdAt = Date.now();
    const payload = sanitizePayload(req.body?.payload);
    const generation = currentGeneration(runId);

    // 1. The immutable Branch (human provenance) — the original is PRESERVED.
    eventBus.emit({
      session_id: runId,
      hook_event_type: 'cc.branch.created',
      payload: {
        runId,
        stepKey,
        branchId,
        parentBranchId,
        provenance: 'human',
        createdAt,
        ...(payload ? { payload } : {}),
      },
      summary: `branch.created ${stepKey}`,
    });

    // 2. Activate it — human, current generation (the fold enforces stickiness).
    eventBus.emit({
      session_id: runId,
      hook_event_type: 'cc.branch.activated',
      payload: { runId, stepKey, branchId, provenance: 'human', generation },
      summary: `branch.activated ${stepKey}`,
    });

    // 3. FLAG declared-downstream Steps Stale (along the DAG's `deps` edges). #41
    //    flags only — #42 owns the regeneration cascade. ponytail: flag-not-cascade.
    const edges = projectStepGraph(loadRunEnvelopes(runId)).edges;
    for (const downstreamKey of staleDownstream(edges, [stepKey])) {
      eventBus.emit({
        session_id: runId,
        hook_event_type: 'cc.branch.staled',
        payload: { runId, stepKey: downstreamKey },
        summary: `branch.staled ${downstreamKey}`,
      });
    }

    reprojectAndBroadcast(runId);
    return reply.code(200).send({ branchId });
  });

  // POST /api/branches/:id/activate — record a human activation (human-sticky). The
  // fold resolves the single active pointer; we just persist the event.
  app.post<{ Params: { id: string }; Body: { runId?: unknown; stepKey?: unknown } }>(
    '/api/branches/:id/activate',
    async (req, reply) => {
      const runId = typeof req.body?.runId === 'string' ? req.body.runId : '';
      const stepKey = typeof req.body?.stepKey === 'string' ? req.body.stepKey : '';
      if (!runId || !stepKey) {
        return reply.code(400).send({ error: 'runId and stepKey required' });
      }
      const branchId = req.params.id;
      const generation = currentGeneration(runId);

      eventBus.emit({
        session_id: runId,
        hook_event_type: 'cc.branch.activated',
        payload: { runId, stepKey, branchId, provenance: 'human', generation },
        summary: `branch.activated ${stepKey}`,
      });

      reprojectAndBroadcast(runId);
      return reply.code(200).send({ ok: true });
    },
  );

  // POST /api/runs/:runId/replan — EXPLICIT slot-diff (ADR-0018). Slot Identity is
  // the Step's key here; the prior set is the Run's current Steps. Only the DROPPED
  // slots' Steps are Orphaned (PRESERVED), stable slots keep their Steps/Branches.
  // ponytail: explicit-replan-diff — explicit slot set IN, slot diff OUT.
  app.post<{ Params: { runId: string }; Body: { slotIds?: unknown } }>(
    '/api/runs/:runId/replan',
    async (req, reply) => {
      const { runId } = req.params;
      if (!Array.isArray(req.body?.slotIds)) {
        return reply.code(400).send({ error: 'slotIds (string[]) required' });
      }
      const slotIds = req.body.slotIds.filter((s): s is string => typeof s === 'string');

      // Prior Slot Identity = the Run's current Step set (folded from envelopes).
      const priorSlotIds = projectStepGraph(loadRunEnvelopes(runId)).nodes.map((n) => n.stepKey);
      const { orphaned } = diffSlots(priorSlotIds, slotIds);

      for (const stepKey of orphaned) {
        eventBus.emit({
          session_id: runId,
          hook_event_type: 'cc.branch.staled',
          payload: { runId, stepKey, orphaned: true },
          summary: `branch.orphaned ${stepKey}`,
        });
      }

      reprojectAndBroadcast(runId);
      return reply.code(200).send({ orphaned });
    },
  );

  // GET /api/runs/:runId/branches — the Run's BranchProjection (re-folded on read).
  app.get<{ Params: { runId: string } }>('/api/runs/:runId/branches', async (req) => {
    return projectBranches(loadRunControlEvents(req.params.runId));
  });
}
