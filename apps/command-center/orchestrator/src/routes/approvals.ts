// ─────────────────────────────────────────────────────────────────────────────
// /api/approvals — approval / question lifecycle.
//
// SKELETON (task #2): listing pending approvals works against persisted state
// now. The respond path delegates to an `ApprovalResponder` that the approval
// engine (#4) registers via `setApprovalResponder` — it resolves the parked
// `canUseTool` / `ask_human` promise. Until then it answers 503.
// ─────────────────────────────────────────────────────────────────────────────

import type { FastifyInstance } from 'fastify';
import { desc, eq } from 'drizzle-orm';
import type { ApprovalDecision, ApprovalStatus } from '@command-center/shared';
import { db } from '../db/client';
import { approvals } from '../db/schema';
import { rowToApprovalRequest } from '../db/mappers';

/** Implemented by the ApprovalBus in task #4. Returns the resolved status. */
export interface ApprovalResponder {
  respond(decision: ApprovalDecision): Promise<ApprovalStatus> | ApprovalStatus;
}

let responder: ApprovalResponder | null = null;

export function setApprovalResponder(next: ApprovalResponder | null): void {
  responder = next;
}

export async function approvalRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/approvals?status=pending — outstanding approvals / questions.
  app.get<{ Querystring: { status?: string } }>('/api/approvals', async (req) => {
    const status = req.query.status;
    const base = db.select().from(approvals);
    const rows = status
      ? base.where(eq(approvals.status, status)).orderBy(desc(approvals.createdAt)).all()
      : base.orderBy(desc(approvals.createdAt)).all();
    return rows.map(rowToApprovalRequest);
  });

  // POST /api/approvals/:id/respond — resolve a parked approval/question. (wired in #4)
  app.post<{ Params: { id: string }; Body: Partial<ApprovalDecision> }>(
    '/api/approvals/:id/respond',
    async (req, reply) => {
      const { id } = req.params;
      const body = req.body ?? {};
      if (!body.decision) {
        return reply.code(400).send({ error: 'decision is required' });
      }
      if (!responder) {
        return reply.code(503).send({ error: 'Approval engine not yet available' });
      }
      const decision: ApprovalDecision = {
        id,
        decision: body.decision,
        updatedInput: body.updatedInput,
        answer: body.answer,
        respondedAt: body.respondedAt ?? Date.now(),
        respondedBy: body.respondedBy,
      };
      const status = await responder.respond(decision);
      return reply.send({ ...decision, status });
    },
  );
}
