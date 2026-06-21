'use client';

import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { Boxes, CheckCircle2, Download, AlertTriangle } from 'lucide-react';
import type { SystemFreshness } from '@command-center/shared';
import { useStore } from '@/store/useStore';
import { api } from '@/lib/api';

/**
 * System catalog + two-tier freshness signal (slice #40 / ADR-0021,0022). Systems
 * are SHA-pinned, lazily-initialized submodules; the orchestrator reports delivery
 * facts (`SystemFreshness`) over `GET /api/systems` — pinned SHA, populated, drift.
 *
 * The freshness TIER is fused CLIENT-SIDE from two cheap sources, per row:
 *   - `!populated`  → "not installed" + an Install button (POST .../ensure).
 *   - a live `incompatibilities` entry (slice #33) whose `producerSystem` matches
 *     → hard "too old — update required" (reuses the #33 destructive visual language).
 *   - `drift`       → soft "update available".
 *   - else          → "up to date".
 *
 * // ponytail: no-new-socket-event — the hard tier is the existing #33
 *    `incompatibilities` slice fused with the REST delivery facts client-side; no
 *    server-side join, no extra socket event, no new store slice.
 * // ponytail: git-status-is-the-registry — `git submodule status` (parsed
 *    orchestrator-side) IS the version registry; the web just renders its facts.
 */

type Tier = 'not-installed' | 'too-old' | 'update-available' | 'up-to-date';

export function SystemCatalogPanel() {
  // Existing #33 slice — the hard tier reuses it (no new slice, no new socket event).
  const incompatibilities = useStore((s) => s.incompatibilities);
  const [systems, setSystems] = useState<SystemFreshness[]>([]);
  const [installing, setInstalling] = useState<string | null>(null);

  const load = useCallback(() => {
    let cancelled = false;
    api
      .listSystems()
      .then((rows) => {
        if (!cancelled && Array.isArray(rows)) setSystems(rows);
      })
      .catch(() => {
        /* route may not be live yet — leave the catalog empty */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Lazy: fetch on mount + after an Install only — no polling loop.
  useEffect(() => load(), [load]);

  const install = useCallback(
    (name: string) => {
      setInstalling(name);
      api
        .ensureSystem(name)
        .then(() => load()) // refetch /api/systems on success
        .catch(() => {
          /* surfaced by the unchanged row staying "not installed" */
        })
        .finally(() => setInstalling(null));
    },
    [load],
  );

  return (
    <section className="flex flex-col">
      <h2 className="flex items-center gap-1.5 border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Boxes className="size-3.5" /> Systems · {systems.length}
      </h2>

      {systems.length === 0 ? (
        <p className="px-3 py-4 text-xs text-muted-foreground">No systems reported.</p>
      ) : (
        <ul className="divide-y divide-border/60">
          {systems.map((s) => {
            // Fuse the live #33 signal: a hard skew is an out-of-window producer.
            const hardSkew = incompatibilities.some(
              (x) => x.producerSystem === s.name,
            );
            const tier: Tier = !s.populated
              ? 'not-installed'
              : hardSkew
                ? 'too-old'
                : s.drift
                  ? 'update-available'
                  : 'up-to-date';

            return (
              <li key={s.name} className="flex items-center gap-2 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium text-foreground">
                    {s.name}
                  </div>
                  <div className="truncate font-mono text-[10px] text-muted-foreground">
                    {s.pinnedSha.slice(0, 10)}
                  </div>
                </div>

                <TierBadge tier={tier} />

                {tier === 'not-installed' && (
                  <button
                    type="button"
                    onClick={() => install(s.name)}
                    disabled={installing === s.name}
                    className="flex shrink-0 items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[10px] font-semibold text-foreground hover:bg-accent disabled:opacity-50"
                  >
                    <Download className="size-3" />
                    {installing === s.name ? 'Installing…' : 'Install'}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// Exhaustive per-tier badge — keyed so a new Tier is a compile error, not a
// silent fallthrough. `too-old` reuses the #33 IncompatibilityBanner language.
const TIER_BADGE: Record<Tier, ReactElement> = {
  'too-old': (
    <span className="flex shrink-0 items-center gap-1 rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-destructive-foreground">
      <AlertTriangle className="size-3 text-destructive" /> too old
    </span>
  ),
  'update-available': (
    <span className="shrink-0 rounded bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warning">
      update available
    </span>
  ),
  'not-installed': (
    <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
      not installed
    </span>
  ),
  'up-to-date': (
    <span className="flex shrink-0 items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-success">
      <CheckCircle2 className="size-3" /> up to date
    </span>
  ),
};

function TierBadge({ tier }: { tier: Tier }) {
  return TIER_BADGE[tier];
}
