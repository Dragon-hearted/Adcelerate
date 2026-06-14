// ─────────────────────────────────────────────────────────────────────────────
// Configuration — zod-parsed, fail-fast env loading. Imported once at boot.
// Bind everything to 127.0.0.1; the approval engine is the safety boundary.
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';

// Coerce a possibly-undefined string env var into an int with a default.
const intFromEnv = (def: number) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === '' ? def : Number(v)))
    .pipe(z.number().int().positive());

const ConfigSchema = z.object({
  // Auth — optional. When unset, the Agent SDK falls back to the local Claude
  // CLI / subscription session (the default, no-key path).
  ANTHROPIC_API_KEY: z.string().optional(),

  // Ports
  ORCH_PORT: intFromEnv(4100),
  WEB_PORT: intFromEnv(3000),

  // Repo root the file watcher + agents operate on. Defaults to cwd.
  REPO_ROOT: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : process.cwd())),

  // Default model for newly-created agent sessions.
  DEFAULT_MODEL: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : 'claude-opus-4-8')),

  // SQLite database path (relative paths resolve from orchestrator/).
  CC_DB_PATH: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : './command-center.db')),

  // GitHub poller interval (ms).
  GH_POLL_MS: intFromEnv(30000),

  // Runtime
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

export type Config = z.infer<typeof ConfigSchema>;

function loadConfig(): Config {
  const parsed = ConfigSchema.safeParse(process.env);
  if (!parsed.success) {
    // Surface a readable error and exit — never boot with bad config.
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid Command Center configuration:\n${issues}`);
  }
  return parsed.data;
}

// The localhost-only CORS / WebSocket origin allowlist. Mirrors the
// `isAllowedWebSocketUrl` pattern from apps/server/src/index.ts.
export function allowedOrigins(cfg: Config): string[] {
  const hosts = ['localhost', '127.0.0.1', '[::1]'];
  return hosts.map((h) => `http://${h}:${cfg.WEB_PORT}`);
}

export const config: Config = loadConfig();
