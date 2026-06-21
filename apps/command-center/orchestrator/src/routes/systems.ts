// ─────────────────────────────────────────────────────────────────────────────
// /api/systems — system distribution + version-drift catalog (slice #40).
//
//   GET  /api/systems              → 200 SystemFreshness[]  (delivery facts only)
//   POST /api/systems/:name/ensure → 200 { populated: true } | 404 unknown name
//
// Delivery facts come straight off `git submodule status` (ADR-0021); the
// soft/hard freshness TIER is fused client-side (drift → soft; a live #33
// `incompatibilities` entry → hard). No new socket event, no server-side join,
// no persisted producerVersion — the hard tier rides the existing live signal.
//   // ponytail: git-status-is-the-registry  // ponytail: no-persisted-producerVersion
// ─────────────────────────────────────────────────────────────────────────────

import type { FastifyInstance } from 'fastify';
import { listSystemFreshness, ensureSystem } from '../lib/systems';

export async function systemsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/systems', async (_req, reply) => {
    const systems = await listSystemFreshness();
    return reply.code(200).send(systems);
  });

  app.post<{ Params: { name: string } }>('/api/systems/:name/ensure', async (req, reply) => {
    try {
      const result = await ensureSystem(req.params.name);
      return reply.code(200).send(result);
    } catch (err) {
      // An unknown (unsanitized) name → 404; anything else (a real git failure)
      // bubbles to the catch-all error handler as a 500.
      if (err instanceof Error && err.message.startsWith('unknown system')) {
        return reply.code(404).send({ error: 'unknown system' });
      }
      throw err;
    }
  });
}
