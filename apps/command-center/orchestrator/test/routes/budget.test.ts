// ─────────────────────────────────────────────────────────────────────────────
// POST /api/budget-trip — provider-scoped budget-guard trip ingress (slice #38).
//
// image-engine POSTs the PINNED BudgetTripSignal shape when a serving provider
// crosses its budget-line; the orchestrator validates it and broadcasts a
// `budget-trip` over the socket (transient signal, NOT persisted). Mirrors the
// #33 incompatibility seam: valid body → 200 { ok: true } + broadcast; malformed
// body → 400, no broadcast.
// Run against an in-memory DB (CC_DB_PATH=:memory:, see package.json "test").
// ─────────────────────────────────────────────────────────────────────────────
import { test, expect, describe, beforeAll } from 'bun:test';
import Fastify, { type FastifyInstance } from 'fastify';
import type { BudgetTripSignal } from '@command-center/shared';
import { runMigrations } from '../../src/db/migrate';
import { budgetRoutes } from '../../src/routes/budget';
import { eventBus } from '../../src/bus/event-bus';

let app: FastifyInstance;

beforeAll(async () => {
  runMigrations();
  app = Fastify();
  await app.register(budgetRoutes);
  await app.ready();
});

function post(payload: unknown) {
  return app.inject({
    method: 'POST',
    url: '/api/budget-trip',
    headers: { 'content-type': 'application/json' },
    payload: JSON.stringify(payload),
  });
}

const TRIP: BudgetTripSignal = {
  provider: 'higgsfield',
  model: 'gpt-image-2',
  spentUsd: 12.5,
  limitUsd: 10,
  at: 1700000000000,
};

describe('POST /api/budget-trip — valid trip is accepted + broadcast', () => {
  test('valid PINNED body → 200 { ok: true } and fires `budget-trip`', async () => {
    let signal: BudgetTripSignal | null = null;
    const off = eventBus.onBudgetTrip((s) => {
      signal = s;
    });

    const res = await post(TRIP);
    off();

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true });

    // The Console budget-trip signal fired with the exact PINNED shape.
    expect(signal).toMatchObject({
      provider: 'higgsfield',
      model: 'gpt-image-2',
      spentUsd: 12.5,
      limitUsd: 10,
      at: 1700000000000,
    });
  });
});

describe('POST /api/budget-trip — malformed body is rejected, no broadcast', () => {
  for (const [label, bad] of [
    ['missing provider', { model: 'm', spentUsd: 1, limitUsd: 2, at: 1 }],
    ['wrong type spentUsd', { provider: 'p', model: 'm', spentUsd: '1', limitUsd: 2, at: 1 }],
    ['empty body', {}],
  ] as const) {
    test(`${label} → 400, never fires \`budget-trip\``, async () => {
      let fired = false;
      const off = eventBus.onBudgetTrip(() => {
        fired = true;
      });

      const res = await post(bad);
      off();

      expect(res.statusCode).toBe(400);
      expect(fired).toBe(false);
    });
  }
});
