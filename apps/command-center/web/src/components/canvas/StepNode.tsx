'use client';

import { memo, useEffect, useState } from 'react';
import { Handle, Position, useViewport, type NodeProps } from '@xyflow/react';
import type { BranchInfo, StepState } from '@command-center/shared';
import { api } from '@/lib/api';
import { ORCH_URL } from '@/lib/config';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';

// The data React Flow carries for a substrate step node.
export interface StepNodeData {
  stage: string;
  stepKey: string;
  state: StepState;
  hasArtifact: boolean;
  // #34: the snapshotted artifact url (may be a Substrate-owned RELATIVE path or,
  // degraded, an absolute producer url) + its mime, threaded from the StepGraph node.
  artifactUrl?: string;
  artifactMimeType?: string;
  // #32: terminal-only step (reached succeeded/failed without queued/running).
  malformed?: boolean;
  // #41: DERIVED overlay flags off the StepGraph node (stamped by the orchestrator
  // re-projection). `stale` = an upstream Step was edited; `orphaned` = a re-plan
  // dropped this Step's slot. ponytail: overlays-preserve-never-hide — these only
  // RESTYLE the node, never remove it (Stale/Orphaned are "preserved, not deleted").
  stale?: boolean;
  orphaned?: boolean;
  // #42: DERIVED render-time view state (computed in Canvas `layout()` via
  // `blockedUpstreamStepKeys` — node queued ∧ a transitive upstream failed). NOT a
  // wire lifecycle state; emits nothing (ADR-0009/0016 §4). RESTYLE only, never hide.
  blockedUpstream?: boolean;
  // #41: the editing surface needs the run + lineage to fork/activate Branches.
  // Threaded from the BranchProjection slice (absent until a branch exists).
  runId?: string;
  branches?: BranchInfo[];
  activeBranchId?: string;
  // #43: DERIVED awaiting-approval overlay — this node's stepKey ∈ a pending durable
  // approval's `stepKeys` (matched in Canvas `layout()` against the approvals store).
  // NON-interactive: the badge DEEP-LINKS to ApprovalsPanel (never approves). `ghost`
  // marks a transient node injected for a fresh-dispatch approval with no Step yet
  // (dotted, no artifact); the real Step replaces it on approve. RESTYLE, never hide.
  awaitingApproval?: boolean;
  approvalId?: string;
  ghost?: boolean;
  [key: string]: unknown;
}

// #34 (ADR-0004): below this live-zoom level the node collapses to a coarse glyph
// (stage label + status dot); at or above it the full card (stepKey + state +
// artifact thumbnail) renders. ponytail: one scalar threshold, no zoom hysteresis.
const FULL_DETAIL_ZOOM = 0.6;

// state → visual treatment. queued pulses as a skeleton, running/retrying glow
// amber, succeeded is green, failed is red. (Acceptance: node goes green live.)
const STATE_STYLES: Record<StepState, string> = {
  queued: 'border-dashed border-border bg-muted/40 text-muted-foreground animate-pulse',
  running: 'border-amber-500 bg-amber-500/15 text-amber-300 animate-pulse',
  retrying: 'border-amber-500 bg-amber-500/15 text-amber-300 animate-pulse',
  succeeded: 'border-emerald-500 bg-emerald-500/15 text-emerald-300',
  failed: 'border-red-500 bg-red-500/15 text-red-300',
};

// state → status dot fill (used in the coarse, zoomed-out glyph).
const STATE_DOT: Record<StepState, string> = {
  queued: 'bg-muted-foreground',
  running: 'bg-amber-400',
  retrying: 'bg-amber-400',
  succeeded: 'bg-emerald-400',
  failed: 'bg-red-400',
};

// #41 overlay treatments — composed ON TOP of STATE_STYLES (state coloring stays
// intact). stale → amber DASHED border (upstream edited, needs regen [#42]);
// orphaned → greyed + ~40% opacity (a re-plan dropped its slot). `!` wins over the
// state border. ponytail: overlays-preserve-never-hide — restyle only, never hide.
const STALE_OVERLAY = '!border-dashed !border-amber-500';
const ORPHANED_OVERLAY = 'opacity-40 grayscale';

// #42 derived overlay — a queued Step whose transitive upstream FAILED can't run.
// Amber solid border + a lock ring on top of the queued skeleton (restyle, never
// hide). Consistent with the #41 stale/orphaned overlay approach above.
const BLOCKED_UPSTREAM_OVERLAY = '!border-solid !border-amber-500 ring-1 ring-amber-500/40';

// #43 awaiting-approval overlay — a durable approval gates this node. Violet ring +
// solid border to read as "paused, pending your decision" (distinct from amber
// blocked/stale). Same overlay-on-top-of-state approach (restyle, never hide). The
// ⏸ badge is a deep-link to ApprovalsPanel, NOT an approve button (no Canvas approve).
const AWAITING_APPROVAL_OVERLAY = '!border-solid !border-violet-500 ring-1 ring-violet-500/50';

// A short, human-scannable label for a Branch in the active-branch selector.
function branchLabel(b: BranchInfo): string {
  const short = b.branchId.length > 8 ? `${b.branchId.slice(0, 8)}…` : b.branchId;
  const tag = b.provenance === 'human' ? '🧑 human' : '🤖 agent';
  return `${tag} ${short}${b.stale ? ' (stale)' : ''}`;
}

function StepNodeComponent({ data }: NodeProps) {
  const d = data as StepNodeData;
  // ponytail: read the live viewport zoom inside the node (no detail prop threaded
  // through data / no ReactFlowProvider wrapper) → each node self-selects its detail.
  const { zoom } = useViewport();
  const coarse = zoom < FULL_DETAIL_ZOOM;

  // #41 editing state — the fork mini-editor, prefilled from the active Branch.
  const active = d.branches?.find((b) => b.branchId === d.activeBranchId);
  const [forking, setForking] = useState(false);
  const [text, setText] = useState(active?.payload?.text ?? '');
  const [ref, setRef] = useState(active?.payload?.ref ?? '');
  const [busy, setBusy] = useState(false);

  // #42→#43 cascade gate state — `toast` is the transient inline "cascade requested
  // N…" confirmation. The ">2 confirm modal" was REMOVED in #43: the durable server
  // gate (POST /cascade) now decides dispatch-vs-approval (count>2 / budget-line /
  // leased slot); if gated, it surfaces in ApprovalsPanel + a Canvas ⏸ overlay.
  const [toast, setToast] = useState<string | null>(null);

  // Auto-dismiss the inline toast (transient, like the #41 fire-and-forget edits).
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const canEdit = Boolean(d.runId);
  const branches = d.branches ?? [];

  async function submitFork() {
    if (!d.runId || busy) return;
    setBusy(true);
    try {
      // Fork from the current active Branch → server emits a human Branch + stales
      // downstream, then broadcasts `branch:update` (the slice re-renders).
      await api.forkBranch(d.runId, d.stepKey, {
        text: text || undefined,
        ref: ref || undefined,
      });
      setForking(false);
      // #42→#43 cascade gate — a fork stales the agent-authored downstream set. The
      // cheap preview only short-circuits the no-op case (nothing downstream). For
      // any real cascade we POST and let the DURABLE SERVER GATE decide: silent
      // dispatch (≤2 ∧ no budget-line ∧ unleased) vs a pending approval (count>2 /
      // budget-line crossed / leased slot). No client confirm modal (#43 trim) — a
      // gated cascade surfaces in ApprovalsPanel + a ⏸ Canvas overlay.
      try {
        const preview = await api.getCascadePreview(d.runId, d.stepKey);
        if (preview.count > 0) {
          await api.requestCascade(d.runId, d.stepKey);
          setToast(`cascade requested · ${preview.count}`);
        }
      } catch {
        /* preview/request is best-effort; the fork already landed */
      }
    } catch {
      /* fire-and-forget; the broadcast is the source of truth */
    } finally {
      setBusy(false);
    }
  }

  // #43 deep-link — a ⏸ overlay click focuses the matching ApprovalsPanel card
  // (scroll + highlight). This is the ONLY Canvas affordance for a gated node; the
  // approve/deny action lives exclusively in ApprovalCard.
  function openApproval() {
    if (d.approvalId) useStore.getState().focusApproval(d.approvalId);
  }

  async function activate(branchId: string) {
    if (!d.runId || busy || branchId === d.activeBranchId) return;
    setBusy(true);
    try {
      await api.activateBranch(branchId, d.runId, d.stepKey);
    } catch {
      /* fire-and-forget; the broadcast is the source of truth */
    } finally {
      setBusy(false);
    }
  }

  // ponytail: browser-downscaled <img> thumbnail (no server thumb pipeline; image
  // bytes are small). CONSUME RULE: relative snapshot path → prefix ORCH_URL; an
  // absolute producer url (degraded fallback) is used as-is.
  const src = d.artifactUrl
    ? d.artifactUrl.startsWith('/')
      ? ORCH_URL + d.artifactUrl
      : d.artifactUrl
    : undefined;

  // #43 GHOST node — a transient placeholder for a fresh-dispatch approval whose
  // stepKey has no Step yet (injected by Canvas `layout()` from the approval store,
  // NO event/projection). Dotted, no artifact, "⏸ pending"; the ⏸ deep-links to the
  // approval card. On approve the real Step is emitted and this ghost is replaced.
  if (d.ghost) {
    return (
      <div className="min-w-[140px] rounded-lg border-2 border-dashed border-violet-500 bg-violet-500/10 px-3 py-2 text-violet-300 shadow-sm">
        <Handle type="target" position={Position.Left} className="!bg-border" />
        <div className="text-sm font-medium leading-tight">{d.stage}</div>
        <div className="font-mono text-[10px] leading-tight opacity-70">{d.stepKey}</div>
        <button
          type="button"
          onClick={openApproval}
          className="nodrag nopan mt-1 rounded border border-violet-500 px-1.5 py-0.5 text-[10px] font-mono text-violet-300 hover:bg-violet-500/15"
          title="Awaiting approval — open the approval card (not an approve button)"
        >
          ⏸ pending — review
        </button>
        <Handle type="source" position={Position.Right} className="!bg-border" />
      </div>
    );
  }

  if (coarse) {
    // COARSE (zoomed out): stage label + a small status-colored dot. ponytail:
    // image-engine is flat (one Step per generation, ADR-0008) so "Op-level" = the
    // generation node in full detail; true Stage→Op grouping is dormant until a
    // nested producer (scene-board) is instrumented.
    return (
      <div
        className={cn(
          'flex min-w-[140px] items-center gap-2 rounded-lg border px-3 py-2 shadow-sm transition-colors',
          STATE_STYLES[d.state],
          d.malformed && 'ring-2 ring-amber-400/70',
          d.stale && STALE_OVERLAY,
          d.orphaned && ORPHANED_OVERLAY,
          d.blockedUpstream && BLOCKED_UPSTREAM_OVERLAY,
          d.awaitingApproval && AWAITING_APPROVAL_OVERLAY,
        )}
      >
        <Handle type="target" position={Position.Left} className="!bg-border" />
        <span className={cn('h-2 w-2 shrink-0 rounded-full', STATE_DOT[d.state])} aria-label={d.state} />
        <span className="text-sm font-medium leading-tight">{d.stage}</span>
        {d.blockedUpstream ? (
          <span className="text-amber-300" aria-label="blocked: upstream failed" title="Blocked — a transitive upstream Step failed">🔒</span>
        ) : null}
        {d.awaitingApproval ? (
          <button
            type="button"
            onClick={openApproval}
            className="nodrag nopan text-violet-300 hover:text-violet-200"
            aria-label="awaiting approval — open the approval card"
            title="Awaiting approval — open the approval card (not an approve button)"
          >
            ⏸
          </button>
        ) : null}
        <Handle type="source" position={Position.Right} className="!bg-border" />
      </div>
    );
  }

  // FULL (zoomed in): stepKey + state + artifact thumbnail.
  return (
    <div
      className={cn(
        'min-w-[140px] rounded-lg border px-3 py-2 shadow-sm transition-colors',
        STATE_STYLES[d.state],
        // Terminal-only step → ringed amber so it reads as "needs attention".
        d.malformed && 'ring-2 ring-amber-400/70',
        // #41 overlays compose on top of state coloring (preserve, never hide).
        d.stale && STALE_OVERLAY,
        d.orphaned && ORPHANED_OVERLAY,
        // #42 derived blocked-upstream overlay (queued ∧ upstream failed).
        d.blockedUpstream && BLOCKED_UPSTREAM_OVERLAY,
        // #43 derived awaiting-approval overlay (stepKey ∈ a pending approval).
        d.awaitingApproval && AWAITING_APPROVAL_OVERLAY,
      )}
    >
      <Handle type="target" position={Position.Left} className="!bg-border" />
      <div className="text-sm font-medium leading-tight">{d.stage}</div>
      <div className="font-mono text-[10px] leading-tight opacity-70">{d.stepKey}</div>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={`${d.stage} artifact`}
          loading="lazy"
          className="mt-1.5 max-w-[120px] rounded border border-border object-cover"
        />
      ) : null}
      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] font-mono uppercase tracking-wide opacity-80">
        <span>{d.state}</span>
        {d.hasArtifact && !src ? <span aria-label="has artifact">·&nbsp;artifact</span> : null}
        {d.malformed ? (
          <span className="text-amber-300" aria-label="malformed: terminal-only step" title="Terminal-only — no queued/running observed">
            ·&nbsp;⚠ malformed
          </span>
        ) : null}
        {d.stale ? (
          <span className="text-amber-300" aria-label="stale: upstream edited" title="Stale — an upstream Step was edited; preserved, not deleted">
            ·&nbsp;stale
          </span>
        ) : null}
        {d.orphaned ? (
          <span className="text-muted-foreground" aria-label="orphaned: slot dropped on re-plan" title="Orphaned — a re-plan dropped this slot; preserved, not deleted">
            ·&nbsp;orphaned
          </span>
        ) : null}
        {d.blockedUpstream ? (
          <span className="text-amber-300" aria-label="blocked: upstream failed" title="Blocked — a transitive upstream Step failed; this Step can't run">
            ·&nbsp;🔒 blocked: upstream failed
          </span>
        ) : null}
        {d.awaitingApproval ? (
          <button
            type="button"
            onClick={openApproval}
            className="nodrag nopan rounded border border-violet-500 px-1 text-violet-300 hover:bg-violet-500/15"
            aria-label="awaiting approval — open the approval card"
            title="Awaiting approval — open the approval card (not an approve button)"
          >
            ·&nbsp;⏸ awaiting approval
          </button>
        ) : null}
      </div>

      {/* #41 active-branch selector — only when a Step has >1 Branch (lineage pick).
          `nodrag nopan` so React Flow doesn't hijack the control. Human-sticky is
          enforced server-side; this just posts the human's choice. */}
      {branches.length > 1 ? (
        <select
          className="nodrag nopan mt-1.5 w-full rounded border border-border bg-card px-1 py-0.5 font-mono text-[10px] text-foreground"
          value={d.activeBranchId ?? ''}
          disabled={busy}
          onChange={(e) => activate(e.target.value)}
          title="Active Branch (lineage)"
        >
          {branches.map((b) => (
            <option key={b.branchId} value={b.branchId}>
              {branchLabel(b)}
            </option>
          ))}
        </select>
      ) : null}

      {/* #41 fork affordance — edit the payload (text/ref) → a new human Branch. */}
      {canEdit ? (
        forking ? (
          <div className="nodrag nopan mt-1.5 flex flex-col gap-1">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="prompt / text…"
              rows={2}
              className="w-full resize-none rounded border border-border bg-card px-1 py-0.5 font-mono text-[10px] text-foreground"
            />
            <input
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              placeholder="ref (optional)"
              className="w-full rounded border border-border bg-card px-1 py-0.5 font-mono text-[10px] text-foreground"
            />
            <div className="flex gap-1">
              <button
                type="button"
                onClick={submitFork}
                disabled={busy}
                className="rounded border border-emerald-500 px-1.5 py-0.5 text-[10px] font-mono text-emerald-300 hover:bg-emerald-500/15 disabled:opacity-50"
              >
                Create branch
              </button>
              <button
                type="button"
                onClick={() => setForking(false)}
                disabled={busy}
                className="rounded border border-border px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setForking(true)}
            className="nodrag nopan mt-1.5 rounded border border-border px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground hover:text-foreground"
            title="Fork a human Branch from this Step (edit its payload)"
          >
            ✎ Fork
          </button>
        )
      ) : null}

      {/* #42 inline cascade toast — transient "regenerating N…" (silent path). */}
      {toast ? (
        <div
          className="nodrag nopan mt-1.5 rounded border border-emerald-500 bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-mono text-emerald-300"
          aria-live="polite"
        >
          ↻ {toast}
        </div>
      ) : null}

      <Handle type="source" position={Position.Right} className="!bg-border" />
    </div>
  );
}

export const StepNode = memo(StepNodeComponent);
