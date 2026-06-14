// EventBus — per-session monotonic seq + persist-then-return.
// Run against an in-memory DB (see the package.json "test" script).
import { test, expect, beforeAll } from 'bun:test';
import { eq } from 'drizzle-orm';
import { runMigrations } from '../src/db/migrate';
import { db } from '../src/db/client';
import { events } from '../src/db/schema';
import { eventBus } from '../src/bus/event-bus';

beforeAll(() => {
  runMigrations();
});

test('assigns per-session monotonic seq, independent across sessions', () => {
  const a = eventBus.emit({ session_id: 's1', hook_event_type: 'SessionStart', payload: {} });
  const b = eventBus.emit({ session_id: 's1', hook_event_type: 'UserPromptSubmit', payload: {} });
  const c = eventBus.emit({ session_id: 's2', hook_event_type: 'SessionStart', payload: {} });
  expect(a.seq).toBe(1);
  expect(b.seq).toBe(2);
  expect(c.seq).toBe(1);
});

test('applies source_app + timestamp defaults and persists', () => {
  const e = eventBus.emit({ session_id: 's3', hook_event_type: 'SessionStart', payload: { foo: 1 } });
  expect(e.source_app).toBe('command-center');
  expect(typeof e.timestamp).toBe('number');
  expect(typeof e.id).toBe('number');

  const rows = db.select().from(events).where(eq(events.sessionId, 's3')).all();
  expect(rows.length).toBe(1);
  expect(rows[0]!.seq).toBe(1);
  expect(rows[0]!.payload).toEqual({ foo: 1 });
});

test('seq counter re-seeds from persisted MAX(seq) for a fresh session id', () => {
  // Pre-insert a row with seq 5 for a session the bus has never seen in-memory.
  db.insert(events)
    .values({
      seq: 5,
      sourceApp: 'command-center',
      sessionId: 'preseed',
      hookEventType: 'SessionStart',
      payload: {},
      timestamp: 1,
    })
    .run();
  const next = eventBus.emit({ session_id: 'preseed', hook_event_type: 'Stop', payload: {} });
  expect(next.seq).toBe(6);
});
