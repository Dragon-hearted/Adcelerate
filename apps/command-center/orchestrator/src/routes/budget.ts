// ─────────────────────────────────────────────────────────────────────────────
// /api/budget-trip — provider-scoped budget-guard trip ingress (slice #38 / ADR-0007).
//
//   POST /api/budget-trip → validate the PINNED BudgetTripSignal shape, broadcast
//                           a `budget-trip` over the socket, return 200 { ok: true }.
//
// image-engine owns the cost data + the block point (the 402 lives at the serving
// provider); the Console only SURFACES the trip. Mirrors the #33 incompatibility
// seam: a transient signal pushed over a thin POST, NOT persisted as a CCEvent
// (the Emitter carries no cost — this is a separate POST, not a Run/Step envelope).
// ─────────────────────────────────────────────────────────────────────────────

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eventBus } from '../bus/event-bus';

// The PINNED cross-repo body shape (image-engine POSTs exactly this).
const budgetTripSchema = z.object({
  provider: z.string(),
  model: z.string(),
  spentUsd: z.number(),
  limitUsd: z.number(),
  at: z.number(),
});

export async function budgetRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/budget-trip', async (req, reply) => {
    const parsed = budgetTripSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid budget-trip', issues: parsed.error.issues });
    }
    // Transient alarm — broadcast only, NOT persisted (mirrors emitIncompatibility).
    eventBus.emitBudgetTrip(parsed.data);
    return reply.code(200).send({ ok: true });
  });
}
