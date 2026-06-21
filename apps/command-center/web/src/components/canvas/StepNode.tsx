'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { StepState } from '@command-center/shared';
import { cn } from '@/lib/utils';

// The data React Flow carries for a substrate step node.
export interface StepNodeData {
  stage: string;
  stepKey: string;
  state: StepState;
  hasArtifact: boolean;
  [key: string]: unknown;
}

// state → visual treatment. queued pulses as a skeleton, running/retrying glow
// amber, succeeded is green, failed is red. (Acceptance: node goes green live.)
const STATE_STYLES: Record<StepState, string> = {
  queued: 'border-dashed border-border bg-muted/40 text-muted-foreground animate-pulse',
  running: 'border-amber-500 bg-amber-500/15 text-amber-300 animate-pulse',
  retrying: 'border-amber-500 bg-amber-500/15 text-amber-300 animate-pulse',
  succeeded: 'border-emerald-500 bg-emerald-500/15 text-emerald-300',
  failed: 'border-red-500 bg-red-500/15 text-red-300',
};

function StepNodeComponent({ data }: NodeProps) {
  const d = data as StepNodeData;
  return (
    <div
      className={cn(
        'min-w-[140px] rounded-lg border px-3 py-2 shadow-sm transition-colors',
        STATE_STYLES[d.state],
      )}
    >
      <Handle type="target" position={Position.Left} className="!bg-border" />
      <div className="text-sm font-medium leading-tight">{d.stage}</div>
      <div className="mt-1 flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wide opacity-80">
        <span>{d.state}</span>
        {d.hasArtifact ? <span aria-label="has artifact">·&nbsp;artifact</span> : null}
      </div>
      <Handle type="source" position={Position.Right} className="!bg-border" />
    </div>
  );
}

export const StepNode = memo(StepNodeComponent);
