'use client';

import { create } from 'zustand';
import type {
  AgentDescriptor,
  ApprovalRequest,
  ApprovalResolvedPayload,
  CCEvent,
  FileChange,
  GitHubActivity,
  SnapshotPayload,
  StepGraph,
  TokenTick,
} from '@command-center/shared';
import { BURN_WINDOW_MS, MAX_EVENTS } from '@/lib/config';

// A timestamped, incremental cost sample used to compute the burn rate.
interface CostSample {
  ts: number;
  cost: number;
}

export interface SessionTokens {
  input: number;
  output: number;
  cost_usd: number;
}

interface StoreState {
  connected: boolean;

  // events slice — ordered timeline, deduped by (session_id, seq)
  events: CCEvent[];
  eventKeys: Set<string>;

  // sessions slice
  sessions: Record<string, AgentDescriptor>;

  // approvals slice — only pending/active requests live here
  approvals: Record<string, ApprovalRequest>;

  // tokens slice
  tokensBySession: Record<string, SessionTokens>;
  costSamples: CostSample[]; // recent incremental cost samples (ring)

  // github slice
  github: GitHubActivity | null;

  // file changes slice (used by Phase 7 panels)
  fileChanges: FileChange[];

  // substrate Step-Graph slice (slice #31) — runId → latest projected graph,
  // fed by the `step-graph:update` broadcast and the GET hydration snapshot.
  stepGraphs: Record<string, StepGraph>;
  selectedRunId: string | null;

  // actions
  setConnected: (v: boolean) => void;
  hydrate: (snap: SnapshotPayload) => void;
  addEvent: (e: CCEvent) => void;
  setAgentState: (a: AgentDescriptor) => void;
  upsertApproval: (r: ApprovalRequest) => void;
  resolveApproval: (d: ApprovalResolvedPayload) => void;
  addTokenTick: (t: TokenTick) => void;
  setGithub: (g: GitHubActivity) => void;
  addFileChange: (f: FileChange) => void;
  setFileChanges: (f: FileChange[]) => void;
  upsertStepGraph: (g: StepGraph) => void;
  selectRun: (runId: string) => void;
}

function eventKey(e: CCEvent): string {
  return `${e.session_id}:${e.seq}`;
}

// Insert an event into an already-(timestamp)-sorted array, deduping by key.
// Returns the next array + whether it was inserted.
function insertEvent(events: CCEvent[], keys: Set<string>, e: CCEvent): { events: CCEvent[]; keys: Set<string> } {
  const key = eventKey(e);
  if (keys.has(key)) return { events, keys };
  const nextKeys = new Set(keys);
  nextKeys.add(key);

  // Most events arrive in order → fast-path append.
  const next = events.slice();
  const last = next[next.length - 1];
  if (!last || e.timestamp >= last.timestamp) {
    next.push(e);
  } else {
    // Out-of-order (e.g. replay/reconnect): binary-insert by timestamp.
    let lo = 0;
    let hi = next.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      const midEvt = next[mid]!;
      if (midEvt.timestamp <= e.timestamp) lo = mid + 1;
      else hi = mid;
    }
    next.splice(lo, 0, e);
  }

  // Ring-buffer cap — drop oldest, and their keys.
  if (next.length > MAX_EVENTS) {
    const dropped = next.splice(0, next.length - MAX_EVENTS);
    for (const d of dropped) nextKeys.delete(eventKey(d));
  }
  return { events: next, keys: nextKeys };
}

function pruneSamples(samples: CostSample[], now: number): CostSample[] {
  const cutoff = now - BURN_WINDOW_MS;
  return samples.filter((s) => s.ts >= cutoff);
}

export const useStore = create<StoreState>((set) => ({
  connected: false,
  events: [],
  eventKeys: new Set(),
  sessions: {},
  approvals: {},
  tokensBySession: {},
  costSamples: [],
  github: null,
  fileChanges: [],
  stepGraphs: {},
  selectedRunId: null,

  setConnected: (v) => set({ connected: v }),

  hydrate: (snap) =>
    set(() => {
      const events: CCEvent[] = [];
      let keys = new Set<string>();
      // Sort the snapshot, then fold through insertEvent for dedupe + ordering.
      const sorted = [...snap.events].sort((a, b) => a.timestamp - b.timestamp);
      let acc = { events, keys };
      for (const e of sorted) acc = insertEvent(acc.events, acc.keys, e);
      keys = acc.keys;

      const sessions: Record<string, AgentDescriptor> = {};
      for (const s of snap.sessions) sessions[s.session_id] = s;

      const approvals: Record<string, ApprovalRequest> = {};
      for (const r of snap.approvals) {
        if (r.status === 'pending') approvals[r.id] = r;
      }

      const tokensBySession: Record<string, SessionTokens> = {};
      for (const s of snap.sessions) {
        tokensBySession[s.session_id] = {
          input: s.totals.input,
          output: s.totals.output,
          cost_usd: s.totals.cost_usd,
        };
      }

      return { events: acc.events, eventKeys: keys, sessions, approvals, tokensBySession };
    }),

  addEvent: (e) =>
    set((state) => {
      const { events, keys } = insertEvent(state.events, state.eventKeys, e);
      if (events === state.events) return {}; // duplicate — no-op
      return { events, eventKeys: keys };
    }),

  setAgentState: (a) =>
    set((state) => ({ sessions: { ...state.sessions, [a.session_id]: a } })),

  upsertApproval: (r) =>
    set((state) => ({ approvals: { ...state.approvals, [r.id]: r } })),

  resolveApproval: (d) =>
    set((state) => {
      if (!state.approvals[d.id]) return {};
      const next = { ...state.approvals };
      delete next[d.id];
      return { approvals: next };
    }),

  addTokenTick: (t) =>
    set((state) => {
      const prev = state.tokensBySession[t.session_id] ?? {
        input: 0,
        output: 0,
        cost_usd: 0,
      };
      const tokensBySession = {
        ...state.tokensBySession,
        [t.session_id]: {
          input: prev.input + t.input,
          output: prev.output + t.output,
          cost_usd: prev.cost_usd + t.cost_usd,
        },
      };
      const now = Date.now();
      const costSamples = pruneSamples(
        [...state.costSamples, { ts: now, cost: t.cost_usd }],
        now,
      );
      return { tokensBySession, costSamples };
    }),

  setGithub: (g) => set({ github: g }),

  addFileChange: (f) =>
    set((state) => ({ fileChanges: [f, ...state.fileChanges].slice(0, 500) })),

  setFileChanges: (f) =>
    set(() => ({
      // Newest first; REST hydration replaces the slice.
      fileChanges: [...f].sort((a, b) => b.timestamp - a.timestamp).slice(0, 500),
    })),

  // The broadcast/hydration payload is the FULL graph each time → just replace.
  // Auto-follow the most recently updated run unless the user has pinned another.
  upsertStepGraph: (g) =>
    set((state) => ({
      stepGraphs: { ...state.stepGraphs, [g.runId]: g },
      selectedRunId: state.selectedRunId ?? g.runId,
    })),

  selectRun: (runId) => set({ selectedRunId: runId }),
}));
