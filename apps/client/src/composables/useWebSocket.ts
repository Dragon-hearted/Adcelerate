import { ref, onMounted, onUnmounted } from 'vue';
import type { HookEvent, WebSocketMessage } from '../types';
import { applyTokenEvent, refetchAllExternal } from './useTokens';
import type { TokenEvent } from '../types/tokens';
import { API_BASE_URL } from '../config';

export function useWebSocket(url: string) {
  const events = ref<HookEvent[]>([]);
  const isConnected = ref(false);
  const error = ref<string | null>(null);
  // Surface message-parse failures as reactive state so the UI can render
  // a banner/toast. UI rendering itself lives in components — this composable
  // just exposes the latest error string.
  const lastError = ref<string | null>(null);

  let ws: WebSocket | null = null;
  let reconnectTimeout: number | null = null;
  // Track whether we've ever opened a successful connection. On a subsequent
  // `onopen`, this is a reconnect — backfill summary/timeseries/breakdown and
  // recent events so we don't permanently miss whatever the server emitted
  // while we were offline.
  let wasConnected = false;

  // Get max events from environment variable or use default. Explicit radix
  // 10 prevents `parseInt('010')` from being interpreted as octal in legacy
  // engines and silences `radix` lint warnings.
  const maxEvents = parseInt(import.meta.env.VITE_MAX_EVENTS_TO_DISPLAY || '300', 10);

  // Runtime shape guard for `token_event` frames. The WS layer is untrusted
  // input from the network — a malformed payload that downstream code
  // assumes has `session_id`/`ts`/`model` would otherwise throw deep inside
  // the reactive store. Reject anything that doesn't carry the minimum
  // primitive fields the rest of the app reads.
  function isTokenEventLike(d: unknown): d is TokenEvent {
    if (!d || typeof d !== 'object') return false;
    const t = d as Record<string, unknown>;
    return (
      typeof t.session_id === 'string' &&
      typeof t.ts === 'number' &&
      typeof t.model === 'string'
    );
  }

  async function backfillRecentEvents(): Promise<void> {
    try {
      const res = await fetch(`${API_BASE_URL}/events/recent?limit=${maxEvents}`);
      if (!res.ok) return;
      const recent = (await res.json()) as HookEvent[];
      if (Array.isArray(recent)) {
        events.value = recent.slice(-maxEvents);
      }
    } catch (err) {
      // Backfill is best-effort — a failure here shouldn't block reconnect.
      console.warn('Failed to backfill recent events:', err);
    }
  }

  const connect = () => {
    try {
      ws = new WebSocket(url);

      ws.onopen = () => {
        console.log('WebSocket connected');
        isConnected.value = true;
        error.value = null;
        if (wasConnected) {
          // Reconnect path: pull any state we may have missed during the gap.
          // Both calls are best-effort and don't block subsequent messages.
          void refetchAllExternal();
          void backfillRecentEvents();
        }
        wasConnected = true;
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          if (message.type === 'initial') {
            const initialEvents = Array.isArray(message.data) ? message.data : [];
            // Only keep the most recent events up to maxEvents
            events.value = initialEvents.slice(-maxEvents);
          } else if (message.type === 'event') {
            const newEvent = message.data as HookEvent;
            events.value.push(newEvent);

            // Limit events array to maxEvents, removing the oldest when exceeded
            if (events.value.length > maxEvents) {
              // Remove the oldest events (first 10) when limit is exceeded
              events.value = events.value.slice(events.value.length - maxEvents + 10);
            }
          } else if ((message as { type?: string }).type === 'token_event') {
            const record = (message as { data?: unknown }).data;
            if (!isTokenEventLike(record)) {
              console.warn('[ws] dropping malformed token_event payload');
              return;
            }
            applyTokenEvent(record);
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
          // Mirror to reactive state so the UI layer can surface this without
          // every component pulling a console listener of its own.
          lastError.value = err instanceof Error ? err.message : String(err);
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        error.value = 'WebSocket connection error';
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        isConnected.value = false;

        // Attempt to reconnect after 3 seconds
        reconnectTimeout = window.setTimeout(() => {
          console.log('Attempting to reconnect...');
          connect();
        }, 3000);
      };
    } catch (err) {
      console.error('Failed to connect:', err);
      error.value = 'Failed to connect to server';
    }
  };

  const disconnect = () => {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }

    if (ws) {
      ws.close();
      ws = null;
    }
  };

  onMounted(() => {
    connect();
  });

  onUnmounted(() => {
    disconnect();
  });

  const clearEvents = () => {
    events.value = [];
  };

  return {
    events,
    isConnected,
    error,
    lastError,
    clearEvents,
  };
}
