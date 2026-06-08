'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { CCEvent } from '@command-center/shared';
import { useSocketBridge } from '@/hooks/useSocketBridge';
import { useReplay } from '@/hooks/useReplay';
import { getSocket } from '@/lib/socket';
import { useStore } from '@/store/useStore';
import { api } from '@/lib/api';
import { EventRow } from '@/components/timeline/EventRow';
import { ReplayControls } from '@/components/replay/ReplayControls';
import { agentStateMeta } from '@/lib/agent-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCost, formatTokens } from '@/lib/format';
import { cn } from '@/lib/utils';

type Mode = 'live' | 'replay';

/**
 * Single-session focus + replay view (`/sessions/[id]`).
 * - Live: joins the session room, streams events from the store.
 * - Replay: loads GET /api/sessions/:id/replay (ordered by seq) and steps
 *   through it deterministically via the replay clock.
 */
export function SessionView({ sessionId }: { sessionId: string }) {
  useSocketBridge();
  const [mode, setMode] = useState<Mode>('replay');

  // Join the per-session room (live mode) so we receive its `event` stream.
  useEffect(() => {
    const socket = getSocket();
    const join = () => socket.emit('session:subscribe', sessionId);
    if (socket.connected) join();
    socket.on('connect', join);
    return () => {
      socket.off('connect', join);
    };
  }, [sessionId]);

  const liveEvents = useStore((s) => s.events);
  const session = useStore((s) => s.sessions[sessionId]);
  const tokens = useStore((s) => s.tokensBySession[sessionId]);

  const sessionLiveEvents = useMemo(
    () => liveEvents.filter((e) => e.session_id === sessionId).sort((a, b) => a.seq - b.seq),
    [liveEvents, sessionId],
  );

  // Replay log (ordered by seq) fetched on demand.
  const [replayLog, setReplayLog] = useState<CCEvent[]>([]);
  const [replayError, setReplayError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mode !== 'replay') return;
    let cancelled = false;
    setLoading(true);
    setReplayError(null);
    api
      .getReplay(sessionId)
      .then((log) => {
        if (cancelled) return;
        const ordered = Array.isArray(log) ? [...log].sort((a, b) => a.seq - b.seq) : [];
        setReplayLog(ordered);
      })
      .catch((e) => {
        if (!cancelled) setReplayError(e instanceof Error ? e.message : 'Failed to load replay');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, sessionId]);

  const replay = useReplay(replayLog);
  const visibleReplay = replayLog.slice(0, replay.index + 1);
  const currentTs = replay.index >= 0 ? replayLog[replay.index]?.timestamp : undefined;

  const events = mode === 'replay' ? visibleReplay : sessionLiveEvents;
  const meta = session ? agentStateMeta(session.state) : null;

  // Auto-scroll to the newest visible event.
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [events.length]);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex items-center gap-3 border-b border-border bg-card/50 px-4 py-2.5">
        <Link href="/" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
        </Link>
        <span className="text-sm font-semibold">{session?.name ?? sessionId.slice(0, 8)}</span>
        {session && <span className="text-xs text-muted-foreground">{session.role}</span>}
        {meta && <Badge variant={meta.variant}>{meta.label}</Badge>}

        <div className="ml-auto flex items-center gap-3">
          {tokens && (
            <span className="font-mono text-xs text-muted-foreground">
              {formatTokens(tokens.input + tokens.output)} tok · {formatCost(tokens.cost_usd)}
            </span>
          )}
          <div className="flex overflow-hidden rounded-md border border-border">
            {(['live', 'replay'] as Mode[]).map((m) => (
              <Button
                key={m}
                size="sm"
                variant={mode === m ? 'default' : 'ghost'}
                className={cn('rounded-none')}
                onClick={() => setMode(m)}
              >
                {m}
              </Button>
            ))}
          </div>
        </div>
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto">
        {mode === 'replay' && loading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Loading replay log…
          </div>
        ) : mode === 'replay' && replayError ? (
          <div className="flex h-full items-center justify-center text-sm text-destructive">
            {replayError}
          </div>
        ) : events.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {mode === 'replay'
              ? 'No events recorded for this session.'
              : 'No live events yet for this session.'}
          </div>
        ) : (
          events.map((e) => <EventRow key={`${e.session_id}:${e.seq}`} event={e} />)
        )}
      </div>

      {mode === 'replay' && (
        <ReplayControls replay={replay} total={replayLog.length} currentTimestamp={currentTs} />
      )}
    </div>
  );
}
