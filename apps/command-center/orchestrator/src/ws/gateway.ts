// ─────────────────────────────────────────────────────────────────────────────
// Socket.IO gateway — the connection lifecycle for the typed wire protocol.
//
// On connect: send a `snapshot` (recent events + active sessions + pending
// approvals) — the exact hydration the legacy `{type:'initial'}` payload did,
// so a reconnecting client replays state then resumes the live stream.
//
// Rooms are per-session (`session:subscribe` → join). Client→server control
// events (`session:prompt`, `approval:respond`) are delegated to handlers that
// later tasks (#3 session registry, #4 approval bus) register via
// `setGatewayHandlers` — for this skeleton they no-op safely.
// ─────────────────────────────────────────────────────────────────────────────

import { desc, eq, isNull } from 'drizzle-orm';
import type {
  SnapshotPayload,
  ApprovalDecision,
} from '@command-center/shared';
import { db } from '../db/client';
import { events, sessions, approvals } from '../db/schema';
import { rowToEvent, rowToDescriptor, rowToApprovalRequest } from '../db/mappers';
import { eventBus, room, type TypedServer } from '../bus/event-bus';

const SNAPSHOT_EVENT_LIMIT = 300;

/**
 * Control-path handlers wired by later tasks. The gateway calls these; until
 * #3/#4 register real implementations they are undefined (no-op).
 */
export interface GatewayHandlers {
  onPrompt?: (sessionId: string, text: string) => void;
  onApprovalRespond?: (decision: ApprovalDecision) => void;
}

const handlers: GatewayHandlers = {};

export function setGatewayHandlers(next: GatewayHandlers): void {
  Object.assign(handlers, next);
}

/** Build the connect-time hydration payload from persisted state. */
export function buildSnapshot(): SnapshotPayload {
  const recentRows = db
    .select()
    .from(events)
    .orderBy(desc(events.id))
    .limit(SNAPSHOT_EVENT_LIMIT)
    .all();
  // DB returns newest-first; the client appends by (session_id, seq), but send
  // chronological for a sane initial render.
  const recentEvents = recentRows.map(rowToEvent).reverse();

  const activeSessions = db
    .select()
    .from(sessions)
    .where(isNull(sessions.endedAt))
    .all()
    .map(rowToDescriptor);

  const pendingApprovals = db
    .select()
    .from(approvals)
    .where(eq(approvals.status, 'pending'))
    .all()
    .map(rowToApprovalRequest);

  return { events: recentEvents, sessions: activeSessions, approvals: pendingApprovals };
}

/** Attach the connection handler to the typed Socket.IO server. */
export function registerGateway(io: TypedServer): void {
  eventBus.attachIo(io);

  io.on('connection', (socket) => {
    // Hydrate immediately on connect.
    try {
      socket.emit('snapshot', buildSnapshot());
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[ws] snapshot build failed:', err);
    }

    // Room-per-session subscription.
    socket.on('session:subscribe', (sessionId: string) => {
      if (typeof sessionId === 'string' && sessionId.length > 0) {
        void socket.join(room(sessionId));
      }
    });

    // Low-latency prompt path (mirrors POST /api/sessions/:id/prompt).
    socket.on('session:prompt', (payload) => {
      if (!payload || typeof payload.sessionId !== 'string' || typeof payload.text !== 'string') return;
      handlers.onPrompt?.(payload.sessionId, payload.text);
    });

    // Low-latency approval path (mirrors POST /api/approvals/:id/respond).
    socket.on('approval:respond', (decision: ApprovalDecision) => {
      if (!decision || typeof decision.id !== 'string') return;
      handlers.onApprovalRespond?.(decision);
    });
  });
}
