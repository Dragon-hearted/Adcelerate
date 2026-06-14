// ─────────────────────────────────────────────────────────────────────────────
// ApprovalBus — the in-process registry that PAUSES an agent until a human
// responds. `request(req)` parks a Promise keyed by req.id, persists the
// pending row, and broadcasts `approval:request` + a cc.approval.*/cc.question.*
// event. The promise resolves only when `respond(decision)` arrives from
// POST /api/approvals/:id/respond OR the `approval:respond` ws path — that
// resolution un-pauses the agent (the canUseTool / ask_human callback returns).
//
// This is the native, in-process realization of the brief's "pause execution
// until response" requirement — no WebSocket-callback hack.
// ─────────────────────────────────────────────────────────────────────────────

import { eq } from 'drizzle-orm';
import type {
  ApprovalRequest,
  ApprovalDecision,
  ApprovalStatus,
  ApprovalResolvedPayload,
  EventType,
} from '@command-center/shared';
import { db } from '../db/client';
import { approvals } from '../db/schema';
import { eventBus } from './event-bus';

interface PendingEntry {
  req: ApprovalRequest;
  resolve: (decision: ApprovalDecision) => void;
  timer?: ReturnType<typeof setTimeout>;
}

function statusForDecision(decision: ApprovalDecision['decision']): ApprovalStatus {
  switch (decision) {
    case 'approve':
      return 'approved';
    case 'deny':
      return 'denied';
    case 'modify':
      return 'modified';
    case 'answer':
      return 'answered';
  }
}

function notFound(id: string): Error {
  return Object.assign(new Error(`Approval not found or already resolved: ${id}`), {
    statusCode: 404,
  });
}

class ApprovalBus {
  private readonly pending = new Map<string, PendingEntry>();

  /** Park a promise until the operator responds. Resolves the agent's gate. */
  request(req: ApprovalRequest): Promise<ApprovalDecision> {
    return new Promise<ApprovalDecision>((resolve) => {
      const entry: PendingEntry = { req, resolve };
      if (req.timeoutMs && req.timeoutMs > 0) {
        entry.timer = setTimeout(() => this.resolveTimeout(req.id), req.timeoutMs);
      }
      this.pending.set(req.id, entry);

      this.persistPending(req);
      // Broadcast to the UI + persist a normalized lifecycle event.
      eventBus.emitApprovalRequest(req);
      eventBus.emit({
        session_id: req.session_id,
        agent_name: req.agent_name,
        hook_event_type: requestedEventType(req),
        tool_name: req.tool_name,
        summary: requestSummary(req),
        payload: { approval: req },
      });
    });
  }

  /** Resolve a parked approval/question. Throws 404 if unknown (REST → 404). */
  respond(decision: ApprovalDecision): ApprovalStatus {
    const entry = this.pending.get(decision.id);
    if (!entry) throw notFound(decision.id);
    this.pending.delete(decision.id);
    if (entry.timer) clearTimeout(entry.timer);

    const status = statusForDecision(decision.decision);
    this.persistDecision(decision, status);
    this.broadcastResolved(entry.req, decision, status);
    entry.resolve(decision);
    return status;
  }

  /** Currently-parked requests (for snapshots / diagnostics). */
  list(): ApprovalRequest[] {
    return [...this.pending.values()].map((e) => e.req);
  }

  has(id: string): boolean {
    return this.pending.has(id);
  }

  // ── timeout path: auto-deny permission / cancel question ────────────────────
  private resolveTimeout(id: string): void {
    const entry = this.pending.get(id);
    if (!entry) return;
    this.pending.delete(id);
    const decision: ApprovalDecision = {
      id,
      decision: entry.req.kind === 'permission' ? 'deny' : 'answer',
      answer: entry.req.kind === 'permission' ? undefined : '',
      respondedAt: Date.now(),
      respondedBy: 'system(timeout)',
    };
    this.persistStatus(id, 'timeout', decision);
    this.broadcastResolved(entry.req, decision, 'timeout');
    entry.resolve(decision);
  }

  // ── persistence ─────────────────────────────────────────────────────────────
  private persistPending(req: ApprovalRequest): void {
    try {
      db.insert(approvals)
        .values({
          id: req.id,
          sessionId: req.session_id,
          kind: req.kind,
          toolName: req.tool_name ?? null,
          toolInput: (req.tool_input as unknown) ?? null,
          question: req.question ?? null,
          choices: (req.choices as unknown) ?? null,
          status: 'pending',
          decision: null,
          createdAt: req.createdAt,
          respondedAt: null,
        })
        .run();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[approval-bus] persist pending failed:', err);
    }
  }

  private persistDecision(decision: ApprovalDecision, status: ApprovalStatus): void {
    this.persistStatus(decision.id, status, decision);
  }

  private persistStatus(id: string, status: ApprovalStatus, decision: ApprovalDecision): void {
    try {
      db.update(approvals)
        .set({ status, decision: decision as unknown, respondedAt: decision.respondedAt })
        .where(eq(approvals.id, id))
        .run();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[approval-bus] persist decision failed:', err);
    }
  }

  // ── resolution broadcast ────────────────────────────────────────────────────
  private broadcastResolved(
    req: ApprovalRequest,
    decision: ApprovalDecision,
    status: ApprovalStatus,
  ): void {
    const payload: ApprovalResolvedPayload = { ...decision, status };
    eventBus.emitApprovalResolved(payload);
    eventBus.emit({
      session_id: req.session_id,
      agent_name: req.agent_name,
      hook_event_type: resolvedEventType(req),
      tool_name: req.tool_name,
      summary: `${req.kind} ${status}`,
      payload: { approval: req, decision, status },
    });
  }
}

function requestedEventType(req: ApprovalRequest): EventType {
  return req.kind === 'permission' ? 'cc.approval.requested' : 'cc.question.asked';
}

function resolvedEventType(req: ApprovalRequest): EventType {
  return req.kind === 'permission' ? 'cc.approval.resolved' : 'cc.question.answered';
}

function requestSummary(req: ApprovalRequest): string {
  if (req.kind === 'permission') return `approve ${req.tool_name ?? 'tool'}?`;
  return req.question ?? 'question';
}

// Singleton — one bus per process.
export const approvalBus = new ApprovalBus();
