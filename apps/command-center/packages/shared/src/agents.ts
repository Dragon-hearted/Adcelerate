// ─────────────────────────────────────────────────────────────────────────────
// Agent schema + state machine — one descriptor per named SDK session.
// State transitions are orchestrator-owned and emitted as `cc.agent.state`.
// ─────────────────────────────────────────────────────────────────────────────

export type AgentRole =
  | 'architect' | 'backend' | 'frontend' | 'qa' | 'reviewer' | 'generalist';

export type AgentState =
  | 'idle' | 'starting' | 'running'
  | 'awaiting_approval' | 'awaiting_input'
  | 'compacting' | 'stopping' | 'done' | 'error';

export interface AgentDescriptor {
  session_id: string;
  name: string;                // unique, user-facing
  role: AgentRole;
  model: string;               // e.g. 'claude-opus-4-8'
  state: AgentState;
  cwd: string;
  startedAt: number;
  lastEventAt: number;
  totals: { input: number; output: number; cost_usd: number };
}

// Roster of valid roles (for pickers / validation).
export const AGENT_ROLES = [
  'architect', 'backend', 'frontend', 'qa', 'reviewer', 'generalist',
] as const satisfies readonly AgentRole[];

// Roster of valid states (for validation / replay reconstruction).
export const AGENT_STATES = [
  'idle', 'starting', 'running',
  'awaiting_approval', 'awaiting_input',
  'compacting', 'stopping', 'done', 'error',
] as const satisfies readonly AgentState[];

// Terminal states — an agent in one of these will emit no further events.
export const TERMINAL_AGENT_STATES = ['done', 'error'] as const satisfies readonly AgentState[];
