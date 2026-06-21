// ─────────────────────────────────────────────────────────────────────────────
// Spawn Tree — the read-side projection of agent execution as a nested hierarchy:
//   session(agent) → `Task`/`Agent` tool_use (sub-agent) → nested tool_uses (tool)
//
// A PURE, ORDER-INDEPENDENT fold (mirrors `projectStepGraph`/`projectBoard`):
//  - ROOTS are the agent sessions (one `agent` node each).
//  - Tool events nest by `parent_tool_use_id` — a tool whose parent matches another
//    tool_use's id becomes its child; top-level tool_uses are children of the session.
//  - `runtimeMs` pairs PreToolUse (start) with PostToolUse (end) by `tool_use_id`;
//    an open tool (no Post yet) runs to the passed `now`.
//  - `rollup` = the node's OWN metric PLUS the sum of every descendant's.
//
// No Date.now(), no I/O — `now` is passed so the projection is byte-stable under a
// shuffled event log.
// ─────────────────────────────────────────────────────────────────────────────

import type { AgentDescriptor } from './agents';
import { TERMINAL_AGENT_STATES } from './agents';
import type { CCEvent } from './events';

export interface SpawnTreeNode {
  id: string;
  kind: 'agent' | 'subagent' | 'tool';
  name: string;
  state?: string;
  startedAt: number;
  endedAt?: number;
  runtimeMs: number;
  // ponytail: tokens/cost are SESSION-grain only — the SDK reports usage per
  // session, not per tool/sub-agent (an SDK limitation). They are carried at the
  // `agent` (Run) node; sub/tool nodes contribute 0. `runtimeMs` is the genuinely
  // per-node metric (PreToolUse→PostToolUse span).
  tokens?: { input: number; output: number };
  costUsd?: number;
  children: SpawnTreeNode[];
  // OWN metric + Σ of every descendant's. runtime sums at every grain; tokens/cost
  // sum the session-grain values (0 below the agent node).
  rollup: { runtimeMs: number; tokens: { input: number; output: number }; costUsd: number };
}

const TERMINAL = new Set<string>(TERMINAL_AGENT_STATES);

// A tool_use whose tool name is one of these spawns a sub-agent (vs a plain tool).
const SUBAGENT_TOOLS = new Set(['Task', 'Agent']);

// Mutable accumulator while folding — `children` filled in the nesting pass.
interface ToolAcc {
  id: string;
  kind: 'subagent' | 'tool';
  name: string;
  parent: string | null;
  startedAt: number;
  endedAt?: number;
  children: ToolAcc[];
}

/** Deterministic sibling order: by startedAt, tiebreak id. */
function sortNodes(nodes: SpawnTreeNode[]): void {
  nodes.sort((a, b) =>
    a.startedAt !== b.startedAt ? a.startedAt - b.startedAt : a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
  );
}

/** Materialize a ToolAcc subtree → SpawnTreeNode, computing per-node runtime + rollup. */
function materialize(acc: ToolAcc, now: number): SpawnTreeNode {
  const children = acc.children.map((c) => materialize(c, now));
  sortNodes(children);

  const runtimeMs = (acc.endedAt ?? now) - acc.startedAt;
  // Tokens/cost are session-grain only → 0 at sub/tool grain.
  const rollup = {
    runtimeMs: runtimeMs + children.reduce((s, c) => s + c.rollup.runtimeMs, 0),
    tokens: {
      input: children.reduce((s, c) => s + c.rollup.tokens.input, 0),
      output: children.reduce((s, c) => s + c.rollup.tokens.output, 0),
    },
    costUsd: children.reduce((s, c) => s + c.rollup.costUsd, 0),
  };

  return {
    id: acc.id,
    kind: acc.kind,
    name: acc.name,
    startedAt: acc.startedAt,
    endedAt: acc.endedAt,
    runtimeMs,
    children,
    rollup,
  };
}

/**
 * PURE, ORDER-INDEPENDENT fold: sessions + events + tokens → a forest of Spawn
 * Trees (one `agent` root per session). Within a session, tool events are grouped
 * by `tool_use_id` into nodes (a `Task`/`Agent` tool → `subagent`, others → `tool`)
 * and nested by `parent_tool_use_id`. Runtime pairs PreToolUse/PostToolUse; an open
 * tool runs to `now`. `rollup` sums each node's own metric + all its descendants'.
 * Children are sorted by (startedAt, id) so the projection is byte-stable.
 */
export function projectSpawnTree(
  sessions: AgentDescriptor[],
  events: CCEvent[],
  tokens: Record<string, { input: number; output: number; cost_usd: number }>,
  now: number,
): SpawnTreeNode[] {
  const sessionIds = new Set(sessions.map((s) => s.session_id));

  // Group tool events by session → tool_use_id. Pre supplies the start, Post the
  // end; either may carry name/parent (order-independent — last non-empty wins).
  const toolsBySession = new Map<string, Map<string, ToolAcc>>();

  for (const ev of events) {
    if (ev.hook_event_type !== 'PreToolUse' && ev.hook_event_type !== 'PostToolUse') continue;
    const sid = ev.session_id;
    if (!sessionIds.has(sid)) continue; // tool with no known session root → skip
    const tuid = ev.tool_use_id;
    if (!tuid) continue;

    let byTool = toolsBySession.get(sid);
    if (!byTool) {
      byTool = new Map<string, ToolAcc>();
      toolsBySession.set(sid, byTool);
    }
    let acc = byTool.get(tuid);
    if (!acc) {
      acc = { id: tuid, kind: 'tool', name: tuid, parent: null, startedAt: now, children: [] };
      byTool.set(tuid, acc);
    }

    if (ev.tool_name) {
      acc.name = ev.tool_name;
      acc.kind = SUBAGENT_TOOLS.has(ev.tool_name) ? 'subagent' : 'tool';
    }
    if (ev.parent_tool_use_id != null) acc.parent = ev.parent_tool_use_id;

    if (ev.hook_event_type === 'PreToolUse') acc.startedAt = ev.timestamp;
    else acc.endedAt = ev.timestamp; // PostToolUse
  }

  const roots: SpawnTreeNode[] = sessions.map((s) => {
    const byTool = toolsBySession.get(s.session_id) ?? new Map<string, ToolAcc>();

    // Nest tool accs by parent_tool_use_id. A parent matching another tool in the
    // SAME session → child of it; null/absent/dangling parent → session top-level.
    const topLevel: ToolAcc[] = [];
    for (const acc of byTool.values()) {
      const parent = acc.parent != null ? byTool.get(acc.parent) : undefined;
      if (parent) parent.children.push(acc);
      else topLevel.push(acc);
    }

    const children = topLevel.map((acc) => materialize(acc, now));
    sortNodes(children);

    // Session runtime = (endedAt ?? now) - startedAt. endedAt is defined only once
    // the agent reaches a terminal state (lastEventAt is then the end).
    const ended = TERMINAL.has(s.state) ? s.lastEventAt : undefined;
    const runtimeMs = (ended ?? now) - s.startedAt;

    const tok = tokens[s.session_id];
    const ownTokens = { input: tok?.input ?? 0, output: tok?.output ?? 0 };
    const ownCost = tok?.cost_usd ?? 0;

    const rollup = {
      runtimeMs: runtimeMs + children.reduce((acc, c) => acc + c.rollup.runtimeMs, 0),
      tokens: {
        input: ownTokens.input + children.reduce((acc, c) => acc + c.rollup.tokens.input, 0),
        output: ownTokens.output + children.reduce((acc, c) => acc + c.rollup.tokens.output, 0),
      },
      costUsd: ownCost + children.reduce((acc, c) => acc + c.rollup.costUsd, 0),
    };

    return {
      id: s.session_id,
      kind: 'agent' as const,
      name: s.name,
      state: s.state,
      startedAt: s.startedAt,
      endedAt: ended,
      runtimeMs,
      tokens: ownTokens,
      costUsd: ownCost,
      children,
      rollup,
    };
  });

  sortNodes(roots);
  return roots;
}
