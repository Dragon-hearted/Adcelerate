'use client';

import { useStore } from '@/store/useStore';
import { relativeTime } from '@/lib/format';

/**
 * Provider-scoped budget-guard trip signal (slice #38 / ADR-0007). image-engine
 * owns the cost data + the block point — when a serving provider's cumulative
 * spend crosses its budget-line the next gen is 402-blocked and image-engine
 * POSTs a trip to `/api/budget-trip`, which the orchestrator broadcasts over the
 * existing socket. This surfaces it as a stack of dismissible banners so a
 * runaway provider never burns budget silently. Transient — mirrors the #33
 * IncompatibilityBanner precedent (a signal, not persisted state).
 */
export function BudgetTripBanner() {
  const budgetTrips = useStore((s) => s.budgetTrips);
  const dismiss = useStore((s) => s.dismissBudgetTrip);

  if (budgetTrips.length === 0) return null;

  return (
    <div className="flex flex-col gap-px">
      {budgetTrips.map((s) => (
        <div
          key={`${s.provider}:${s.model}:${s.at}`}
          role="alert"
          className="flex items-center gap-3 border-b border-destructive/40 bg-destructive/15 px-4 py-2 text-sm text-destructive-foreground"
        >
          <span className="shrink-0 rounded bg-destructive px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-destructive-foreground">
            Budget
          </span>
          <span className="min-w-0 flex-1">
            <span className="font-semibold">{s.provider}</span>/
            <span className="font-mono">{s.model}</span> hit budget-line:{' '}
            <span className="font-mono">${s.spentUsd.toFixed(2)}</span> /{' '}
            <span className="font-mono">${s.limitUsd.toFixed(2)}</span>. Next
            generation blocked.{' '}
            <span className="text-muted-foreground">{relativeTime(s.at)}</span>
          </span>
          <button
            type="button"
            onClick={() => dismiss(s.at, s.provider, s.model)}
            aria-label="Dismiss"
            className="shrink-0 rounded px-2 py-0.5 text-xs text-muted-foreground hover:bg-destructive/30 hover:text-destructive-foreground"
          >
            Dismiss
          </button>
        </div>
      ))}
    </div>
  );
}
