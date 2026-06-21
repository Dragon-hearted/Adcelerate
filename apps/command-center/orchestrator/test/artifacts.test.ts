// ─────────────────────────────────────────────────────────────────────────────
// Slice #34 — Substrate artifact snapshot store (ADR-0011).
//
// Proves the durability contract: bytes captured at ingest resolve from the
// Substrate-owned url EVEN AFTER the producing source is gone. Also covers the
// degraded fallback (unreachable source → original artifact unchanged, never
// throws) and the 404 for a never-snapshotted artifact.
//
// The source fixture is a throwaway loopback Fastify server (no live image-engine
// on :3002); killing it mid-test is exactly how we prove durability.
// Run via `bun run test` (CC_DB_PATH=:memory:).
// ─────────────────────────────────────────────────────────────────────────────

import { test, expect, describe, beforeAll, afterAll } from 'bun:test';
import Fastify, { type FastifyInstance } from 'fastify';
import { rm, readFile } from 'node:fs/promises';
import path from 'node:path';
import { snapshotArtifact, findArtifactFile, sanitizeSegment } from '../src/artifacts/store';
import { artifactsRoutes } from '../src/routes/artifacts';
import { config } from '../src/config';

// A real 1×1 transparent PNG (so content-type/byte assertions are meaningful).
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

const RUN = 'run_artifacts_test';
const STEP = `${RUN}:gen`;

let source: FastifyInstance; // the producing system's byte source (throwaway)
let serve: FastifyInstance; // the Substrate serve route under test
let sourceUrl: string;

beforeAll(async () => {
  source = Fastify();
  source.get('/img.png', async (_req, reply) => {
    reply.header('content-type', 'image/png');
    return reply.send(PNG);
  });
  await source.listen({ host: '127.0.0.1', port: 0 });
  const addr = source.server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 0;
  sourceUrl = `http://127.0.0.1:${port}/img.png`;

  serve = Fastify();
  await serve.register(artifactsRoutes);
  await serve.ready();
});

afterAll(async () => {
  await source.close().catch(() => {});
  await serve.close().catch(() => {});
  // Clean the run's dir out of the (gitignored) store.
  await rm(path.join(config.ARTIFACTS_DIR, sanitizeSegment(RUN)), {
    recursive: true,
    force: true,
  }).catch(() => {});
});

describe('snapshotArtifact — capture + durability (ADR-0011)', () => {
  test('fetches bytes, writes a file, returns the Substrate url (mime preserved)', async () => {
    const out = await snapshotArtifact(RUN, STEP, { url: sourceUrl, mimeType: 'image/png' });
    expect(out.url).toBe(`/api/artifacts/${RUN}/${encodeURIComponent(STEP)}`);
    expect(out.mimeType).toBe('image/png');

    const file = await findArtifactFile(RUN, STEP);
    expect(file).not.toBeNull();
    expect(await readFile(file!)).toEqual(PNG); // bytes stored as-is (no thumb pipeline)
  });

  test('served bytes survive the source being killed (durable, not a live proxy)', async () => {
    // Kill the producing source — the snapshot above must still resolve.
    await source.close();
    const res = await serve.inject({
      method: 'GET',
      url: `/api/artifacts/${RUN}/${encodeURIComponent(STEP)}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('image/png');
    expect(Buffer.from(res.rawPayload)).toEqual(PNG);
  });

  test('missing artifact → 404', async () => {
    const res = await serve.inject({
      method: 'GET',
      url: `/api/artifacts/${RUN}/${encodeURIComponent('never:snapshotted')}`,
    });
    expect(res.statusCode).toBe(404);
  });

  test('degraded fallback: unreachable source returns the ORIGINAL artifact (never throws)', async () => {
    const original = { url: 'http://127.0.0.1:1/nope.png', mimeType: 'image/png' };
    const out = await snapshotArtifact(RUN, `${RUN}:unreachable`, original);
    expect(out).toEqual(original); // url unchanged → Canvas previews the live source
  });
});
