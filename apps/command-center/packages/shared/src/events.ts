// ─────────────────────────────────────────────────────────────────────────────
// Event schema — the canonical, normalized event shape for the Command Center.
//
// Derived directly from the legacy `HookEvent` (apps/server/src/types.ts) so the
// data model stays compatible and `events.db` can be migrated. The orchestrator's
// SDKMessage → CCEvent normalizer maps onto the Claude Code hook event names so
// existing tooling / filters keep working.
// ─────────────────────────────────────────────────────────────────────────────

export type EventType =
  // Lifecycle (mapped onto Claude Code hook names for tooling compatibility)
  | 'SessionStart' | 'SessionEnd' | 'UserPromptSubmit'
  | 'PreToolUse' | 'PostToolUse' | 'PostToolUseFailure'
  | 'PermissionRequest' | 'Notification' | 'Stop'
  | 'SubagentStart' | 'SubagentStop' | 'PreCompact'
  // Command Center synthetic events
  | 'cc.prompt.submitted' | 'cc.approval.requested' | 'cc.approval.resolved'
  | 'cc.question.asked'   | 'cc.question.answered'
  | 'cc.file.changed'     | 'cc.command.executed'
  | 'cc.agent.state'      | 'cc.token.tick'
  | 'cc.agent.message'
  // Substrate Run/Step ingest (slice #31) — folded read-side into a Step Graph.
  | 'cc.run.started'      | 'cc.run.completed' | 'cc.step';

export interface CCEvent {
  id?: number;
  seq: number;                 // per-session monotonic ordinal (event sourcing / replay)
  source_app: string;          // 'command-center'
  session_id: string;          // agent session id
  agent_name?: string;         // 'architect' | 'backend' | ... (multi-agent attribution)
  hook_event_type: EventType;
  payload: Record<string, unknown>;
  // Convenience top-level columns (forwarded for cheap filtering — mirrors send_event.py)
  tool_name?: string;
  tool_use_id?: string;
  summary?: string;
  model_name?: string;
  cost_usd?: number;
  timestamp: number;           // epoch ms
}

// ─────────────────────────────────────────────────────────────────────────────
// FileChange — emitted by the repo watcher (cc.file.changed) and the
// `file:changed` Socket.IO event. Lives here (rather than github.ts) because a
// file change is a working-tree event, not a GitHub remote concept.
// ─────────────────────────────────────────────────────────────────────────────

export type FileChangeType = 'add' | 'modify' | 'delete';

export interface FileChange {
  path: string;                // repo-relative path
  changeType: FileChangeType;
  agentName?: string;          // attributed to the agent whose recent Write/Edit touched it
  sessionId?: string;
  additions?: number;
  deletions?: number;
  diff?: string;               // unified `git diff` for the path
  timestamp: number;           // epoch ms
}

// The 12 authoritative Claude Code hook event types (mirrors send_event.py).
// Useful for runtime validation / filter UIs.
export const HOOK_EVENT_TYPES = [
  'SessionStart', 'SessionEnd', 'UserPromptSubmit',
  'PreToolUse', 'PostToolUse', 'PostToolUseFailure',
  'PermissionRequest', 'Notification', 'Stop',
  'SubagentStart', 'SubagentStop', 'PreCompact',
] as const satisfies readonly EventType[];

// Command Center synthetic event types.
export const CC_SYNTHETIC_EVENT_TYPES = [
  'cc.prompt.submitted', 'cc.approval.requested', 'cc.approval.resolved',
  'cc.question.asked', 'cc.question.answered',
  'cc.file.changed', 'cc.command.executed',
  'cc.agent.state', 'cc.token.tick',
  'cc.agent.message',
  'cc.run.started', 'cc.run.completed', 'cc.step',
] as const satisfies readonly EventType[];

export const ALL_EVENT_TYPES = [
  ...HOOK_EVENT_TYPES,
  ...CC_SYNTHETIC_EVENT_TYPES,
] as const;
