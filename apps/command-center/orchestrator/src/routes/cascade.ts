// ─────────────────────────────────────────────────────────────────────────────
// /api/runs/:runId/cascade — provenance-aware cascade preview + request (slice #42).
//
//   GET  /api/runs/:runId/cascade-preview?stepKey=<k> → CascadePreview
//   POST /api/runs/:runId/cascade  { stepKey }        → { requested: string[] }
//
// The BRAIN is the pure `cascadePreview` fold in packages/shared (provenance-aware
// target set, count/threshold honesty). This route just FOLDS the run exactly the
// way /api/runs/:runId/graph and /api/runs/:runId/branches already do — reusing
// `loadRunEnvelopes` + `projectStepGraph` and `loadRunControlEvents` + `projectBranches`
// — runs the fold, then attaches `runId` + `budgetHeadroom` (the latest cached trip
// per provider; see `budgetTripCache`).
//
// The POST persists EXACTLY ONE `cc.cascade.requested` CCEvent on the run's event
// log (same persistence path branches.ts uses for `cc.branch.*`). Durable intent
// only — no projection consumes it yet (the cascade-Run lifecycle is the #39
// executor's, not the Console's), so no re-fold/broadcast.
// ─────────────────────────────────────────────────────────────────────────────

import type { FastifyInstance } from 'fastify';
import {
  projectStepGraph,
  projectBranches,
  cascadePreview,
  type CascadePreview,
  type BudgetHeadroom,
} from '@command-center/shared';
import { eventBus, budgetTripCache } from '../bus/event-bus';
import { loadRunEnvelopes } from './ingest';
import { loadRunControlEvents } from './branches';

/** Latest cached budget trip per provider → honest BudgetHeadroom rows (may be empty). */
function budgetHeadroom(): BudgetHeadroom[] {
  return [...budgetTripCache.values()].map((t) => ({
    provider: t.provider,
    model: t.model,
    spentUsd: t.spentUsd,
    limitUsd: t.limitUsd,
    at: t.at,
  }));
}

export async function cascadeRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/runs/:runId/cascade-preview?stepKey=<k> — what editing `stepKey` would
  // cascade: agent-authored downstream targets, human-active excluded. 404 if the
  // run is unknown or `stepKey` is not a node in the folded graph.
  app.get<{ Params: { runId: string }; Querystring: { stepKey?: string } }>(
    '/api/runs/:runId/cascade-preview',
    async (req, reply) => {
      const { runId } = req.params;
      const stepKey = typeof req.query.stepKey === 'string' ? req.query.stepKey : '';
      if (!stepKey) {
        return reply.code(400).send({ error: 'stepKey query param required' });
      }

      const graph = projectStepGraph(loadRunEnvelopes(runId));
      // Unknown run (no envelopes) → no nodes; unknown step → not a node. Both 404.
      if (!graph.nodes.some((n) => n.stepKey === stepKey)) {
        return reply.code(404).send({ error: 'run or stepKey not found' });
      }

      const branchProj = projectBranches(loadRunControlEvents(runId));
      const preview = cascadePreview(graph, branchProj, stepKey);
      const full: CascadePreview = { runId, ...preview, budgetHeadroom: budgetHeadroom() };
      return full;
    },
  );

  // POST /api/runs/:runId/cascade — record the operator's durable cascade intent as
  // EXACTLY ONE `cc.cascade.requested` event. Returns the target stepKeys.
  app.post<{ Params: { runId: string }; Body: { stepKey?: unknown } }>(
    '/api/runs/:runId/cascade',
    async (req, reply) => {
      const { runId } = req.params;
      const stepKey = typeof req.body?.stepKey === 'string' ? req.body.stepKey : '';
      if (!stepKey) {
        return reply.code(400).send({ error: 'stepKey required' });
      }

      const graph = projectStepGraph(loadRunEnvelopes(runId));
      if (!graph.nodes.some((n) => n.stepKey === stepKey)) {
        return reply.code(404).send({ error: 'run or stepKey not found' });
      }

      const branchProj = projectBranches(loadRunControlEvents(runId));
      const targets = cascadePreview(graph, branchProj, stepKey).targets.map((t) => t.stepKey);

      eventBus.emit({
        session_id: runId,
        hook_event_type: 'cc.cascade.requested',
        payload: { editedStepKey: stepKey, targets },
        summary: `cascade.requested ${stepKey}`,
      });

      return reply.code(200).send({ requested: targets });
    },
  );
}
