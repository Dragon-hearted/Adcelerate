'use client';

import { useEffect, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { RunStatus, StepGraph } from '@command-center/shared';
import { useStore } from '@/store/useStore';
import { api } from '@/lib/api';
import { StepNode, type StepNodeData } from './StepNode';

// Stable nodeTypes reference (React Flow warns on inline object identity churn).
const nodeTypes = { step: StepNode };

// Non-binary run status (#32 / ADR-0014). `completed-with-failures` surfaces as a
// distinct "partial" badge — succeeded / partial / failed / cancelled, not binary.
const RUN_STATUS_BADGE: Record<RunStatus, { label: string; className: string }> = {
  'completed': { label: 'completed', className: 'border-emerald-500 bg-emerald-500/15 text-emerald-300' },
  'completed-with-failures': { label: 'partial', className: 'border-amber-500 bg-amber-500/15 text-amber-300' },
  'failed': { label: 'failed', className: 'border-red-500 bg-red-500/15 text-red-300' },
  'cancelled': { label: 'cancelled', className: 'border-border bg-muted/40 text-muted-foreground' },
};

function RunStatusBadge({ status }: { status?: RunStatus }) {
  if (!status) return null;
  const b = RUN_STATUS_BADGE[status];
  return (
    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wide ${b.className}`}>
      {b.label}
    </span>
  );
}

// Left→right layout by topological depth. The substrate fold emits a linear
// first-seen chain today, so depth = longest path from a source — no layout dep
// needed for a chain (ponytail; dagre/elkjs can slot in here if branches land).
const COL = 220;
const ROW = 90;

function layout(graph: StepGraph): { nodes: Node[]; edges: Edge[] } {
  const adjacency = new Map<string, string[]>();
  const indegree = new Map<string, number>();
  for (const n of graph.nodes) indegree.set(n.stepKey, 0);
  for (const e of graph.edges) {
    adjacency.set(e.from, [...(adjacency.get(e.from) ?? []), e.to]);
    indegree.set(e.to, (indegree.get(e.to) ?? 0) + 1);
  }

  // Longest-path depth via Kahn-style relaxation (graph is a DAG by construction).
  const depth = new Map<string, number>();
  const queue = graph.nodes.filter((n) => (indegree.get(n.stepKey) ?? 0) === 0).map((n) => n.stepKey);
  for (const k of queue) depth.set(k, 0);
  const remaining = new Map(indegree);
  while (queue.length) {
    const k = queue.shift()!;
    const d = depth.get(k) ?? 0;
    for (const next of adjacency.get(k) ?? []) {
      depth.set(next, Math.max(depth.get(next) ?? 0, d + 1));
      remaining.set(next, (remaining.get(next) ?? 0) - 1);
      if ((remaining.get(next) ?? 0) === 0) queue.push(next);
    }
  }

  // Stack nodes that share a depth column vertically.
  const rowByDepth = new Map<number, number>();
  const nodes: Node[] = graph.nodes.map((n) => {
    const col = depth.get(n.stepKey) ?? 0;
    const row = rowByDepth.get(col) ?? 0;
    rowByDepth.set(col, row + 1);
    const data: StepNodeData = {
      stage: n.stage,
      stepKey: n.stepKey,
      state: n.state,
      hasArtifact: Boolean(n.artifact),
      malformed: n.malformed,
    };
    return {
      id: n.stepKey,
      type: 'step',
      position: { x: col * COL, y: row * ROW },
      data,
    };
  });

  const edges: Edge[] = graph.edges.map((e) => ({
    id: `${e.from}->${e.to}`,
    source: e.from,
    target: e.to,
    animated: true,
  }));

  return { nodes, edges };
}

/**
 * The Console Canvas — a React Flow view of one Run's Step Graph. Hydrates the
 * selected run from `GET /api/runs/:runId/graph` on mount, then re-renders live
 * as `step-graph:update` broadcasts replace the store's graph for that run.
 */
export function Canvas() {
  const selectedRunId = useStore((s) => s.selectedRunId);
  const stepGraphs = useStore((s) => s.stepGraphs);
  const runIds = useMemo(() => Object.keys(stepGraphs), [stepGraphs]);
  const graph = selectedRunId ? stepGraphs[selectedRunId] : undefined;

  // One-shot hydration when a run is selected but not yet in the store (e.g. the
  // page loaded after the run started). Live updates take over from there.
  useEffect(() => {
    if (!selectedRunId || stepGraphs[selectedRunId]) return;
    let cancelled = false;
    api
      .getRunGraph(selectedRunId)
      .then((g) => {
        if (!cancelled && g.runId) useStore.getState().upsertStepGraph(g);
      })
      .catch(() => {/* fire-and-forget; live broadcast will fill in */});
    return () => {
      cancelled = true;
    };
  }, [selectedRunId, stepGraphs]);

  const flow = useMemo(() => (graph ? layout(graph) : { nodes: [], edges: [] }), [graph]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Run Canvas
          </h2>
          <RunStatusBadge status={graph?.status} />
        </div>
        {runIds.length > 0 ? (
          <select
            value={selectedRunId ?? ''}
            onChange={(e) => useStore.getState().selectRun(e.target.value)}
            className="rounded border border-border bg-card px-2 py-0.5 font-mono text-xs text-muted-foreground"
          >
            {runIds.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      <div className="relative min-h-0 flex-1">
        {graph && flow.nodes.length > 0 ? (
          <ReactFlow
            nodes={flow.nodes}
            edges={flow.edges}
            nodeTypes={nodeTypes}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background />
            <Controls showInteractive={false} />
          </ReactFlow>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Waiting for a Run… launch an image-engine generation to see steps appear.
          </div>
        )}
      </div>
    </div>
  );
}
