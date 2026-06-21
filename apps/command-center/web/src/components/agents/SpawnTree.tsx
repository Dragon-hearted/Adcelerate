'use client';

import { useMemo, useState } from 'react';
import type { AgentState, SpawnTreeNode } from '@command-center/shared';
import { useStore } from '@/store/useStore';
import { selectSpawnTree } from '@/store/selectors';
import { agentStateMeta } from '@/lib/agent-state';
import { Badge } from '@/components/ui/badge';
import { formatCost, formatDuration, formatTokens } from '@/lib/format';

/**
 * Left-zone Spawn Tree (ADR-0004 — a PLAIN nested/collapsible React component, NOT
 * React Flow): session(agent) → `Task` sub-agent → tool-call hierarchy. Each row
 * shows name + state, runtime, and — at the agent (Run) grain — tokens + cost.
 * Parents read as the sum of their children via the `rollup`.
 *
 * Pure projection of the already-live store slices, so the tree grows in real time
 * with no new endpoint — `event`/`agent:state`/`token:tick` broadcasts already feed
 * `sessions`/`events`/`tokensBySession`.
 */
export function SpawnTree() {
  const sessions = useStore((s) => s.sessions);
  const events = useStore((s) => s.events);
  const tokens = useStore((s) => s.tokensBySession);

  // ponytail: re-snapshot Date.now() whenever a slice changes (token:tick is
  // frequent), so an open tool's runtime advances live without a separate ticker.
  const tree = useMemo(
    () => selectSpawnTree(sessions, events, tokens),
    [sessions, events, tokens],
  );

  // Collapsed-by-id set (default = everything expanded). A small useState map keeps
  // this a plain component — no graph lib, no <details> per-node state plumbing.
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <section className="flex flex-col">
      <h2 className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Spawn Tree · {tree.length}
      </h2>
      {tree.length === 0 ? (
        <p className="px-3 py-4 text-xs text-muted-foreground">No active sessions.</p>
      ) : (
        <div className="divide-y divide-border/60">
          {tree.map((node) => (
            <SpawnTreeRow
              key={node.id}
              node={node}
              depth={0}
              collapsed={collapsed}
              toggle={toggle}
            />
          ))}
        </div>
      )}
    </section>
  );
}

interface RowProps {
  node: SpawnTreeNode;
  depth: number;
  collapsed: Set<string>;
  toggle: (id: string) => void;
}

function SpawnTreeRow({ node, depth, collapsed, toggle }: RowProps) {
  const hasChildren = node.children.length > 0;
  const isCollapsed = collapsed.has(node.id);
  // SpawnTreeNode.state is a plain string at the contract grain; at the agent node
  // it is an AgentState fed straight from the session descriptor.
  const meta =
    node.kind === 'agent' && node.state ? agentStateMeta(node.state as AgentState) : null;

  // Parents read as the sum of their children; leaves show their own runtime.
  const runtimeMs = hasChildren ? node.rollup.runtimeMs : node.runtimeMs;
  // ponytail: tokens/cost are session-grain (SDK reports usage per session, not per
  // tool/sub-agent) → surfaced only at the agent (Run) node. rollup == own there.
  const showMetrics = node.kind === 'agent';
  const tokensTotal = node.rollup.tokens.input + node.rollup.tokens.output;

  return (
    <div>
      <div
        className="flex items-center gap-2 px-3 py-1.5 hover:bg-accent/40"
        style={{ paddingLeft: 12 + depth * 14 }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => toggle(node.id)}
            className="flex h-4 w-4 shrink-0 items-center justify-center text-[10px] text-muted-foreground hover:text-foreground"
            aria-label={isCollapsed ? 'Expand' : 'Collapse'}
            aria-expanded={!isCollapsed}
          >
            {isCollapsed ? '▸' : '▾'}
          </button>
        ) : (
          <span className="inline-block h-4 w-4 shrink-0" aria-hidden />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-medium">{node.name}</span>
            {meta ? (
              <Badge variant={meta.variant}>{meta.label}</Badge>
            ) : (
              <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                {node.kind}
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="font-mono">{formatDuration(runtimeMs)}</span>
            {showMetrics ? (
              <span className="font-mono">
                {formatTokens(tokensTotal)} tok · {formatCost(node.rollup.costUsd)}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {hasChildren && !isCollapsed
        ? node.children.map((child) => (
            <SpawnTreeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              collapsed={collapsed}
              toggle={toggle}
            />
          ))
        : null}
    </div>
  );
}
