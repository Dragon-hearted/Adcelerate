// ─────────────────────────────────────────────────────────────────────────────
// Effect class (#43) — the FORMALIZATION of canUseTool's tool-identity gate into a
// small, pure ruleset. Drives the approval gate:
//   read          → auto-allow (Read/Grep/Glob/LS, the obvious read-only tools)
//   irreversible  → always gate (client/-path writes, delete, publish/network,
//                   Bash, Write/Edit/MultiEdit/NotebookEdit)
//   spend         → reserved for the cascade DISPATCH path (canUseTool rarely sees
//                   it); the classifier itself almost never returns it.
//
// DEFAULT/unknown → 'irreversible' (FAIL-SAFE: an unrecognized tool gates, never
// silently auto-allows). ponytail: a small ruleset, not a giant per-tool registry.
// ─────────────────────────────────────────────────────────────────────────────

export type EffectClass = 'read' | 'spend' | 'irreversible';

// Obvious read-only tools — auto-allowed (no human round-trip).
const READ_TOOLS = new Set<string>(['Read', 'Grep', 'Glob', 'LS']);

// Filesystem / shell mutators — always irreversible.
const WRITE_TOOLS = new Set<string>(['Bash', 'Write', 'Edit', 'MultiEdit', 'NotebookEdit']);

// Outbound network / proxy tools (mirrors canUseTool.ts requiresApproval regex).
const NETWORK_RE = /(^|__)(fetch|curl|http|request|post|put|delete|publish)(__|$)/i;

// A path that lands under client/ (delivered creative — writing here is irreversible).
const CLIENT_PATH_RE = /(^|[\/\\])client[\/\\]/;

/** Pull candidate path-ish strings out of a tool input (best-effort, shallow). */
function paths(input: unknown): string[] {
  if (!input || typeof input !== 'object') return [];
  const o = input as Record<string, unknown>;
  const out: string[] = [];
  for (const k of ['file_path', 'path', 'notebook_path', 'filePath']) {
    if (typeof o[k] === 'string') out.push(o[k] as string);
  }
  // MultiEdit-style edits[].file_path, and a generic command string for Bash.
  if (typeof o.command === 'string') out.push(o.command as string);
  if (Array.isArray(o.edits)) {
    for (const e of o.edits) {
      if (e && typeof e === 'object' && typeof (e as Record<string, unknown>).file_path === 'string') {
        out.push((e as Record<string, unknown>).file_path as string);
      }
    }
  }
  return out;
}

/**
 * Classify a tool invocation's effect. Pure: same (toolName, input) → same class.
 * Conservative by construction — anything not provably read-only gates.
 */
export function classifyEffect(toolName: string, input?: unknown): EffectClass {
  if (READ_TOOLS.has(toolName)) return 'read';
  if (WRITE_TOOLS.has(toolName)) return 'irreversible';
  if (NETWORK_RE.test(toolName)) return 'irreversible';
  // A write/op touching a client/ path is irreversible regardless of tool identity.
  if (paths(input).some((p) => CLIENT_PATH_RE.test(p))) return 'irreversible';
  // DEFAULT: unknown tool → fail-safe gate.
  return 'irreversible';
}
