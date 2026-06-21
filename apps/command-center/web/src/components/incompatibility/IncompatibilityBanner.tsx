'use client';

import { useStore } from '@/store/useStore';
import { relativeTime } from '@/lib/format';

/**
 * Out-of-window envelope reject signal (slice #33 / ADR-0020). The orchestrator
 * 4xx-rejects an Emitter envelope whose version falls outside the supported
 * window and broadcasts an `incompatibility` over the existing socket; this
 * surfaces it as a stack of dismissible banners so a drifted producer never
 * fails silently. Transient — a rejected envelope mutates no projected state.
 */
export function IncompatibilityBanner() {
  const incompatibilities = useStore((s) => s.incompatibilities);
  const dismiss = useStore((s) => s.dismissIncompatibility);

  if (incompatibilities.length === 0) return null;

  return (
    <div className="flex flex-col gap-px">
      {incompatibilities.map((s) => (
        <div
          key={`${s.producerSystem}:${s.gotVersion}:${s.at}`}
          role="alert"
          className="flex items-center gap-3 border-b border-destructive/40 bg-destructive/15 px-4 py-2 text-sm text-destructive-foreground"
        >
          <span className="shrink-0 rounded bg-destructive px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-destructive-foreground">
            Incompatible
          </span>
          <span className="min-w-0 flex-1">
            <span className="font-semibold">{s.producerSystem}</span> emitted
            envelope version{' '}
            <span className="font-mono">{s.gotVersion}</span> — outside supported{' '}
            <span className="font-mono">{s.supported}</span>. Rejected; no state
            changed.{' '}
            <span className="text-muted-foreground">{relativeTime(s.at)}</span>
          </span>
          <button
            type="button"
            onClick={() => dismiss(s.at, s.producerSystem)}
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
