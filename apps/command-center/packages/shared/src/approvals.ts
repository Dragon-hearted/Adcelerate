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
}

export interface ApprovalDecision {
  id: string;
  decision: 'approve' | 'deny' | 'modify' | 'answer';
  updatedInput?: unknown;      // 'modify' → new tool input
  answer?: string;             // 'answer' → question response
  respondedAt: number;
  respondedBy?: string;
}
