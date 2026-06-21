// ─────────────────────────────────────────────────────────────────────────────
// Approval / question schema — derived from the legacy `HumanInTheLoop`
// (apps/server/src/types.ts). The orchestrator's ApprovalBus parks a promise
// keyed by `ApprovalRequest.id`; the UI resolves it with an `ApprovalDecision`.
// ─────────────────────────────────────────────────────────────────────────────

export type ApprovalKind = 'permission' | 'question' | 'choice';

export type ApprovalStatus =
  | 'pending' | 'approved' | 'denied' | 'modified' | 'answered' | 'timeout';

export interface ApprovalRequest {
  id: string;                  // uuid (bus key)
  session_id: string;
  agent_name?: string;
  kind: ApprovalKind;
  tool_name?: string;          // for permission requests
  tool_input?: unknown;        // editable for 'Modify'
  question?: string;           // for question/choice
  choices?: string[];
  suggestions?: unknown[];     // SDK canUseTool 'suggestions'
  createdAt: number;
  timeoutMs?: number;
  status: ApprovalStatus;
  // #43: effect-class + lease linkage. ALL optional → back-compat (existing
  // callers omit them). `effectClass`/`reason` ride INSIDE the cc.approval.requested
  // payload (no new EventType). `runId`/`stepKeys` link the durable approval to the
  // Canvas nodes it gates (overlay + ghost-node lineage).
  effectClass?: 'read' | 'spend' | 'irreversible';
  reason?: string;             // honest human text; NEVER a fabricated $ total (ADR-0009/0016)
  runId?: string;
  stepKeys?: string[];         // affected Canvas nodes (overlay linkage); plural for cascade
}

export interface ApprovalDecision {
  id: string;
  decision: 'approve' | 'deny' | 'modify' | 'answer';
  updatedInput?: unknown;      // 'modify' → new tool input
  answer?: string;             // 'answer' → question response
  respondedAt: number;
  respondedBy?: string;
}
