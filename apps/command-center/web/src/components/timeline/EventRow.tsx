'use client';

import { memo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { CCEvent, EventType } from '@command-center/shared';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { formatCost, formatTime, pretty, truncate } from '@/lib/format';
import { cn } from '@/lib/utils';

// Map an event type to a badge variant for a quick visual scan of the stream.
function typeVariant(t: EventType): BadgeProps['variant'] {
  if (t === 'PostToolUseFailure' || t === 'SessionEnd') return 'destructive';
  if (t === 'PreToolUse' || t === 'PermissionRequest' || t === 'cc.approval.requested')
    return 'warning';
  if (t === 'PostToolUse' || t === 'cc.approval.resolved') return 'success';
  if (t.startsWith('cc.')) return 'default';
  return 'muted';
}

// A one-line human summary for the collapsed card.
function summarize(e: CCEvent): string {
  if (e.summary) return e.summary;
  if (e.tool_name) return e.tool_name;
  const text = e.payload?.text ?? e.payload?.message ?? e.payload?.content;
  if (typeof text === 'string') return truncate(text, 160);
  return e.hook_event_type;
}

interface EventRowProps {
  event: CCEvent;
}

export const EventRow = memo(function EventRow({ event }: EventRowProps) {
  const [expanded, setExpanded] = useState(false);
  const hasDetail = !!event.payload && Object.keys(event.payload).length > 0;

  return (
    <div className="border-b border-border/60 px-3 py-1.5 text-sm hover:bg-accent/40">
      <button
        type="button"
        onClick={() => hasDetail && setExpanded((v) => !v)}
        className="flex w-full items-start gap-2 text-left"
      >
        <span className="mt-0.5 shrink-0 text-muted-foreground">
          {hasDetail ? (
            expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />
          ) : (
            <span className="inline-block size-3.5" />
          )}
        </span>

        <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
          {formatTime(event.timestamp)}
        </span>

        <Badge variant={typeVariant(event.hook_event_type)} className="shrink-0">
          {event.hook_event_type}
        </Badge>

        {event.agent_name && (
          <span className="shrink-0 text-xs font-medium text-primary">{event.agent_name}</span>
        )}

        <span className="min-w-0 flex-1 truncate text-foreground/90">{summarize(event)}</span>

        {typeof event.cost_usd === 'number' && event.cost_usd > 0 && (
          <span className="shrink-0 font-mono text-xs text-muted-foreground">
            {formatCost(event.cost_usd)}
          </span>
        )}
      </button>

      {expanded && hasDetail && (
        <pre
          className={cn(
            'mt-1.5 ml-6 max-h-72 overflow-auto rounded-md bg-muted/60 p-2',
            'font-mono text-xs text-muted-foreground',
          )}
        >
          {pretty(event.payload)}
        </pre>
      )}
    </div>
  );
});
