'use client';

import { useSocketBridge } from '@/hooks/useSocketBridge';
import { TopBar } from '@/components/dashboard/TopBar';
import { LiveTimeline } from '@/components/timeline/LiveTimeline';
import { ApprovalsPanel } from '@/components/approvals/ApprovalsPanel';
import { PromptConsole } from '@/components/console/PromptConsole';
import { GitHubPanel } from '@/components/github/GitHubPanel';
import { SpawnTree } from '@/components/agents/SpawnTree';
import { FileChangePanel } from '@/components/files/FileChangePanel';
import { SystemCatalogPanel } from '@/components/systems/SystemCatalogPanel';
import { Canvas } from '@/components/canvas/Canvas';
import { IncompatibilityBanner } from '@/components/incompatibility/IncompatibilityBanner';
import { BudgetTripBanner } from '@/components/budget/BudgetTripBanner';

/**
 * Top-level dashboard grid (the architecture diagram):
 *   ┌──────────────── TopBar (burn / cost / health) ────────────────┐
 *   │  LiveTimeline (center)                │ GitHub + Agents (right) │
 *   ├───────────────────────────────────────────────────────────────┤
 *   │  PromptConsole (bottom)                                        │
 *   └───────────────────────────────────────────────────────────────┘
 */
export function Dashboard() {
  useSocketBridge();

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TopBar />

      {/* Out-of-window envelope rejects (slice #33) — dismissible, off the socket. */}
      <IncompatibilityBanner />

      {/* Provider budget-guard trips (slice #38) — dismissible, off the socket. */}
      <BudgetTripBanner />

      <div className="flex min-h-0 flex-1">
        {/* Center column: pending approvals dock above the live timeline. */}
        <main className="flex min-w-0 flex-1 flex-col">
          <ApprovalsPanel />
          <div className="flex min-h-0 flex-1">
            <div className="min-w-0 flex-1">
              <LiveTimeline />
            </div>
            {/* Right zone beside the timeline: the live Run Canvas (slice #31). */}
            <div className="min-w-0 flex-1 border-l border-border">
              <Canvas />
            </div>
          </div>
        </main>

        {/* Right sidebar: Spawn Tree telemetry, working-tree changes, GitHub insights. */}
        {/* ponytail: ADR-0004 calls the Spawn Tree left-zone telemetry; we swap the
            flat AgentStatusList for the nested tree IN PLACE without relocating the
            whole layout. */}
        <aside className="flex w-80 shrink-0 flex-col overflow-y-auto border-l border-border bg-card/30">
          <SpawnTree />
          <SystemCatalogPanel />
          <FileChangePanel />
          <GitHubPanel />
        </aside>
      </div>

      <PromptConsole />
    </div>
  );
}
