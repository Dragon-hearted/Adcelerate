// sandbox/config.ts
// Central configuration for the Adcelerate disposable agent-sandbox subsystem.
//
// Imported by orchestrator.ts (host side). The values that the in-container
// scripts need (allowlist, branch/naming, model) are forwarded to the container
// as environment variables by the orchestrator — keeping a single source of truth.

/** Docker image tag produced by `just sandbox-build`. */
export const IMAGE_TAG = "adcelerate-sandbox:latest";

/** Custom bridge network the sandbox containers attach to. */
export const NETWORK_NAME = "sandbox-net";

/** Container + run-dir name prefix → `sb-<id>`. */
export const PREFIX = "sb";

/** Git branch prefix → `sandbox/<id>-<slug>`. Never `--force`, never `main`. */
export const BRANCH_PREFIX = "sandbox";

/**
 * Subscription-billed auth. This token is passed to the container at runtime
 * ONLY; `ANTHROPIC_API_KEY` is deliberately never forwarded, so the in-sandbox
 * Claude Code agent spends the Pro/Max plan (zero credits).
 */
export const OAUTH_ENV = "CLAUDE_CODE_OAUTH_TOKEN";

/** Default Claude model for the in-sandbox headless agent. */
export const DEFAULT_MODEL = "opus";

/**
 * Parallel sandboxes share ONE subscription rate-limit pool — they throttle
 * each other. Fan-out is capped at this value regardless of `--parallel`.
 */
export const CONCURRENCY_CAP = 3;

/** Wall-clock ceiling for a single sandbox run. Guards runaway / crypto-mining. */
export const RUN_TIMEOUT_MS = 30 * 60 * 1000;

/** Resource limits passed to `docker run`. */
export const LIMITS = {
  cpus: "2",
  memory: "4g",
  pidsLimit: "512",
} as const;

/**
 * Linux capabilities added back after `--cap-drop ALL`. The egress firewall needs
 * BOTH: NET_ADMIN (program netfilter + create the ipset) and NET_RAW (the
 * `iptables -m set --match-set` / xt_set extension opens a socket to ipset; without
 * NET_RAW it fails with "Can't open socket to ipset" and the allowlist is never
 * installed). This MUST stay in lockstep with the `setcap` set in the Dockerfile —
 * a file-cap binary whose effective set contains a cap outside this bounding set
 * fails execve with EPERM and silently breaks the firewall.
 */
export const CAP_ADD: readonly string[] = ["NET_ADMIN", "NET_RAW"];

/**
 * Egress allowlist. The in-container firewall denies everything else
 * (including RFC-1918, link-local, and the host gateway). Kept here so the
 * orchestrator, `sandbox-doctor`, and the firewall all agree on one set.
 */
export const ALLOWLIST_DOMAINS: string[] = [
  // Anthropic — the only way to spend the subscription.
  "api.anthropic.com",
  "statsig.anthropic.com",
  // GitHub — dependency fetches and public clones (NO credentials inside the sandbox).
  "github.com",
  "api.github.com",
  "codeload.github.com",
  "objects.githubusercontent.com",
  "raw.githubusercontent.com",
  // npm / bun registry.
  "registry.npmjs.org",
  // PyPI (uv).
  "pypi.org",
  "files.pythonhosted.org",
  // uv installer / Python standalone build host.
  "astral.sh",
];

export type TargetKind = "parent" | "standalone" | "subpath";

export interface TargetConfig {
  /**
   * - `parent`     — clone the Adcelerate monorepo (`--recurse-submodules`); a
   *                  `systems/*` edit triggers submodule PR + parent-pointer PR.
   * - `standalone` — clone the system's own upstream repo directly; single PR.
   * - `subpath`    — clone the parent, scope the agent to a subdir, PR the parent
   *                  (used for tree-resident systems that are NOT git submodules).
   */
  kind: TargetKind;
  /**
   * Upstream for `standalone` targets (mirrors `.gitmodules`); must be HTTPS so
   * the sandbox clone works without SSH keys. For `parent` / `subpath`, omitted →
   * resolved from the parent repo's `origin` at runtime and normalized SSH→HTTPS
   * (see `normalizeRemoteUrl` in orchestrator.ts).
   */
  url?: string;
  /** Path the agent is scoped to + the dir a scoped install runs in (repo-relative). */
  path: string;
}

/**
 * target → repo map. Submodule URLs mirror `.gitmodules`
 * (github.com/Dragon-hearted/*). `scrape-engine` is NOT a submodule (it lives in
 * the parent tree), so it is routed as a `subpath` against the parent.
 */
export const TARGETS: Record<string, TargetConfig> = {
  adcelerate: { kind: "parent", path: "." },
  auto-editor: { kind: "standalone", url: "https://github.com/Dragon-hearted/auto-editor.git", path: "." },
  pinboard: { kind: "standalone", url: "https://github.com/Dragon-hearted/pinboard.git", path: "." },
  "scene-board": { kind: "standalone", url: "https://github.com/Dragon-hearted/scene-board.git", path: "." },
  "instagram-scrapper": { kind: "standalone", url: "https://github.com/Dragon-hearted/instagram-scrapper.git", path: "." },
  "image-engine": { kind: "standalone", url: "https://github.com/Dragon-hearted/image-engine.git", path: "." },
  "readme-engine": { kind: "standalone", url: "https://github.com/Dragon-hearted/readme-engine.git", path: "." },
  "prompt-writer": { kind: "standalone", url: "https://github.com/Dragon-hearted/prompt-writer.git", path: "." },
  moodboarder: { kind: "standalone", url: "https://github.com/Dragon-hearted/MoodBoarder.git", path: "." },
  "scrape-engine": { kind: "subpath", path: "systems/scrape-engine" },
};

export function resolveTarget(name: string): TargetConfig | undefined {
  return TARGETS[name];
}

export function targetNames(): string[] {
  return Object.keys(TARGETS);
}
