'use client';

import { useEffect, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useStore } from '@/store/useStore';
import { EventRow } from './EventRow';

/**
 * Virtualized, auto-scrolling timeline of the cross-session event stream.
 * Renders only the visible window so it stays smooth with thousands of events.
 */
export function LiveTimeline() {
  const events = useStore((s) => s.events);
  const parentRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  const virtualizer = useVirtualizer({
    count: events.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 34,
    overscan: 12,
  });

  // Track whether the user is pinned to the bottom; if so, follow new events.
  function onScroll() {
    const el = parentRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottom.current = distanceFromBottom < 80;
  }

  useEffect(() => {
    if (stickToBottom.current && events.length > 0) {
      virtualizer.scrollToIndex(events.length - 1, { align: 'end' });
    }
  }, [events.length, virtualizer]);

  const items = virtualizer.getVirtualItems();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Live Timeline
        </h2>
        <span className="font-mono text-xs text-muted-foreground">{events.length} events</span>
      </div>

      <div ref={parentRef} onScroll={onScroll} className="relative flex-1 overflow-auto">
        {events.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Waiting for events… submit a prompt below to begin.
          </div>
        ) : (
          <div style={{ height: virtualizer.getTotalSize(), position: 'relative', width: '100%' }}>
            {items.map((vi) => {
              const event = events[vi.index]!;
              return (
                <div
                  key={`${event.session_id}:${event.seq}`}
                  data-index={vi.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${vi.start}px)`,
                  }}
                >
                  <EventRow event={event} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
