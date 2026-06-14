'use client';

import { useEffect, useState } from 'react';
import { Activity, CircleDot, DollarSign, Gauge, TrendingUp } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { agentStateMeta } from '@/lib/agent-state';
import { Badge } from '@/components/ui/badge';
import { formatCost } from '@/lib/format';
import { BURN_WINDOW_MS } from '@/lib/config';
import { cn } from '@/lib/utils';

// A live clock tick so the rolling burn-rate window refreshes even when no new
// token:tick arrives (so the rate decays to zero as samples age out).
function useTick(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function TopBar() {
  const now = useTick(1000);
  const connected = useStore((s) => s.connected);
  const sessions = useStore((s) => s.sessions);
  const costSamples = useStore((s) => s.costSamples);
  const tokensBySession = useStore((s) => s.tokensBySession);

  // Δcost/min over the rolling window.
  const cutoff = now - BURN_WINDOW_MS;
  const windowCost = costSamples
    .filter((s) => s.ts >= cutoff)
    .reduce((sum, s) => sum + s.cost, 0);
  const burnPerMin = windowCost * (60_000 / BURN_WINDOW_MS);

  const totalCost = Object.values(tokensBySession).reduce(
    (sum, t) => sum + t.cost_usd,
    0,
  );
  // Naive forward projection: current burn rate sustained for an hour.
  const projectedHourly = burnPerMin * 60;

  const agents = Object.values(sessions).sort((a, b) => a.startedAt - b.startedAt);

  return (
    <header className="flex items-center gap-6 border-b border-border bg-card/50 px-4 py-2.5">
      <div className="flex items-center gap-2">
        <Gauge className="size-5 text-primary" />
        <span className="text-sm font-semibold tracking-tight">Command Center</span>
        <span
          className={cn(
            'ml-1 inline-flex items-center gap-1 text-xs',
            connected ? 'text-success' : 'text-muted-foreground',
          )}
          title={connected ? 'Connected to orchestrator' : 'Disconnected'}
        >
          <CircleDot className={cn('size-3', connected && 'animate-pulse-soft')} />
          {connected ? 'live' : 'offline'}
        </span>
      </div>

      <div className="flex items-center gap-5 text-sm">
        <Metric icon={<TrendingUp className="size-4 text-warning" />} label="burn">
          <span className="font-mono">{formatCost(burnPerMin)}</span>
          <span className="text-xs text-muted-foreground">/min</span>
        </Metric>
        <Metric icon={<Activity className="size-4 text-primary" />} label="proj/hr">
          <span className="font-mono">{formatCost(projectedHourly)}</span>
        </Metric>
        <Metric icon={<DollarSign className="size-4 text-success" />} label="total">
          <span className="font-mono">{formatCost(totalCost)}</span>
        </Metric>
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        {agents.length === 0 ? (
          <span className="text-xs text-muted-foreground">no active agents</span>
        ) : (
          agents.map((a) => {
            const meta = agentStateMeta(a.state);
            return (
              <Badge key={a.session_id} variant={meta.variant} title={`${a.role} · ${a.state}`}>
                <span className="font-medium">{a.name}</span>
                <span className="opacity-70">{meta.label}</span>
              </Badge>
            );
          })
        )}
      </div>
    </header>
  );
}

function Metric({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {icon}
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="flex items-baseline gap-0.5">{children}</span>
    </div>
  );
}
