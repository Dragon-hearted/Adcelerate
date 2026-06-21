// ─────────────────────────────────────────────────────────────────────────────
// Socket.IO contract — the typed event maps shared by the orchestrator gateway
// and the Next.js client. This is the single source of truth for the wire
// protocol; both sides import these interfaces to stay in lockstep.
// ─────────────────────────────────────────────────────────────────────────────

import type { CCEvent, FileChange } from './events';
import type { AgentDescriptor } from './agents';
import type { ApprovalRequest, ApprovalDecision, ApprovalStatus } from './approvals';
import type { GitHubActivity } from './github';
import type { TokenTick } from './tokens';
import type { StepGraphUpdate, BoardProjection } from './substrate';

// Initial hydration payload sent on connect (mirrors the legacy `{type:'initial'}`).
export interface SnapshotPayload {
  events: CCEvent[];
  sessions: AgentDescriptor[];
  approvals: ApprovalRequest[];
}

// Emitter envelope-version incompatibility (slice #33 / ADR-0020). Broadcast when
// an out-of-window envelope is rejected at ingest (4xx, zero state mutation) so
// the operator sees a producer is too old/new — NOT persisted as a CCEvent (a
// rejected envelope mutates no projected state; this is a transient alarm).
export interface IncompatibilitySignal {
  producerSystem: string;
  gotVersion: string;
  supported: string; // human-readable supported window, e.g. ">=1.0.0 <2.0.0"
  at: number;        // epoch ms the reject occurred
}

export interface ServerToClient {
  'event': (e: CCEvent) => void;                  // every normalized event (per-session room)
  'event:global': (e: CCEvent) => void;           // cross-session aggregate feed (all clients)
  'snapshot': (p: SnapshotPayload) => void;
  'approval:request': (r: ApprovalRequest) => void;
  'approval:resolved': (d: ApprovalDecision & { status: ApprovalStatus }) => void;
  'agent:state': (a: AgentDescriptor) => void;
  'token:tick': (t: TokenTick) => void;
  'github:update': (g: GitHubActivity) => void;
  'file:changed': (f: FileChange) => void;
  'step-graph:update': (g: StepGraphUpdate) => void;  // Substrate Run/Step graph (slice #31)
  'board:update': (b: BoardProjection) => void;       // Board slot projection (slice #36)
  'incompatibility': (s: IncompatibilitySignal) => void;  // out-of-window envelope rejected (slice #33)
}

export interface ClientToServer {
  'session:subscribe': (sessionId: string) => void;     // join room
  'session:prompt': (p: { sessionId: string; text: string }) => void;
  'approval:respond': (d: ApprovalDecision) => void;     // low-latency path (mirrors REST)
}

// Convenience alias for the resolved-approval broadcast payload.
export type ApprovalResolvedPayload = ApprovalDecision & { status: ApprovalStatus };
