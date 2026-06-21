// ─────────────────────────────────────────────────────────────────────────────
// Row ⇄ contract mappers. The DB schema uses camelCase columns; the wire/shared
// contracts (CCEvent, AgentDescriptor, ApprovalRequest) use snake_case. These
// adapters are the single conversion point so every producer/consumer stays
// consistent. Reused by the EventBus, the WS gateway, and the REST routes.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  CCEvent,
  EventType,
  AgentDescriptor,
  AgentRole,
  AgentState,
  ApprovalRequest,
  ApprovalKind,
  ApprovalStatus,
} from '@command-center/shared';
import type {
  EventRow,
  NewEventRow,
  SessionRow,
  ApprovalRow,
} from './schema';

// ── events ────────────────────────────────────────────────────────────────────

export function eventToRow(e: CCEvent): NewEventRow {
  return {
    seq: e.seq,
    sourceApp: e.source_app,
    sessionId: e.session_id,
    agentName: e.agent_name ?? null,
    hookEventType: e.hook_event_type,
    payload: e.payload,
    toolName: e.tool_name ?? null,
    toolUseId: e.tool_use_id ?? null,
    parentToolUseId: e.parent_tool_use_id ?? null,
    summary: e.summary ?? null,
    modelName: e.model_name ?? null,
    costUsd: e.cost_usd ?? null,
    timestamp: e.timestamp,
  };
}

export function rowToEvent(r: EventRow): CCEvent {
  return {
    id: r.id,
    seq: r.seq,
    source_app: r.sourceApp,
    session_id: r.sessionId,
    agent_name: r.agentName ?? undefined,
    hook_event_type: r.hookEventType as EventType,
    payload: (r.payload ?? {}) as Record<string, unknown>,
    tool_name: r.toolName ?? undefined,
    tool_use_id: r.toolUseId ?? undefined,
    parent_tool_use_id: r.parentToolUseId ?? undefined,
    summary: r.summary ?? undefined,
    model_name: r.modelName ?? undefined,
    cost_usd: r.costUsd ?? undefined,
    timestamp: r.timestamp,
  };
}

// ── sessions ──────────────────────────────────────────────────────────────────

export function rowToDescriptor(r: SessionRow): AgentDescriptor {
  return {
    session_id: r.sessionId,
    name: r.name,
    role: r.role as AgentRole,
    model: r.model,
    state: r.state as AgentState,
    cwd: r.cwd,
    startedAt: r.startedAt,
    // `sessions` doesn't track a discrete last-event clock; endedAt (or startedAt
    // for a still-running agent) is a cheap, monotonic stand-in for the snapshot.
    lastEventAt: r.endedAt ?? r.startedAt,
    totals: {
      input: r.inputTokens,
      output: r.outputTokens,
      cost_usd: r.costUsd,
    },
  };
}

// ── approvals ─────────────────────────────────────────────────────────────────

export function rowToApprovalRequest(r: ApprovalRow): ApprovalRequest {
  return {
    id: r.id,
    session_id: r.sessionId,
    kind: r.kind as ApprovalKind,
    tool_name: r.toolName ?? undefined,
    tool_input: r.toolInput ?? undefined,
    question: r.question ?? undefined,
    choices: (r.choices as string[] | null) ?? undefined,
    createdAt: r.createdAt,
    status: r.status as ApprovalStatus,
  };
}
