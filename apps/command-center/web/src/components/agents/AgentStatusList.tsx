'use client';

import Link from 'next/link';
import { useStore } from '@/store/useStore';
import { agentStateMeta } from '@/lib/agent-state';
import { Badge } from '@/components/ui/badge';
import { formatCost, formatTokens, relativeTime } from '@/lib/format';

export function AgentStatusList() {
  const sessions = useStore((s) => s.sessions);
  const tokens = useStore((s) => s.tokensBySession);
  const list = Object.values(sessions).sort((a, b) => a.startedAt - b.startedAt);

  return (
    <section className="flex flex-col">
      <h2 className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Agents · {list.length}
      </h2>
      <div className="divide-y divide-border/60">
        {list.length === 0 ? (
          <p className="px-3 py-4 text-xs text-muted-foreground">No active sessions.</p>
        ) : (
          list.map((a) => {
            const meta = agentStateMeta(a.state);
            const tok = tokens[a.session_id];
            return (
              <Link
                key={a.session_id}
                href={`/sessions/${a.session_id}`}
                className="block px-3 py-2 hover:bg-accent/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">{a.name}</span>
                  <Badge variant={meta.variant}>{meta.label}</Badge>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{a.role}</span>
                  <span className="font-mono">
                    {formatTokens((tok?.input ?? 0) + (tok?.output ?? 0))} tok ·{' '}
                    {formatCost(tok?.cost_usd ?? 0)}
                  </span>
                </div>
                <div className="mt-0.5 text-[10px] text-muted-foreground">
                  {a.model} · {relativeTime(a.lastEventAt)}
                </div>
              </Link>
            );
          })
        )}
      </div>
    </section>
  );
}
