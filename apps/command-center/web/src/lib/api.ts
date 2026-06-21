'use client';

import { ORCH_URL } from './config';
import type {
  AgentDescriptor,
  AgentRole,
  ApprovalDecision,
  CCEvent,
  FileChange,
  GitHubActivity,
  StepGraph,
  SummaryResponse,
} from '@command-center/shared';

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
};
