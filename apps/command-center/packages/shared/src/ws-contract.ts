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
import type { StepGraphUpdate, BoardProjection, BranchProjection } from './substrate';

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

// Provider-scoped budget-guard trip (slice #38 / ADR-0007). image-engine owns
// the cost data + the block point; when a serving provider's cumulative spend
// crosses its per-(provider,model,modality) budget-line the next gen is blocked
// (402) and image-engine POSTs this trip to the Console. Mirrors the #33
// IncompatibilitySignal precedent: a TRANSIENT signal, NOT persisted as a
// CCEvent (the Emitter carries no cost — the trip is a separate POST).
export interface BudgetTripSignal {
  provider: string;  // serving provider that tripped (e.g. "higgsfield")
  model: string;     // model in flight when the line was crossed
  spentUsd: number;  // cumulative USD spent on that provider
  limitUsd: number;  // the budget-line that was crossed
  at: number;        // epoch ms the trip occurred
}

// System distribution + version-drift facts (slice #40 / ADR-0021, ADR-0022).
// Systems are SHA-pinned, lazily-initialized submodules; `git submodule status`
// IS the delivery registry (no version field invented). These are DELIVERY FACTS
// only — surfaced over REST (GET /api/systems), NOT a socket event. The soft/hard
// freshness TIER is derived client-side: drift/!populated → soft "update
// available"; a matching live `incompatibilities` entry (by producerSystem) →
// hard "too old". No new socket event — the hard tier reuses the #33 surface.
export interface SystemFreshness {
  name: string;       // basename of the systems/<name> submodule path
  pinnedSha: string;  // the 40-char SHA pinned in the parent index
  populated: boolean; // submodule dir on disk + checked out (git flag ' ' or '+')
  drift: boolean;     // checked-out SHA differs from the pin (git flag '+')
}

// Provenance-aware cascade preview + request (slice #42 / ADR-0003/0016). REST
// types ONLY — the preview is request/response (GET) and the request is a POST;
// no socket event is added (the cascade-Run lifecycle is the #39 executor's, not
// the Console's). The preview shows what is HONESTLY known: count + affected
// stages + budget-headroom from cached trips. NO dollar total, NO fabricated
// per-model breakdown (ADR-0009/0016) — provider-per-step is a documented follow-up.
export interface CascadeTarget {
  stepKey: string;
  stage: string;
}
// One per provider we have a cached BudgetTripSignal for — straight from the last
// trip, never a predicted/aggregated total.
export interface BudgetHeadroom {
  provider: string;
  model: string;
  spentUsd: number;
  limitUsd: number;
  at: number;
}
export interface CascadePreview {
  runId: string;
  editedStepKey: string;
  targets: CascadeTarget[];        // agent-authored downstream only (human-sticky excluded)
  count: number;                   // = targets.length
  threshold: number;               // = 2 (silent at/below, confirm above)
  excludedHumanStepKeys: string[]; // human-active downstream left Stale (shown for transparency)
  budgetHeadroom: BudgetHeadroom[];// honest, may be empty; never a predicted total
}
export interface CascadeRequest {
  stepKey: string;                 // POST body — the edited upstream step
}

// Drive-mode dispatch (slice #39 / ADR-0002). REST body ONLY — POST /api/drive
// takes this and returns { sessionId: string } (no type needed for the response).
// NO socket event is added: Drive mirrors POST /api/sessions (REST), and the
// Console subscribes to the returned sessionId to stream the Run onto the Canvas.
export interface DriveCommand {
  task: string;                    // the operator's command, routed by adcelerate-execute
  systemHint?: string;             // optional target system (skill scores systems.yaml otherwise)
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
  'branch:update': (p: BranchProjection) => void;     // Branch/Lineage fold (slice #41)
  'incompatibility': (s: IncompatibilitySignal) => void;  // out-of-window envelope rejected (slice #33)
  'budget-trip': (s: BudgetTripSignal) => void;           // provider crossed its budget-line (slice #38)
}

export interface ClientToServer {
  'session:subscribe': (sessionId: string) => void;     // join room
  'session:prompt': (p: { sessionId: string; text: string }) => void;
  'approval:respond': (d: ApprovalDecision) => void;     // low-latency path (mirrors REST)
}

// Convenience alias for the resolved-approval broadcast payload.
export type ApprovalResolvedPayload = ApprovalDecision & { status: ApprovalStatus };
