'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Send } from 'lucide-react';
import { AGENT_ROLES, type AgentRole } from '@command-center/shared';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useStore } from '@/store/useStore';
import { getSocket } from '@/lib/socket';
import { api } from '@/lib/api';

/**
 * Bottom console: pick a target session (or spin up a new one), type a prompt,
 * submit → `session:prompt`. Output streams back into the LiveTimeline.
 */
export function PromptConsole() {
  const sessions = useStore((s) => s.sessions);
  const sessionList = useMemo(
    () => Object.values(sessions).sort((a, b) => a.startedAt - b.startedAt),
    [sessions],
  );

  const [selected, setSelected] = useState<string>('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New-session form state.
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<AgentRole>('generalist');

  // Default the picker to the first session once any exist.
  useEffect(() => {
    if (!selected && sessionList.length > 0) setSelected(sessionList[0]!.session_id);
  }, [sessionList, selected]);

  async function submitPrompt() {
    const sessionId = selected;
    const body = text.trim();
    if (!sessionId || !body) return;
    setBusy(true);
    setError(null);
    try {
      const socket = getSocket();
      if (socket.connected) {
        socket.emit('session:prompt', { sessionId, text: body });
      } else {
        await api.promptSession(sessionId, body);
      }
      setText('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send prompt');
    } finally {
      setBusy(false);
    }
  }

  async function createSession() {
    if (!newName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const created = await api.createSession({ name: newName.trim(), role: newRole });
      setSelected(created.session_id);
      setCreating(false);
      setNewName('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create session');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-t border-border bg-card/50 p-3">
      {error && <p className="mb-2 text-xs text-destructive">{error}</p>}

      {creating ? (
        <div className="mb-2 flex items-end gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-muted-foreground">Name</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. backend"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Role</label>
            <Select value={newRole} onChange={(e) => setNewRole(e.target.value as AgentRole)}>
              {AGENT_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </div>
          <Button size="sm" onClick={createSession} disabled={busy || !newName.trim()}>
            Create
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setCreating(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <div className="mb-2 flex items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">agent</span>
          <Select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="max-w-[220px]"
            disabled={sessionList.length === 0}
          >
            {sessionList.length === 0 ? (
              <option value="">no sessions</option>
            ) : (
              sessionList.map((s) => (
                <option key={s.session_id} value={s.session_id}>
                  {s.name} · {s.role} · {s.state}
                </option>
              ))
            )}
          </Select>
          <Button size="sm" variant="outline" onClick={() => setCreating(true)}>
            <Plus /> New
          </Button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Send a prompt to the selected agent…  (⌘/Ctrl+Enter to send)"
          rows={2}
          className="flex-1 font-mono"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void submitPrompt();
            }
          }}
        />
        <Button onClick={submitPrompt} disabled={busy || !selected || !text.trim()}>
          {busy ? <Loader2 className="animate-spin" /> : <Send />} Send
        </Button>
      </div>
    </div>
  );
}
