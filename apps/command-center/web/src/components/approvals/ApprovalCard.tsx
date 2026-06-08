'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Check, Pencil, X } from 'lucide-react';
import type { ApprovalDecision, ApprovalRequest } from '@command-center/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { pretty } from '@/lib/format';
import { getSocket } from '@/lib/socket';
import { api } from '@/lib/api';

// Monaco is heavy + browser-only — load it lazily, no SSR.
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

function respond(decision: ApprovalDecision) {
  // Prefer the low-latency WS path; fall back to REST if the socket is down.
  const socket = getSocket();
  if (socket.connected) {
    socket.emit('approval:respond', decision);
  } else {
    void api.respondApproval(decision.id, decision).catch((e) => console.error(e));
  }
}

export function ApprovalCard({ request }: { request: ApprovalRequest }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => pretty(request.tool_input ?? {}));
  const [error, setError] = useState<string | null>(null);

  const base = {
    id: request.id,
    respondedAt: Date.now(),
    respondedBy: 'operator',
  };

  function approve() {
    respond({ ...base, decision: 'approve' });
  }
  function deny() {
    respond({ ...base, decision: 'deny' });
  }
  function submitModify() {
    try {
      const updatedInput = JSON.parse(draft);
      setError(null);
      respond({ ...base, decision: 'modify', updatedInput });
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid JSON');
    }
  }

  return (
    <Card className="border-warning/40">
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Badge variant="warning">permission</Badge>
          <span className="font-mono">{request.tool_name ?? 'tool'}</span>
        </CardTitle>
        {request.agent_name && (
          <span className="text-xs font-medium text-primary">{request.agent_name}</span>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {editing ? (
          <div className="space-y-2">
            <div className="overflow-hidden rounded-md border border-border">
              <MonacoEditor
                height="220px"
                defaultLanguage="json"
                theme="vs-dark"
                value={draft}
                onChange={(v) => setDraft(v ?? '')}
                options={{
                  minimap: { enabled: false },
                  fontSize: 12,
                  lineNumbers: 'off',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                }}
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button size="sm" variant="success" onClick={submitModify}>
                <Check /> Apply &amp; Approve
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <pre className="max-h-40 overflow-auto rounded-md bg-muted/60 p-2 font-mono text-xs text-muted-foreground">
              {pretty(request.tool_input ?? {})}
            </pre>
            <div className="flex gap-2">
              <Button size="sm" variant="success" onClick={approve}>
                <Check /> Approve
              </Button>
              <Button size="sm" variant="destructive" onClick={deny}>
                <X /> Deny
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                <Pencil /> Modify
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
