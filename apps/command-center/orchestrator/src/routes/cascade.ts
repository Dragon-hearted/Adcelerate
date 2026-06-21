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

import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import {
  projectStepGraph,
  projectBranches,
  cascadePreview,
  leasedSlots,
  type CascadePreview,
  type BudgetHeadroom,
} from '@command-center/shared';
import { eventBus, budgetTripCache } from '../bus/event-bus';
import { approvalBus } from '../bus/approval-bus';
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

  // POST /api/runs/:runId/cascade — the durable SPEND + LEASE gate (#43, ADR-0024).
  // Computes the cascade `targets` (provenance-aware preview), then TRIPS a durable,
  // no-timeout approval iff ANY of (ADR-0024 §3, "one rule"):
  //   • count > threshold(2)                         — a large cascade,
  //   • a budget-line is crossed                     — a cached trip spentUsd>=limitUsd,
  //   • a target ∈ leasedSlots                       — driving into a mid-flight slot.
  // On trip: park on the ApprovalBus (the Run stays plain `running` — the approval is
  // a control-plane checkpoint, NOT a Step/Run state), await the operator → on APPROVE
  // emit EXACTLY ONE `cc.cascade.requested` (the #42 emission; Step born only here);
  // on DENY emit nothing (the queued tail is never dispatched). No trip → the #42
  // silent dispatch. This folds #42's client-only ">2 confirm modal" into the server.
  // Response: { status:'dispatched', requested } | { status:'pending-approval', approvalId }
  //           | { status:'denied' }. (pending-approval is reserved for a non-blocking
  // client view; this handler awaits and resolves to dispatched/denied.)
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
      const preview = cascadePreview(graph, branchProj, stepKey);
      const targets = preview.targets.map((t) => t.stepKey);
      const { threshold } = preview;

      // ── trip conditions (each contributes an honest reason fragment) ──────────
      const leased = leasedSlots(graph);
      const leasedTargets = targets.filter((k) => leased.has(k));
      // A budget-line is crossed when ANY cached provider trip has spent >= limit.
      // We cannot map a cascade target to "its" provider (the graph carries
      // producerSystem, the cache is keyed by provider — distinct namespaces), so
      // v1 gates conservatively on any crossed line and names the real provider(s)
      // in `reason` — honest, never a fabricated $ total (ADR-0009/0016).
      // ponytail: any-crossed-line gates more (never less) = fail-safe; the narrower
      // per-target-provider rule lands when the envelope carries provider per step
      // (same missing field as #42's per-step provider — absent on the wire today).
      const crossedLines = [...budgetTripCache.values()].filter((t) => t.spentUsd >= t.limitUsd);

      const reasons: string[] = [];
      if (targets.length > threshold) reasons.push(`${targets.length} > ${threshold} nodes`);
      for (const t of crossedLines) reasons.push(`${t.provider} $${t.spentUsd}/${t.limitUsd}`);
      for (const k of leasedTargets) reasons.push(`slot ${k} busy`);

      const dispatch = () =>
        eventBus.emit({
          session_id: runId,
          hook_event_type: 'cc.cascade.requested',
          payload: { editedStepKey: stepKey, targets },
          summary: `cascade.requested ${stepKey}`,
        });

      // No trip → the #42 silent dispatch.
      if (reasons.length === 0) {
        dispatch();
        return reply.code(200).send({ status: 'dispatched', requested: targets });
      }

      // Trip → durable spend+lease approval (no timeout; Run stays `running`). Await
      // the operator: APPROVE dispatches (Step born), DENY emits nothing.
      const approvalId = randomUUID();
      const decision = await approvalBus.request({
        id: approvalId,
        session_id: runId,
        kind: 'permission',
        effectClass: 'spend',
        reason: reasons.join('; '),
        runId,
        stepKeys: targets,
        createdAt: Date.now(),
        status: 'pending',
      });

      if (decision.decision === 'approve' || decision.decision === 'modify') {
        dispatch();
        return reply.code(200).send({ status: 'dispatched', requested: targets });
      }
      return reply.code(200).send({ status: 'denied' });
    },
  );
}
