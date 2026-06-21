'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { blockedUpstreamStepKeys } from '@command-center/shared';
import type { BoardSlot, BranchProjection, RunStatus, StepGraph } from '@command-center/shared';
import { useStore } from '@/store/useStore';
import { api, type BoardListItem } from '@/lib/api';
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

// Left→right layout by topological depth over the declared-dependency DAG (#34).
// depth = longest path from a source; a no-deps run has no edges and all nodes
// sit at depth 0 (ponytail; dagre/elkjs can slot in here if the DAG gets dense).
const COL = 220;
const ROW = 90;

function layout(graph: StepGraph, branchProj?: BranchProjection): { nodes: Node[]; edges: Edge[] } {
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

  // #42: DERIVED render-time view state — queued nodes with a transitive failed
  // upstream. Pure (emits nothing, ADR-0009/0016 §4); restyles the node, never hides.
  const blocked = blockedUpstreamStepKeys(graph);

  // Stack nodes that share a depth column vertically.
  const rowByDepth = new Map<number, number>();
  const nodes: Node[] = graph.nodes.map((n) => {
    const col = depth.get(n.stepKey) ?? 0;
    const row = rowByDepth.get(col) ?? 0;
    rowByDepth.set(col, row + 1);
    // #41: the editing surface — DERIVED stale/orphaned overlays ride the StepGraph
    // node (stamped by the orchestrator re-projection); lineage (branches +
    // activeBranchId) comes from the BranchProjection slice. Both feed StepNode.
    const lineage = branchProj?.steps[n.stepKey];
    const data: StepNodeData = {
      stage: n.stage,
      stepKey: n.stepKey,
      state: n.state,
      hasArtifact: Boolean(n.artifact),
      // #34: thread the snapshotted artifact url + mime onto the node so StepNode
      // can render a thumbnail (url may be relative-snapshot or degraded-absolute).
      artifactUrl: n.artifact?.url,
      artifactMimeType: n.artifact?.mimeType,
      malformed: n.malformed,
      stale: n.stale,
      orphaned: n.orphaned,
      // #42: derived "blocked: upstream failed" view state (not a wire lifecycle).
      blockedUpstream: blocked.has(n.stepKey),
      runId: graph.runId,
      branches: lineage?.branches,
      activeBranchId: lineage?.activeBranchId,
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

const selectCls =
  'rounded border border-border bg-card px-2 py-0.5 font-mono text-xs text-muted-foreground';

// One Board position: the LATEST Run's StepGraph with a "N runs" badge and a flip
// control to cycle the stack. ponytail: NOT a 2D multi-graph board canvas — one
// slot's graph shown at a time with a slot list + stack flip; the rich 2D board is
// deferred to later fidelity slices.
function SlotRow({ slot }: { slot: BoardSlot }) {
  const [idx, setIdx] = useState(0);
  const i = slot.runs.length ? idx % slot.runs.length : 0;
  const graph = slot.runs[i];
  // #41: pull this Run's Branch lineage so the slot's Canvas gets fork/active-branch
  // controls + overlays. Subscribed per-runId so only the shown run re-renders.
  const branchProj = useStore((s) => (graph ? s.branchProjections[graph.runId] : undefined));
  const flow = useMemo(
    () => (graph ? layout(graph, branchProj) : { nodes: [], edges: [] }),
    [graph, branchProj],
  );

  return (
    <div className="flex min-h-[14rem] flex-col border-b border-border">
      <div className="flex items-center justify-between bg-card/40 px-3 py-1.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-foreground">{slot.slotId}</span>
          <span className="font-mono text-[10px] text-muted-foreground">
            {slot.producerSystem}
          </span>
          <RunStatusBadge status={graph?.status} />
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
            {slot.runs.length} {slot.runs.length === 1 ? 'run' : 'runs'}
          </span>
          {slot.runs.length > 1 ? (
            <button
              type="button"
              onClick={() => setIdx((p) => p + 1)}
              className={`${selectCls} hover:text-foreground`}
              title="Cycle the stacked runs"
            >
              {i + 1}/{slot.runs.length} ›
            </button>
          ) : null}
        </div>
      </div>
      <div className="relative min-h-0 flex-1">
        {graph && flow.nodes.length > 0 ? (
          <ReactFlow
            nodes={flow.nodes}
            edges={flow.edges}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.2}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
          >
            <Background />
            <Controls showInteractive={false} />
          </ReactFlow>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            No steps yet for this slot.
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * The Console Canvas — a React Flow view of one Run's Step Graph, or a Board's slot
 * projection (slice #36). Hydrates the selected run from `GET /api/runs/:runId/graph`;
 * a Board is restored from `localStorage` + `GET /api/boards/:id` on mount and kept
 * live via the `board:update` broadcast. No board selected → single-Run behavior.
 */
export function Canvas() {
  const selectedRunId = useStore((s) => s.selectedRunId);
  const stepGraphs = useStore((s) => s.stepGraphs);
  const selectedBoardId = useStore((s) => s.selectedBoardId);
  const boards = useStore((s) => s.boards);
  const runIds = useMemo(() => Object.keys(stepGraphs), [stepGraphs]);
  const graph = selectedRunId ? stepGraphs[selectedRunId] : undefined;
  const board = selectedBoardId ? boards[selectedBoardId] : undefined;
  // #41: the selected Run's Branch lineage feeds the editing controls + overlays.
  const branchProj = useStore((s) => (selectedRunId ? s.branchProjections[selectedRunId] : undefined));

  // Available boards for the selector / open-into-Board target.
  const [boardList, setBoardList] = useState<BoardListItem[]>([]);
  // open-into-Board mini-form.
  const [opening, setOpening] = useState(false);
  const [openTarget, setOpenTarget] = useState(''); // boardId or '__new__'
  const [openSlot, setOpenSlot] = useState('');
  const [newTitle, setNewTitle] = useState('');

  const refreshBoards = () =>
    api.listBoards().then(setBoardList).catch(() => {/* fire-and-forget */});

  // Fetch the board list on mount.
  useEffect(() => {
    refreshBoards();
  }, []);

  // Restore on mount: read the persisted selection and re-fetch its projection so
  // closing/reopening the Console restores the same Canvas. Mirrors run hydration.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem('console.selectedBoardId');
    if (!saved) return;
    let cancelled = false;
    api
      .getBoard(saved)
      .then((b) => {
        if (!cancelled && b.boardId) {
          useStore.getState().upsertBoard(b);
          useStore.getState().selectBoard(b.boardId);
        }
      })
      .catch(() => {/* board gone — leave selection unset */});
    return () => {
      cancelled = true;
    };
  }, []);

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

  // #41: one-shot Branch-projection hydration when a run is selected but its lineage
  // isn't in the store yet (page loaded mid-run). Live `branch:update` takes over.
  useEffect(() => {
    if (!selectedRunId || branchProj) return;
    let cancelled = false;
    api
      .getBranches(selectedRunId)
      .then((p) => {
        if (!cancelled && p.runId) useStore.getState().upsertBranchProjection(p);
      })
      .catch(() => {/* fire-and-forget; live broadcast will fill in */});
    return () => {
      cancelled = true;
    };
  }, [selectedRunId, branchProj]);

  const flow = useMemo(
    () => (graph ? layout(graph, branchProj) : { nodes: [], edges: [] }),
    [graph, branchProj],
  );

  function onSelectBoard(value: string) {
    if (!value) {
      // Deselect → back to single-Run view; clear the persisted restore key.
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('console.selectedBoardId');
      }
      useStore.setState({ selectedBoardId: null });
      return;
    }
    useStore.getState().selectBoard(value);
    if (!boards[value]) {
      api
        .getBoard(value)
        .then((b) => useStore.getState().upsertBoard(b))
        .catch(() => {/* live broadcast will fill in */});
    }
  }

  async function handleOpenIntoBoard() {
    if (!selectedRunId) return;
    let boardId = openTarget;
    if (openTarget === '__new__') {
      const { id } = await api.createBoard(newTitle || undefined);
      boardId = id;
    }
    if (!boardId) return;
    const proj = await api.openIntoBoard(boardId, selectedRunId, openSlot || undefined);
    useStore.getState().upsertBoard(proj);
    useStore.getState().selectBoard(boardId);
    refreshBoards();
    setOpening(false);
    setOpenTarget('');
    setOpenSlot('');
    setNewTitle('');
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {board ? 'Board' : 'Run Canvas'}
          </h2>
          {board ? (
            <span className="font-mono text-xs text-foreground">{board.title}</span>
          ) : (
            <RunStatusBadge status={graph?.status} />
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Board selector (native) beside the Run selector. */}
          <select value={selectedBoardId ?? ''} onChange={(e) => onSelectBoard(e.target.value)} className={selectCls}>
            <option value="">— Run view —</option>
            {boardList.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title} ({b.runCount})
              </option>
            ))}
          </select>
          {!board && runIds.length > 0 ? (
            <select
              value={selectedRunId ?? ''}
              onChange={(e) => useStore.getState().selectRun(e.target.value)}
              className={selectCls}
            >
              {runIds.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          ) : null}
          {!board && selectedRunId ? (
            <button type="button" onClick={() => setOpening((v) => !v)} className={`${selectCls} hover:text-foreground`}>
              Open into Board
            </button>
          ) : null}
        </div>
      </div>

      {/* open-into-Board mini-form: pick an existing board or create one. */}
      {opening && !board && selectedRunId ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card/40 px-3 py-2">
          <select value={openTarget} onChange={(e) => setOpenTarget(e.target.value)} className={selectCls}>
            <option value="">Select a board…</option>
            {boardList.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
              </option>
            ))}
            <option value="__new__">+ New board…</option>
          </select>
          {openTarget === '__new__' ? (
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Board title (optional)"
              className={selectCls}
            />
          ) : null}
          <input
            value={openSlot}
            onChange={(e) => setOpenSlot(e.target.value)}
            placeholder="Slot name (optional)"
            className={selectCls}
          />
          <button
            type="button"
            onClick={handleOpenIntoBoard}
            disabled={!openTarget}
            className={`${selectCls} hover:text-foreground disabled:opacity-50`}
          >
            Add Run
          </button>
        </div>
      ) : null}

      <div className="relative min-h-0 flex-1 overflow-auto">
        {board ? (
          board.slots.length > 0 ? (
            board.slots.map((slot) => (
              <SlotRow key={`${slot.producerSystem} ${slot.slotId}`} slot={slot} />
            ))
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              This Board has no Runs yet — open a Run into it.
            </div>
          )
        ) : graph && flow.nodes.length > 0 ? (
          <ReactFlow
            nodes={flow.nodes}
            edges={flow.edges}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.2}
            maxZoom={2}
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
