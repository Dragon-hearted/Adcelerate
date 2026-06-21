// ─────────────────────────────────────────────────────────────────────────────
// /api/artifacts — Substrate-owned artifact byte serve (slice #34 / ADR-0011).
//
//   GET /api/artifacts/:runId/:stepKey → stream the snapshotted bytes + stored mime
//
// The bytes were captured at ingest by `snapshotArtifact` (artifacts/store.ts).
// This route resolves the file by the SAME sanitize (so any url-encoded `:`/`/`
// in the stepKey maps back), sets content-type from the stored extension, and
// streams it. 404 when nothing was snapshotted (degraded source-url fallback).
// ─────────────────────────────────────────────────────────────────────────────

import type { FastifyInstance } from 'fastify';
import { createReadStream } from 'node:fs';
import { findArtifactFile, mimeFromPath } from '../artifacts/store';

export async function artifactsRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { runId: string; stepKey: string } }>(
    '/api/artifacts/:runId/:stepKey',
    async (req, reply) => {
      // Fastify (find-my-way) already percent-decodes path params, so stepKey is
      // the original value; findArtifactFile re-applies the write-time sanitize.
      const { runId, stepKey } = req.params;
      const file = await findArtifactFile(runId, stepKey);
      if (file === null) {
        return reply.code(404).send({ error: 'artifact not found' });
      }
      reply.header('content-type', mimeFromPath(file));
      return reply.send(createReadStream(file));
    },
  );
}
