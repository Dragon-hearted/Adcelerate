// Runtime configuration. The orchestrator URL is read from a NEXT_PUBLIC env var
// (baked at build time, available in the browser). Defaults to the local
// orchestrator so the app works with zero config in dev.
export const ORCH_URL =
  process.env.NEXT_PUBLIC_ORCH_URL ?? 'http://127.0.0.1:4100';

// Max events retained in the in-memory timeline store (ring-buffer cap).
export const MAX_EVENTS = 2000;

// Window (ms) over which the burn-rate (Δcost/min) is computed.
export const BURN_WINDOW_MS = 60_000;
