// ─────────────────────────────────────────────────────────────────────────────
// AgentStateMachine — the orchestrator-owned lifecycle for one agent session.
//
//  idle ─start─▶ starting ─ready─▶ running ──┬─tool needs approval─▶ awaiting_approval ─┐
//                                            ├─ask_human───────────▶ awaiting_input ────┤
//                                            ├─compaction──────────▶ compacting ────────┤
//                                            └─────────────◀────────────────────────────┘
//  running/…/* ─stop/Stop─▶ stopping ─▶ done        any ─error─▶ error
//
// Each accepted transition fires `onChange(from, to)`; the AgentSession wires
// that to persist `sessions.state` + emit `cc.agent.state` / `agent:state`.
// `stopping` and `error` are reachable from anywhere (a query can blow up or be
// interrupted at any point).
// ─────────────────────────────────────────────────────────────────────────────

import type { AgentState } from '@command-center/shared';

export const LEGAL_TRANSITIONS: Record<AgentState, AgentState[]> = {
  idle: ['starting'],
  starting: ['running'],
  running: ['awaiting_approval', 'awaiting_input', 'compacting', 'done'],
  awaiting_approval: ['running'],
  awaiting_input: ['running'],
  compacting: ['running'],
  stopping: ['done'],
  done: [],
  error: [],
};

export function canTransition(from: AgentState, to: AgentState): boolean {
  // `stopping` and `error` are always reachable (interrupt / crash).
  if (to === 'stopping' || to === 'error') return true;
  return LEGAL_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isTerminal(state: AgentState): boolean {
  return state === 'done' || state === 'error';
}

export class AgentStateMachine {
  private _state: AgentState;

  constructor(
    private readonly onChange: (from: AgentState, to: AgentState) => void,
    initial: AgentState = 'idle',
  ) {
    this._state = initial;
  }

  get state(): AgentState {
    return this._state;
  }

  /**
   * Attempt a transition. Returns true if it occurred. Illegal transitions are
   * ignored (and reported false) rather than thrown — the loop must stay robust
   * against out-of-order SDK signals. `force` bypasses the legality check.
   */
  to(next: AgentState, opts?: { force?: boolean }): boolean {
    if (next === this._state) return false;
    if (!opts?.force && !canTransition(this._state, next)) return false;
    const from = this._state;
    this._state = next;
    this.onChange(from, next);
    return true;
  }
}
