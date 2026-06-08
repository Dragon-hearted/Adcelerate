'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { X } from 'lucide-react';
import type { FileChange } from '@command-center/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api, type FileDiffResponse } from '@/lib/api';
import { languageFromPath, parseUnifiedDiff } from '@/lib/diff';

// Monaco DiffEditor is browser-only + heavy — lazy-load with no SSR.
const DiffEditor = dynamic(
  () => import('@monaco-editor/react').then((m) => m.DiffEditor),
  { ssr: false },
);

function normalizeDiff(body: FileDiffResponse | string): string {
  return typeof body === 'string' ? body : body.diff ?? '';
}

/**
 * Modal Monaco diff editor for a single file change. Prefers the unified diff
 * already attached to the FileChange (from the watcher); falls back to fetching
 * GET /api/files/diff?path= on demand.
 */
export function DiffViewer({ change, onClose }: { change: FileChange; onClose: () => void }) {
  const [diffText, setDiffText] = useState<string | null>(change.diff ?? null);
  const [loading, setLoading] = useState(!change.diff);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (change.diff) {
      setDiffText(change.diff);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api
      .getFileDiff(change.path)
      .then((body) => {
        if (!cancelled) setDiffText(normalizeDiff(body));
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load diff');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [change.path, change.diff]);

  const { original, modified } = useMemo(
    () => parseUnifiedDiff(diffText ?? ''),
    [diffText],
  );
  const language = languageFromPath(change.path);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
      onClick={onClose}
    >
      <div
        className="flex h-[80vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-border bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center gap-2 border-b border-border px-4 py-2.5">
          <Badge
            variant={
              change.changeType === 'delete'
                ? 'destructive'
                : change.changeType === 'add'
                  ? 'success'
                  : 'warning'
            }
          >
            {change.changeType}
          </Badge>
          <span className="truncate font-mono text-sm">{change.path}</span>
          {change.agentName && (
            <span className="text-xs font-medium text-primary">{change.agentName}</span>
          )}
          {(change.additions != null || change.deletions != null) && (
            <span className="font-mono text-xs">
              <span className="text-success">+{change.additions ?? 0}</span>{' '}
              <span className="text-destructive">−{change.deletions ?? 0}</span>
            </span>
          )}
          <Button size="icon" variant="ghost" className="ml-auto" onClick={onClose}>
            <X />
          </Button>
        </header>

        <div className="min-h-0 flex-1">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Loading diff…
            </div>
          ) : error ? (
            <div className="flex h-full items-center justify-center text-sm text-destructive">
              {error}
            </div>
          ) : !diffText ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No diff available for this change.
            </div>
          ) : (
            <DiffEditor
              height="100%"
              theme="vs-dark"
              language={language}
              original={original}
              modified={modified}
              options={{
                readOnly: true,
                renderSideBySide: true,
                minimap: { enabled: false },
                fontSize: 12,
                scrollBeyondLastLine: false,
                automaticLayout: true,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
