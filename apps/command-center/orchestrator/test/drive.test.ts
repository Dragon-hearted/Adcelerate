// ─────────────────────────────────────────────────────────────────────────────
// POST /api/drive — Drive-mode dispatch (slice #39 / ADR-0002). Proves the route
// surface with the SDK SPAWN MOCKED (no real Claude subprocess):
//   • a Drive session is created whose SDK options carry skills:['adcelerate-execute']
//     + the repo-local plugin, with settingSources:[] preserved;
//   • EXACTLY ONE cc.drive.requested is emitted on the new session (pinned payload);
//   • the route returns { sessionId }; systemHint is forwarded;
//   • empty/missing task → 400 and NO session/event.
//
// The capturing queryFn (set on the singleton SessionRegistry via setAgentHooks)
// records the Options buildOptions() produced — the empirical skill-loading proof
// is the manual Task-0 smoke test, NOT a CI gate (no provider spend here).
// Runs against the in-memory DB (CC_DB_PATH=:memory:) via `bun run test`.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeAll } from 'bun:test';
import Fastify, { type FastifyInstance } from 'fastify';
import type { SDKMessage, Query, Options } from '@anthropic-ai/claude-agent-sdk';
import type { CCEvent } from '@command-center/shared';
import { runMigrations } from '../src/db/migrate';
import { driveRoutes } from '../src/routes/drive';
import { sessionRegistry } from '../src/agents/registry';
import { eventBus } from '../src/bus/event-bus';
import type { QueryFn } from '../src/agents/session';

const msg = (m: unknown): SDKMessage => m as SDKMessage;

// Last Options the (mocked) SDK was spawned with — the spawn assertion target.
// A holder (not a bare `let`) so control-flow analysis keeps the `Options` type
// across the queryFn callback boundary instead of narrowing it to `undefined`.
const captured: { options?: Options } = {};

// Fake query(): captures options, drains the first user turn, emits a result, ends.
// No real Claude subprocess.
const captureQuery: QueryFn = ({ prompt, options }) => {
  captured.options = options;
  const gen = (async function* () {
    for await (const _turn of prompt as AsyncIterable<unknown>) {
      void _turn;
      break;
    }
    yield msg({
      type: 'result', subtype: 'success', total_cost_usd: 0,
      usage: { input_tokens: 0, output_tokens: 0 }, modelUsage: {},
      num_turns: 1, is_error: false, result: 'ok', stop_reason: null, permission_denials: [],
    });
  })();
  (gen as unknown as { interrupt: () => Promise<void> }).interrupt = async () => {};
  return gen as unknown as Query;
};

beforeAll(() => {
  runMigrations();
  // Mock the SDK spawn for every session the registry creates in this file.
  sessionRegistry.setAgentHooks({ queryFn: captureQuery });
});

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify();
  await app.register(driveRoutes);
  await app.ready();
  return app;
}

function collectDriveEvents(): { events: CCEvent[]; off: () => void } {
  const events: CCEvent[] = [];
  const off = eventBus.on((e) => {
    if (e.hook_event_type === 'cc.drive.requested') events.push(e);
  });
  return { events, off };
}

describe('POST /api/drive', () => {
  it('spawns a skill-loaded session, emits ONE cc.drive.requested, returns sessionId', async () => {
    const app = await buildApp();
    const { events, off } = collectDriveEvents();

    const task = 'Generate captions for client-video.mp4';
    const res = await app.inject({ method: 'POST', url: '/api/drive', payload: { task } });
    off();

    expect(res.statusCode).toBe(201);
    const sessionId = res.json().sessionId as string;
    expect(typeof sessionId).toBe('string');
    expect(sessionId.length).toBeGreaterThan(0);

    // SDK spawn options: skill filter + repo-local plugin, settingSources STILL [].
    expect(captured.options?.skills).toEqual(['adcelerate-execute']);
    expect(captured.options?.plugins?.[0]?.type).toBe('local');
    expect(String(captured.options?.plugins?.[0]?.path)).toContain('drive-plugin');
    expect(captured.options?.settingSources).toEqual([]);

    // Exactly one durable control-plane record on the new session, pinned payload.
    const mine = events.filter((e) => e.session_id === sessionId);
    expect(mine).toHaveLength(1);
    expect(mine[0]!.payload?.task).toBe(task);

    await app.close();
  });

  it('forwards systemHint into the cc.drive.requested payload', async () => {
    const app = await buildApp();
    const { events, off } = collectDriveEvents();

    const res = await app.inject({
      method: 'POST', url: '/api/drive',
      payload: { task: 'do it', systemHint: 'scene-board' },
    });
    off();

    expect(res.statusCode).toBe(201);
    const sessionId = res.json().sessionId as string;
    const mine = events.filter((e) => e.session_id === sessionId);
    expect(mine).toHaveLength(1);
    expect(mine[0]!.payload?.systemHint).toBe('scene-board');

    await app.close();
  });

  it('400s on empty/whitespace/missing task — no session, no event', async () => {
    const app = await buildApp();
    let fired = false;
    const off = eventBus.on((e) => {
      if (e.hook_event_type === 'cc.drive.requested') fired = true;
    });

    const blank = await app.inject({ method: 'POST', url: '/api/drive', payload: { task: '   ' } });
    const missing = await app.inject({ method: 'POST', url: '/api/drive', payload: {} });
    off();

    expect(blank.statusCode).toBe(400);
    expect(missing.statusCode).toBe(400);
    expect(fired).toBe(false);

    await app.close();
  });
});
