'use client';

import { useEffect, useState } from 'react';
import { FileDiff, FilePlus, FileX, Pencil } from 'lucide-react';
import type { FileChange, FileChangeType } from '@command-center/shared';
import { useStore } from '@/store/useStore';
import { api } from '@/lib/api';
import { relativeTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { DiffViewer } from './DiffViewer';

function changeIcon(t: FileChangeType) {
  if (t === 'add') return <FilePlus className="size-3.5 text-success" />;
  if (t === 'delete') return <FileX className="size-3.5 text-destructive" />;
  return <Pencil className="size-3.5 text-warning" />;
}

/**
 * Working-tree file changes (sub-stream A). Hydrates from
 * GET /api/files/changes and stays live via the `file:changed` socket event.
 * Click a row to open the Monaco diff. Each change is attributed to the agent
 * whose most-recent Write/Edit touched the path.
 */
export function FileChangePanel() {
  const fileChanges = useStore((s) => s.fileChanges);
  const setFileChanges = useStore((s) => s.setFileChanges);
  const [active, setActive] = useState<FileChange | null>(null);

  // Initial REST hydration (the socket keeps it fresh thereafter).
  useEffect(() => {
    let cancelled = false;
    api
      .listFileChanges()
      .then((changes) => {
        if (!cancelled && Array.isArray(changes)) setFileChanges(changes);
      })
      .catch(() => {
        /* route may not be live yet (sub-stream A) — ignore */
      });
    return () => {
      cancelled = true;
    };
  }, [setFileChanges]);

  return (
    <section className="flex flex-col">
      <h2 className="flex items-center gap-1.5 border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <FileDiff className="size-3.5" /> Changes · {fileChanges.length}
      </h2>

      {fileChanges.length === 0 ? (
        <p className="px-3 py-4 text-xs text-muted-foreground">No file changes yet.</p>
      ) : (
        <ul className="divide-y divide-border/60">
          {fileChanges.map((c, i) => (
            <li key={`${c.path}-${c.timestamp}-${i}`}>
              <button
                type="button"
                onClick={() => setActive(c)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-accent/40"
              >
                {changeIcon(c.changeType)}
                <span className="min-w-0 flex-1 truncate font-mono">{c.path}</span>
                {(c.additions != null || c.deletions != null) && (
                  <span className="shrink-0 font-mono">
                    <span className="text-success">+{c.additions ?? 0}</span>{' '}
                    <span className="text-destructive">−{c.deletions ?? 0}</span>
                  </span>
                )}
                {c.agentName && (
                  <span className={cn('shrink-0 font-medium text-primary')}>{c.agentName}</span>
                )}
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {relativeTime(c.timestamp)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {active && <DiffViewer change={active} onClose={() => setActive(null)} />}
    </section>
  );
}
