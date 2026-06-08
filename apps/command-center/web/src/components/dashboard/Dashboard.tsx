'use client';

import { useSocketBridge } from '@/hooks/useSocketBridge';
import { TopBar } from '@/components/dashboard/TopBar';
import { LiveTimeline } from '@/components/timeline/LiveTimeline';
import { ApprovalsPanel } from '@/components/approvals/ApprovalsPanel';
import { PromptConsole } from '@/components/console/PromptConsole';
import { GitHubPanel } from '@/components/github/GitHubPanel';
import { AgentStatusList } from '@/components/agents/AgentStatusList';
import { FileChangePanel } from '@/components/files/FileChangePanel';

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

      <div className="flex min-h-0 flex-1">
        {/* Center column: pending approvals dock above the live timeline. */}
        <main className="flex min-w-0 flex-1 flex-col">
          <ApprovalsPanel />
          <div className="min-h-0 flex-1">
            <LiveTimeline />
          </div>
        </main>

        {/* Right sidebar: agent roster, working-tree changes, GitHub insights. */}
        <aside className="flex w-80 shrink-0 flex-col overflow-y-auto border-l border-border bg-card/30">
          <AgentStatusList />
          <FileChangePanel />
          <GitHubPanel />
        </aside>
      </div>

      <PromptConsole />
    </div>
  );
}
