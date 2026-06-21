'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Send, Zap } from 'lucide-react';
import {
  AGENT_ROLES,
  type AgentRole,
  type SystemFreshness,
} from '@command-center/shared';
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

  // Drive-mode form state (slice #39). A control-plane command (task + optional
  // target system) routed by adcelerate-execute — distinct from the free-form
  // Reflect prompt below. Systems feed the optional hint dropdown (#40).
  const [driveTask, setDriveTask] = useState('');
  const [driveSystem, setDriveSystem] = useState('');
  const [systems, setSystems] = useState<SystemFreshness[]>([]);

  // Load the system list once for the optional Drive hint dropdown. Best-effort:
  // the hint is optional, so a failed fetch just leaves an empty dropdown.
  useEffect(() => {
    let cancelled = false;
    api
      .listSystems()
      .then((rows) => {
        if (!cancelled) setSystems(rows);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

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

  // Drive: POST /api/drive → control-plane command. On success, subscribe the
  // returned sessionId (the same `session:subscribe` room-join SessionView uses)
  // and select it in the picker, so its Run streams live onto the Canvas. The
  // free-form Reflect path (submitPrompt) is untouched.
  async function submitDrive() {
    const task = driveTask.trim();
    if (!task) return;
    setBusy(true);
    setError(null);
    try {
      const { sessionId } = await api.drive(task, driveSystem || undefined);
      getSocket().emit('session:subscribe', sessionId);
      setSelected(sessionId);
      setDriveTask('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to dispatch Drive command');
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

      {/* Drive: control-plane command (REST). Routed by adcelerate-execute to a
          targeted system; the returned session's Run streams onto the Canvas.
          Distinct from the free-form Reflect prompt below. */}
      <div className="mb-2 rounded-md border border-primary/40 bg-primary/5 p-2">
        <div className="mb-1 flex items-center gap-1.5">
          <Zap className="size-3.5 text-primary" />
          <span className="text-xs font-medium uppercase tracking-wide text-primary">
            Drive
          </span>
          <span className="text-xs text-muted-foreground">command → system Run</span>
        </div>
        <div className="flex items-end gap-2">
          <input
            value={driveTask}
            onChange={(e) => setDriveTask(e.target.value)}
            placeholder="Command a system to run a task…  (Enter to drive)"
            className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void submitDrive();
              }
            }}
          />
          <Select
            value={driveSystem}
            onChange={(e) => setDriveSystem(e.target.value)}
            className="max-w-[180px]"
          >
            <option value="">auto-route</option>
            {systems.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}
              </option>
            ))}
          </Select>
          <Button onClick={submitDrive} disabled={busy || !driveTask.trim()}>
            {busy ? <Loader2 className="animate-spin" /> : <Zap />} Drive
          </Button>
        </div>
      </div>

      {/* Reflect: free-form prompt to the selected agent (socket session:prompt). */}
      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Reflect
      </div>
      <div className="flex items-end gap-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Send a free-form prompt to the selected agent…  (⌘/Ctrl+Enter to send)"
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
