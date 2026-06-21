'use client';

import { ORCH_URL } from './config';
import type {
  AgentDescriptor,
  AgentRole,
  ApprovalDecision,
  BoardProjection,
  BranchProjection,
  CascadePreview,
  CCEvent,
  FileChange,
  GitHubActivity,
  StepGraph,
  SummaryResponse,
  SystemFreshness,
} from '@command-center/shared';

// `GET /api/boards` list row (lighter than a full projection — no slots).
export interface BoardListItem {
  id: string;
  title: string;
  createdAt: number;
  runCount: number;
}

// The /api/files/diff response. The watcher already attaches a unified `diff`
// to each FileChange; this on-demand endpoint returns a fresh one for a path.
// Typed loosely + normalized at the call site so a raw-string body also works.
export interface FileDiffResponse {
  path: string;
  diff: string;
  additions?: number;
  deletions?: number;
}

// REST client for the orchestrator. We hit the orchestrator origin directly
// (CORS allowlists :3000). Relative `/api/*` would also work via Next rewrites,
// but absolute keeps client + server fetches consistent.
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${ORCH_URL}${path}`, {
    headers: { 'content-type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${init?.method ?? 'GET'} ${path} → ${res.status} ${body}`);
  }
  // Tolerate empty 204 bodies.
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export interface CreateSessionInput {
  name: string;
  role: AgentRole;
  model?: string;
  cwd?: string;
}

export const api = {
  listSessions: () => request<AgentDescriptor[]>('/api/sessions'),
  getSession: (id: string) => request<AgentDescriptor>(`/api/sessions/${id}`),
  createSession: (input: CreateSessionInput) =>
    request<AgentDescriptor>('/api/sessions', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  promptSession: (id: string, text: string) =>
    request<{ ok: true }>(`/api/sessions/${id}/prompt`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),
  stopSession: (id: string) =>
    request<{ ok: true }>(`/api/sessions/${id}/stop`, { method: 'POST' }),
  // The replay endpoint returns `{ sessionId, events }`; tolerate a bare array too.
  getReplay: async (id: string): Promise<CCEvent[]> => {
    const r = await request<{ sessionId: string; events: CCEvent[] } | CCEvent[]>(
      `/api/sessions/${id}/replay`,
    );
    return Array.isArray(r) ? r : (r.events ?? []);
  },
  respondApproval: (id: string, decision: ApprovalDecision) =>
    request<{ ok: true }>(`/api/approvals/${id}/respond`, {
      method: 'POST',
      body: JSON.stringify(decision),
    }),
  tokenSummary: () => request<SummaryResponse>('/api/tokens/summary'),

  // File tracking (sub-stream A).
  listFileChanges: () => request<FileChange[]>('/api/files/changes'),
  getFileDiff: (path: string) =>
    request<FileDiffResponse | string>(
      `/api/files/diff?path=${encodeURIComponent(path)}`,
    ),

  // GitHub insights (sub-stream A). `activity` returns the full bundle.
  githubActivity: () => request<GitHubActivity>('/api/github/activity'),

  // Substrate Step-Graph snapshot for Canvas hydration (slice #31).
  getRunGraph: (runId: string) =>
    request<StepGraph>(`/api/runs/${encodeURIComponent(runId)}/graph`),

  // Board persistence (slice #36). Mirrors getRunGraph's baseURL/JSON handling.
  createBoard: (title?: string) =>
    request<{ id: string }>('/api/boards', {
      method: 'POST',
      body: JSON.stringify(title ? { title } : {}),
    }),
  listBoards: () => request<BoardListItem[]>('/api/boards'),
  openIntoBoard: (boardId: string, runId: string, slotId?: string) =>
    request<BoardProjection>(`/api/boards/${encodeURIComponent(boardId)}/runs`, {
      method: 'POST',
      body: JSON.stringify(slotId ? { runId, slotId } : { runId }),
    }),
  getBoard: (boardId: string) =>
    request<BoardProjection>(`/api/boards/${encodeURIComponent(boardId)}`),

  // Branch/Lineage editing (slice #41) — control-plane ingress (ADR-0015). All
  // four reuse `request`'s ORCH_URL base-resolution (no hardcoded host); the three
  // mutating routes broadcast `branch:update` server-side, so callers don't merge
  // a response into the store — the socket bridge replaces the projection slice.
  forkBranch: (
    runId: string,
    stepKey: string,
    payload?: { ref?: string; text?: string },
    parentBranchId?: string,
  ) =>
    request<{ branchId: string }>('/api/branches', {
      method: 'POST',
      body: JSON.stringify({ runId, stepKey, payload, parentBranchId }),
    }),
  activateBranch: (branchId: string, runId: string, stepKey: string) =>
    request<{ ok: true }>(`/api/branches/${encodeURIComponent(branchId)}/activate`, {
      method: 'POST',
      body: JSON.stringify({ runId, stepKey }),
    }),
  replan: (runId: string, slotIds: string[]) =>
    request<{ orphaned: string[] }>(
      `/api/runs/${encodeURIComponent(runId)}/replan`,
      { method: 'POST', body: JSON.stringify({ slotIds }) },
    ),
  getBranches: (runId: string) =>
    request<BranchProjection>(`/api/runs/${encodeURIComponent(runId)}/branches`),

  // Provenance-aware cascade (slice #42 / ADR-0003/0016). Control-plane only:
  // the preview is request/response (GET, no socket event) and the request is a
  // POST that emits ONE `cc.cascade.requested` intent (the #39 executor consumes
  // it). `getCascadePreview` powers the operator gate; `requestCascade` is the
  // Confirm seam — returns the dispatched target stepKeys.
  getCascadePreview: (runId: string, stepKey: string) =>
    request<CascadePreview>(
      `/api/runs/${encodeURIComponent(runId)}/cascade-preview?stepKey=${encodeURIComponent(stepKey)}`,
    ),
  requestCascade: (runId: string, stepKey: string) =>
    request<{ requested: string[] }>(
      `/api/runs/${encodeURIComponent(runId)}/cascade`,
      { method: 'POST', body: JSON.stringify({ stepKey }) },
    ),

  // Drive-mode dispatch (slice #39 / ADR-0002). Control-plane command: POST
  // /api/drive emits ONE `cc.drive.requested` and spawns a skill-loaded session
  // (`skills:['adcelerate-execute']`); the Console subscribes the returned
  // sessionId to stream its Run onto the Canvas. Mirrors POST /api/sessions
  // (REST — no socket event). Body matches the pinned `DriveCommand`.
  drive: (task: string, systemHint?: string) =>
    request<{ sessionId: string }>('/api/drive', {
      method: 'POST',
      body: JSON.stringify(systemHint ? { task, systemHint } : { task }),
    }),

  // System distribution + SHA-pin freshness (slice #40). Delivery facts only;
  // the soft/hard tier is fused client-side against the #33 incompatibilities slice.
  listSystems: () => request<SystemFreshness[]>('/api/systems'),
  ensureSystem: (name: string) =>
    request<{ populated: true }>(
      `/api/systems/${encodeURIComponent(name)}/ensure`,
      { method: 'POST' },
    ),
};
