'use client';

import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import { ApprovalCard } from './ApprovalCard';
import { QuestionCard } from './QuestionCard';

/**
 * Renders all pending approvals/questions inline. Empty when nothing is
 * blocking — kept compact so it can dock above the timeline or in a column.
 *
 * This is the SINGLE approve/deny surface (ApprovalCard). The Canvas only shows a
 * non-interactive ⏸ overlay that DEEP-LINKS here (#43) — it never approves.
 */
export function ApprovalsPanel() {
  const approvals = useStore((s) => s.approvals);
  const focusedId = useStore((s) => s.focusedApprovalId);
  const list = Object.values(approvals).sort((a, b) => a.createdAt - b.createdAt);

  // #43 deep-link: a Canvas ⏸ overlay click sets focusedApprovalId → scroll the
  // matching card into view and ring it, then clear the focus (transient highlight,
  // like the inline cascade toasts). No router/no new dep — element id + scrollIntoView.
  useEffect(() => {
    if (!focusedId) return;
    document
      .getElementById(`approval-${focusedId}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const t = setTimeout(() => useStore.getState().focusApproval(null), 2500);
    return () => clearTimeout(t);
  }, [focusedId]);

  if (list.length === 0) return null;

  return (
    <div className="space-y-2 border-b border-border bg-warning/5 p-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-warning">
        Awaiting you · {list.length}
      </h2>
      <div className="grid gap-2">
        {list.map((r) => (
          <div
            key={r.id}
            id={`approval-${r.id}`}
            className={cn(
              'rounded-lg transition-shadow',
              focusedId === r.id && 'ring-2 ring-warning ring-offset-2 ring-offset-background',
            )}
          >
            {r.kind === 'permission' ? (
              <ApprovalCard request={r} />
            ) : (
              <QuestionCard request={r} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
