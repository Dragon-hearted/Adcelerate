'use client';

import { memo } from 'react';
import { Handle, Position, useViewport, type NodeProps } from '@xyflow/react';
import type { StepState } from '@command-center/shared';
import { ORCH_URL } from '@/lib/config';
import { cn } from '@/lib/utils';

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

function StepNodeComponent({ data }: NodeProps) {
  const d = data as StepNodeData;
  // ponytail: read the live viewport zoom inside the node (no detail prop threaded
  // through data / no ReactFlowProvider wrapper) → each node self-selects its detail.
  const { zoom } = useViewport();
  const coarse = zoom < FULL_DETAIL_ZOOM;

  // ponytail: browser-downscaled <img> thumbnail (no server thumb pipeline; image
  // bytes are small). CONSUME RULE: relative snapshot path → prefix ORCH_URL; an
  // absolute producer url (degraded fallback) is used as-is.
  const src = d.artifactUrl
    ? d.artifactUrl.startsWith('/')
      ? ORCH_URL + d.artifactUrl
      : d.artifactUrl
    : undefined;

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
        )}
      >
        <Handle type="target" position={Position.Left} className="!bg-border" />
        <span className={cn('h-2 w-2 shrink-0 rounded-full', STATE_DOT[d.state])} aria-label={d.state} />
        <span className="text-sm font-medium leading-tight">{d.stage}</span>
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
      <div className="mt-1 flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wide opacity-80">
        <span>{d.state}</span>
        {d.hasArtifact && !src ? <span aria-label="has artifact">·&nbsp;artifact</span> : null}
        {d.malformed ? (
          <span className="text-amber-300" aria-label="malformed: terminal-only step" title="Terminal-only — no queued/running observed">
            ·&nbsp;⚠ malformed
          </span>
        ) : null}
      </div>
      <Handle type="source" position={Position.Right} className="!bg-border" />
    </div>
  );
}

export const StepNode = memo(StepNodeComponent);
