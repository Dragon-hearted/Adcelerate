'use client';

import { io, type Socket } from 'socket.io-client';
import type { ServerToClient, ClientToServer } from '@command-center/shared';
import { ORCH_URL } from './config';

// A fully-typed Socket.IO client. ListenEvents = ServerToClient (events the
// server emits → we receive), EmitEvents = ClientToServer (events we emit).
export type TypedSocket = Socket<ServerToClient, ClientToServer>;

let socket: TypedSocket | null = null;

/**
 * Lazily-created Socket.IO client singleton. Connects directly to the
 * orchestrator (its CORS allowlist accepts origin :3000). Reconnection is
 * automatic; the store re-hydrates from `snapshot` on every (re)connect so the
 * reconnect path is safe and idempotent.
 */
export function getSocket(): TypedSocket {
  if (socket) return socket;
  socket = io(ORCH_URL, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
