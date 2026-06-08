'use client';

import type { AgentDescriptor, CCEvent } from '@command-center/shared';
import { BURN_WINDOW_MS } from '@/lib/config';
import { useStore } from './useStore';

/** Δcost/min over the rolling burn window, derived from token:tick samples. */
export function selectBurnRatePerMin(now: number = Date.now()): number {
  const samples = useStore.getState().costSamples;
  const cutoff = now - BURN_WINDOW_MS;
  const windowCost = samples
    .filter((s) => s.ts >= cutoff)
    .reduce((sum, s) => sum + s.cost, 0);
  // Scale the windowed spend up to a per-minute rate.
  return windowCost * (60_000 / BURN_WINDOW_MS);
}

/** Total cost across all sessions. */
export function selectTotalCost(): number {
  const tokens = useStore.getState().tokensBySession;
  return Object.values(tokens).reduce((sum, t) => sum + t.cost_usd, 0);
}

export function selectTotals() {
  const tokens = useStore.getState().tokensBySession;
  return Object.values(tokens).reduce(
    (acc, t) => {
      acc.input += t.input;
      acc.output += t.output;
      acc.cost_usd += t.cost_usd;
      return acc;
    },
    { input: 0, output: 0, cost_usd: 0 },
  );
}

export function selectSessionList(): AgentDescriptor[] {
  return Object.values(useStore.getState().sessions).sort(
    (a, b) => a.startedAt - b.startedAt,
  );
}

/** Events filtered to a single session (for the replay / focus view). */
export function filterEventsForSession(events: CCEvent[], sessionId: string): CCEvent[] {
  return events
    .filter((e) => e.session_id === sessionId)
    .sort((a, b) => a.seq - b.seq);
}
