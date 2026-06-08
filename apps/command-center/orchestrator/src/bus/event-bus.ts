// ─────────────────────────────────────────────────────────────────────────────
// EventBus — the single chokepoint for every normalized CCEvent.
//
// emit(input):
//   1. assigns a per-session monotonic `seq` (event sourcing / deterministic
//      replay). Counters are lazily seeded from MAX(seq) in the DB so seq stays
//      monotonic across process restarts.
//   2. persists the event via Drizzle.
//   3. broadcasts to the per-session room (`event`) AND the global feed
//      (`event:global`), mirroring the backpressure-tolerant fan-out in
//      apps/server/src/index.ts — Socket.IO buffers per-socket and we never
//      block the producer on a slow consumer.
//   4. re-emits on an in-process EventEmitter so other subsystems (token
//      telemetry, file attribution, the state machine) can subscribe without a
//      socket round-trip.
//
// This is intentionally NOT an `extends EventEmitter` (overriding emit() would
// collide with the node signature). It composes one privately instead.
// ─────────────────────────────────────────────────────────────────────────────

import { EventEmitter } from 'node:events';
import { eq, sql } from 'drizzle-orm';
import type { Server } from 'socket.io';
import type {
  CCEvent,
  ServerToClient,
  ClientToServer,
  TokenTick,
  AgentDescriptor,
  ApprovalRequest,
  ApprovalResolvedPayload,
  FileChange,
  GitHubActivity,
} from '@command-center/shared';
import { db } from '../db/client';
import { events } from '../db/schema';
import { eventToRow } from '../db/mappers';

export type TypedServer = Server<ClientToServer, ServerToClient>;

/** Socket.IO room name for a session's scoped event stream. */
export const room = (sessionId: string): string => `session:${sessionId}`;

// Everything a caller supplies; `seq` is bus-assigned, `source_app`/`timestamp`
// default. The id is DB-assigned on insert.
export type EmitInput = Omit<CCEvent, 'id' | 'seq' | 'source_app' | 'timestamp'> & {
  source_app?: string;
  timestamp?: number;
};

const SOURCE_APP = 'command-center';

class EventBus {
  private readonly seqCounters = new Map<string, number>();
  private readonly emitter = new EventEmitter();
  private io: TypedServer | null = null;

  /** Wire the Socket.IO server once it has been attached in server.ts. */
  attachIo(io: TypedServer): void {
    this.io = io;
    // The bus can outlive many connections; lift the default listener cap.
    this.emitter.setMaxListeners(0);
  }

  /** Subscribe to every persisted event in-process (token telemetry, etc.). */
  on(listener: (evt: CCEvent) => void): () => void {
    this.emitter.on('event', listener);
    return () => this.emitter.off('event', listener);
  }

  /** Subscribe to real-time token ticks in-process (token telemetry fast path). */
  onTokenTick(listener: (tick: TokenTick) => void): () => void {
    this.emitter.on('token:tick', listener);
    return () => this.emitter.off('token:tick', listener);
  }

  /**
   * Real-time token fast path — broadcast `token:tick` to all clients (and any
   * in-process subscriber). The transcript ingest (#5) remains source of truth;
   * this is the live readout from the SDK `result` usage.
   */
  emitTokenTick(tick: TokenTick): void {
    this.io?.emit('token:tick', tick);
    this.emitter.emit('token:tick', tick);
  }

  /** Broadcast an agent descriptor update (`agent:state`) to all clients. */
  emitAgentState(descriptor: AgentDescriptor): void {
    this.io?.emit('agent:state', descriptor);
    this.emitter.emit('agent:state', descriptor);
  }

  /** Broadcast a parked approval/question (`approval:request`) to all clients. */
  emitApprovalRequest(req: ApprovalRequest): void {
    this.io?.emit('approval:request', req);
  }

  /** Broadcast a resolved approval/question (`approval:resolved`) to all clients. */
  emitApprovalResolved(payload: ApprovalResolvedPayload): void {
    this.io?.emit('approval:resolved', payload);
  }

  /**
   * Broadcast a working-tree change (`file:changed`) to all clients — drives the
   * FileChangePanel/DiffViewer. Also re-emitted in-process for any subscriber.
   * The persisted cc.file.changed CCEvent (when attributed to a session) goes
   * through `emit()` separately so it lands in that agent's replayable log.
   */
  emitFileChanged(change: FileChange): void {
    this.io?.emit('file:changed', change);
    this.emitter.emit('file:changed', change);
  }

  /** Subscribe to working-tree changes in-process. */
  onFileChanged(listener: (change: FileChange) => void): () => void {
    this.emitter.on('file:changed', listener);
    return () => this.emitter.off('file:changed', listener);
  }

  /**
   * Broadcast a GitHub poll result (`github:update`) to all clients — drives the
   * GitHubPanel. Read-only insights from the local `gh`/git poller.
   */
  emitGithubUpdate(activity: GitHubActivity): void {
    this.io?.emit('github:update', activity);
    this.emitter.emit('github:update', activity);
  }

  /** Subscribe to GitHub poll results in-process. */
  onGithubUpdate(listener: (activity: GitHubActivity) => void): () => void {
    this.emitter.on('github:update', listener);
    return () => this.emitter.off('github:update', listener);
  }

  /**
   * Assign the next per-session seq. Lazily seeds the in-memory counter from the
   * persisted MAX(seq) so replay ordinals survive restarts. bun-sqlite is
   * synchronous, so this stays a sync hot path.
   */
  private nextSeq(sessionId: string): number {
    let current = this.seqCounters.get(sessionId);
    if (current === undefined) {
      const row = db
        .select({ max: sql<number>`COALESCE(MAX(${events.seq}), 0)` })
        .from(events)
        .where(eq(events.sessionId, sessionId))
        .get();
      current = Number(row?.max ?? 0);
    }
    const next = current + 1;
    this.seqCounters.set(sessionId, next);
    return next;
  }

  /**
   * The one true way to publish an event. Persist-then-broadcast: a consumer
   * that reconnects and replays from the DB sees exactly what live clients saw.
   */
  emit(input: EmitInput): CCEvent {
    const seq = this.nextSeq(input.session_id);
    const evt: CCEvent = {
      ...input,
      source_app: input.source_app ?? SOURCE_APP,
      seq,
      timestamp: input.timestamp ?? Date.now(),
    };

    // 1. Persist (source of truth). Capture the auto-increment id back onto the
    //    in-memory event so downstream consumers can reference it.
    try {
      const inserted = db
        .insert(events)
        .values(eventToRow(evt))
        .returning({ id: events.id })
        .get();
      if (inserted) evt.id = inserted.id;
    } catch (err) {
      // Persistence is best-effort relative to liveness: log, but still
      // broadcast so the UI stays live. Never bubble to the agent hot path.
      // eslint-disable-next-line no-console
      console.error('[event-bus] persist failed:', err);
    }

    // 2. Broadcast — per-session room + global aggregate feed.
    if (this.io) {
      this.io.to(room(evt.session_id)).emit('event', evt);
      this.io.emit('event:global', evt);
    }

    // 3. In-process fan-out.
    this.emitter.emit('event', evt);

    return evt;
  }

  /** Reset a session's seq counter (e.g. when a session row is deleted). */
  forgetSession(sessionId: string): void {
    this.seqCounters.delete(sessionId);
  }
}

// Singleton — one chokepoint per process.
export const eventBus = new EventBus();
