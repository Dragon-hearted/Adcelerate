// ─────────────────────────────────────────────────────────────────────────────
// Orchestrator server — Fastify (REST) + Socket.IO (live wire), bound to
// 127.0.0.1 ONLY. The approval engine is the safety boundary; the network
// surface is deliberately localhost-locked.
//
// Lifecycle mirrors apps/server/src/index.ts:
//   boot:      migrate → build fastify → attach Socket.IO → listen(127.0.0.1)
//   shutdown:  server.stop (fastify+io close) → ingest drain → db.close
// Internal errors are never echoed to the client (catch-all → 500).
// ─────────────────────────────────────────────────────────────────────────────

import Fastify, { type FastifyError } from 'fastify';
import cors from '@fastify/cors';
import { Server } from 'socket.io';
import { isNull, sql } from 'drizzle-orm';
import { config, allowedOrigins } from './config';
import { db, sqlite } from './db/client';
import { sessions } from './db/schema';
import { runMigrations } from './db/migrate';
import { eventBus, type TypedServer } from './bus/event-bus';
import { registerGateway } from './ws/gateway';
import { wireAgentEngine } from './agents/registry';
import { wireApprovalEngine } from './agents/approval-engine';
import { sessionRoutes } from './routes/sessions';
import { approvalRoutes } from './routes/approvals';
import { tokenRoutes } from './routes/tokens';
import { fileRoutes } from './routes/files';
import { githubRoutes } from './routes/github';
import { ingestRoutes } from './routes/ingest';
import { artifactsRoutes } from './routes/artifacts';
import { boardRoutes } from './routes/boards';
import { budgetRoutes } from './routes/budget';
import { systemsRoutes } from './routes/systems';
import { startTranscriptIngest } from './tokens/transcript-ingest';
import { startFileWatcher } from './files/watcher';
import { startGithubPoller } from './github/poller';

// ── shutdown drain registry ──────────────────────────────────────────────────
// Subsystems with in-flight work (the token transcript watcher in #5, future
// pollers/watchers) register an async drain that runs AFTER the server stops
// accepting connections and BEFORE the DB closes.
type DrainFn = () => Promise<void> | void;
const drains: DrainFn[] = [];
export function registerDrain(fn: DrainFn): void {
  drains.push(fn);
}

const ORIGINS = allowedOrigins(config);

async function buildServer() {
  const app = Fastify({
    logger: { level: config.LOG_LEVEL },
    // Trust no proxy — we only ever bind loopback.
    trustProxy: false,
  });

  // Localhost-only CORS allowlist (mirrors apps/server isAllowedWebSocketUrl).
  await app.register(cors, {
    origin: ORIGINS,
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: false,
  });

  // GET /health — liveness. { ok, sessions, uptime }.
  app.get('/health', async () => {
    const row = db
      .select({ c: sql<number>`count(*)` })
      .from(sessions)
      .where(isNull(sessions.endedAt))
      .get();
    return {
      ok: true,
      sessions: Number(row?.c ?? 0),
      uptime: process.uptime(),
    };
  });

  await app.register(sessionRoutes);
  await app.register(approvalRoutes);
  await app.register(tokenRoutes);
  await app.register(fileRoutes);
  await app.register(githubRoutes);
  // Substrate Run/Step ingest + Step-Graph read (slice #31). Broadcasts
  // `step-graph:update` over Socket.IO via the EventBus (io attached in
  // registerGateway, before any ingest POST can land).
  await app.register(ingestRoutes);
  // Substrate artifact byte-serve (slice #34 / ADR-0011): streams snapshotted
  // artifact bytes from ARTIFACTS_DIR (captured at ingest), so Boards resolve a
  // Substrate-owned url independent of the producing system.
  await app.register(artifactsRoutes);
  // Board persistence + open-into-Board + slot projection (slice #36). Broadcasts
  // `board:update` over Socket.IO via the EventBus (same path as step-graph:update).
  await app.register(boardRoutes);
  // Provider-scoped budget-guard trip ingress (slice #38 / ADR-0007). image-engine
  // POSTs a trip when a serving provider crosses its budget-line; this broadcasts
  // `budget-trip` over the socket (transient signal, not a persisted CCEvent).
  await app.register(budgetRoutes);
  // System distribution + version-drift catalog (slice #40 / ADR-0021, ADR-0022).
  // GET /api/systems reads delivery facts off `git submodule status`; POST
  // /api/systems/:name/ensure does the ADR-0021 gated lazy-init. Delivery facts
  // only — the soft/hard freshness tier is fused client-side (drift → soft; a
  // live #33 incompatibility → hard), no new socket event.
  await app.register(systemsRoutes);

  // Catch-all error handler. Client errors (4xx, e.g. validation) keep their
  // message; anything 5xx/unknown collapses to a generic 500 — never leak
  // internal detail (stack traces, SQL, fs paths) to the client.
  app.setErrorHandler((err: FastifyError, req, reply) => {
    const status = err.statusCode ?? 500;
    if (status >= 500) {
      req.log.error({ err }, 'unhandled error');
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
    return reply.code(status).send({ error: err.message });
  });

  app.setNotFoundHandler((_req, reply) => {
    reply.code(404).send({ error: 'Not Found' });
  });

  return app;
}

async function main(): Promise<void> {
  // 1. Schema must exist before any query (migrate-on-boot).
  runMigrations();

  const app = await buildServer();

  // 2. Fastify must be ready (request handler attached to app.server) before
  //    Socket.IO wraps the underlying HTTP server.
  await app.ready();

  const io: TypedServer = new Server(app.server, {
    cors: { origin: ORIGINS, methods: ['GET', 'POST'], credentials: false },
    // Reject any cross-origin handshake not on the allowlist.
    allowRequest: (req, callback) => {
      const origin = req.headers.origin;
      // No Origin header (same-origin / non-browser clients like the test ws) is allowed.
      const ok = origin === undefined || ORIGINS.includes(origin);
      callback(null, ok);
    },
  });
  registerGateway(io);

  // Wire the SessionRegistry into the REST SessionEngine + the WS prompt path.
  wireAgentEngine();

  // Approval engine: gate every session with canUseTool + ask_human, and route
  // POST /api/approvals/:id/respond + ws approval:respond → approvalBus.respond.
  wireApprovalEngine();

  // 3. Bind loopback ONLY.
  await app.listen({ host: '127.0.0.1', port: config.ORCH_PORT });
  app.log.info(`🛰  orchestrator on http://127.0.0.1:${config.ORCH_PORT}`);
  app.log.info(`📡 socket.io on ws://127.0.0.1:${config.ORCH_PORT}/socket.io`);

  // ── token telemetry watcher ──────────────────────────────────────────────
  // Tails ~/.claude/projects/**/*.jsonl, costs each assistant turn, dedupes by
  // inode+offset, and persists token_events (the SOURCE OF TRUTH that the
  // /api/tokens/* endpoints read). The real-time `token:tick` fast path is
  // emitted separately by the SDK-result normalizer (task #3) — the watcher
  // deliberately does NOT broadcast token:tick to avoid double-counting the
  // burn rate. Start AFTER listen so boot isn't blocked on a large history
  // backfill (which runs in the background). Register its drain so the
  // shutdown sequence (server stop → drains → db close) flushes in-flight
  // ingest before the SQLite handle closes.
  try {
    const stopIngest = await startTranscriptIngest();
    registerDrain(stopIngest);
  } catch (err) {
    // A failed watcher (e.g. permissions on ~/.claude/projects) must not wedge
    // boot — the REST endpoints still serve whatever was already ingested.
    app.log.error({ err }, '[tokens] transcript ingest failed to start');
  }

  // ── file tracking watcher (Phase 7A) ──────────────────────────────────────
  // Chokidar over REPO_ROOT → git diff per change → file:changed (+ attributed
  // cc.file.changed). Drains in the same server-stop → drains → db.close order.
  try {
    const stopFiles = await startFileWatcher();
    registerDrain(stopFiles);
  } catch (err) {
    app.log.error({ err }, '[files] watcher failed to start');
  }

  // ── GitHub poller (Phase 7A) ──────────────────────────────────────────────
  // Read-only `git`/`gh` interval poller → github_* tables → github:update.
  // Resilient by construction (gh-not-authed degrades to empty/last-known), so
  // a start failure here is unexpected — log and continue.
  try {
    const stopGithub = await startGithubPoller();
    registerDrain(stopGithub);
  } catch (err) {
    app.log.error({ err }, '[github] poller failed to start');
  }

  // ── graceful shutdown ────────────────────────────────────────────────────
  let shuttingDown = false;
  const shutdown = async (sig: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    app.log.info(`[shutdown] received ${sig}`);
    // 1. Stop accepting connections (Socket.IO first, then Fastify/HTTP).
    try {
      await new Promise<void>((resolve) => io.close(() => resolve()));
    } catch (e) {
      app.log.error({ e }, '[shutdown] io close error');
    }
    try {
      await app.close();
    } catch (e) {
      app.log.error({ e }, '[shutdown] fastify close error');
    }
    // 2. Drain in-flight subsystem work (transcript ingest, etc.).
    for (const drain of drains) {
      try {
        await drain();
      } catch (e) {
        app.log.error({ e }, '[shutdown] drain error');
      }
    }
    // 3. Checkpoint WAL + release the file lock.
    try {
      sqlite.close();
    } catch (e) {
      app.log.error({ e }, '[shutdown] db close error');
    }
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

// Keep a reference to the bus so tree-shaking / lint never prunes the import;
// later tasks attach producers to it. (attachIo happens in registerGateway.)
void eventBus;

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[orchestrator] fatal boot error:', err);
  process.exit(1);
});
