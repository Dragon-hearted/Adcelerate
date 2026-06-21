'use client';

import { useEffect } from 'react';
import { getSocket } from '@/lib/socket';
import { useStore } from '@/store/useStore';

/**
 * Binds the typed Socket.IO client to the Zustand store. Mount once near the
 * root. On every (re)connect the server pushes a `snapshot`, which fully
 * re-hydrates the stores — combined with (session_id, seq) dedupe in the store,
 * this makes reconnect safe and idempotent.
 */
export function useSocketBridge(): void {
  useEffect(() => {
    const socket = getSocket();
    const store = useStore.getState();

    const onConnect = () => store.setConnected(true);
    const onDisconnect = () => store.setConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('snapshot', (p) => useStore.getState().hydrate(p));
    // Subscribe to the cross-session aggregate feed for the global timeline.
    socket.on('event:global', (e) => useStore.getState().addEvent(e));
    // Per-session room events (when focused on a session) also feed the store.
    socket.on('event', (e) => useStore.getState().addEvent(e));
    socket.on('agent:state', (a) => useStore.getState().setAgentState(a));
    socket.on('approval:request', (r) => useStore.getState().upsertApproval(r));
    socket.on('approval:resolved', (d) => useStore.getState().resolveApproval(d));
    socket.on('token:tick', (t) => useStore.getState().addTokenTick(t));
    socket.on('github:update', (g) => useStore.getState().setGithub(g));
    socket.on('file:changed', (f) => useStore.getState().addFileChange(f));
    // Substrate Run/Step graph (slice #31) — full graph each tick; just replace.
    socket.on('step-graph:update', (g) => useStore.getState().upsertStepGraph(g));
    // Envelope incompatibility (slice #33) — out-of-window reject → dismissible banner.
    socket.on('incompatibility', (s) => useStore.getState().addIncompatibility(s));

    if (socket.connected) onConnect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('snapshot');
      socket.off('event:global');
      socket.off('event');
      socket.off('agent:state');
      socket.off('approval:request');
      socket.off('approval:resolved');
      socket.off('token:tick');
      socket.off('github:update');
      socket.off('file:changed');
      socket.off('step-graph:update');
      socket.off('incompatibility');
    };
  }, []);
}
