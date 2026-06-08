'use client';

import { useStore } from '@/store/useStore';
import { ApprovalCard } from './ApprovalCard';
import { QuestionCard } from './QuestionCard';

/**
 * Renders all pending approvals/questions inline. Empty when nothing is
 * blocking — kept compact so it can dock above the timeline or in a column.
 */
export function ApprovalsPanel() {
  const approvals = useStore((s) => s.approvals);
  const list = Object.values(approvals).sort((a, b) => a.createdAt - b.createdAt);

  if (list.length === 0) return null;

  return (
    <div className="space-y-2 border-b border-border bg-warning/5 p-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-warning">
        Awaiting you · {list.length}
      </h2>
      <div className="grid gap-2">
        {list.map((r) =>
          r.kind === 'permission' ? (
            <ApprovalCard key={r.id} request={r} />
          ) : (
            <QuestionCard key={r.id} request={r} />
          ),
        )}
      </div>
    </div>
  );
}
