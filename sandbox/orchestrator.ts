#!/usr/bin/env bun
//
// orchestrator.ts — host side of the Adcelerate disposable agent-sandbox.
//
// The host owns everything that needs trust: cloning the (possibly private) repo,
// holding GitHub/`gh` auth, pushing branches, opening PRs. The container owns only
// the dangerous part — running the agent — behind three isolation layers (network
// firewall, throwaway per-run clone, dropped privileges).
//
// Pipeline per run:
//   clone --recurse-submodules → docker run (cap-drop ALL, +NET_ADMIN, non-root,
//   cpu/mem/pid limits, OAuth env, NO api key) → trap-guaranteed teardown →
//   read result.json → push fresh branch → gh pr create
//   → [submodule changed ⇒ submodule PR + parent-pointer draft PR] → prune.
//
// Usage:
//   bun run sandbox/orchestrator.ts --task "<task>" [--target adcelerate]
//        [--parallel N] [--model opus] [--dry-run] [--no-pr] [--keep]
//        [--timeout-ms N]
//   bun run sandbox/orchestrator.ts --doctor
//   bun run sandbox/orchestrator.ts --clean
//
// `just sandbox-run "<task>" target=… parallel=…` is the friendly entry point.

import { spawn } from "bun";
import { mkdir, rm, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  IMAGE_TAG,
  NETWORK_NAME,
  PREFIX,
  BRANCH_PREFIX,
  OAUTH_ENV,
  DEFAULT_MODEL,
  CONCURRENCY_CAP,
  RUN_TIMEOUT_MS,
  LIMITS,
  CAP_ADD,
  ALLOWLIST_DOMAINS,
  resolveTarget,
  targetNames,
  type TargetConfig,
} from "./config.ts";

// ───────────────────────────── small process helpers ─────────────────────────

interface ShResult {
  code: number;
  stdout: string;
  stderr: string;
}

/** Run a command to completion, capturing output. Never throws on non-zero. */
async function sh(cmd: string[], opts: { cwd?: string; env?: Record<string, string> } = {}): Promise<ShResult> {
  const proc = spawn(cmd, {
    cwd: opts.cwd,
    env: opts.env ? { ...process.env, ...opts.env } : process.env,
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  return { code, stdout, stderr };
}

/** Redact a secret from a string for safe logging. */
function scrub(text: string, secret?: string): string {
  if (!secret) return text;
  return text.split(secret).join("***REDACTED***");
}

/** Stream a command's output live (token-scrubbed). Returns the exit code. */
async function streamScrubbed(cmd: string[], secret: string | undefined, timeoutMs: number, onTimeout: () => void): Promise<number> {
  const proc = spawn(cmd, { stdout: "pipe", stderr: "pipe", env: process.env });

  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    onTimeout();
    try {
      proc.kill();
    } catch {
      /* already gone */
    }
  }, timeoutMs);

  const pump = async (stream: ReadableStream<Uint8Array>) => {
    const reader = stream.getReader();
    const dec = new TextDecoder();
    let buf = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) process.stdout.write(scrub(line, secret) + "\n");
    }
    if (buf) process.stdout.write(scrub(buf, secret));
  };

  await Promise.all([pump(proc.stdout), pump(proc.stderr)]);
  const code = await proc.exited;
  clearTimeout(timer);
  return timedOut ? 124 : code;
}

// ───────────────────────────── arg parsing ───────────────────────────────────

interface Args {
  task?: string;
  target: string;
  parallel: number;
  model: string;
  dryRun: boolean;
  noPr: boolean;
  keep: boolean;
  doctor: boolean;
  clean: boolean;
  timeoutMs: number;
}

function parseArgs(argv: string[]): Args {
  const a: Args = {
    target: "adcelerate",
    parallel: 1,
    model: DEFAULT_MODEL,
    dryRun: false,
    noPr: false,
    keep: false,
    doctor: false,
    clean: false,
    timeoutMs: RUN_TIMEOUT_MS,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    // Consume the next arg as `flag`'s value. Fail fast (rather than silently
    // launching a billed run against the wrong target/model/timeout) when the
    // value is missing or is itself another flag.
    const next = (flag: string): string => {
      const v = argv[++i];
      if (v === undefined || v.startsWith("--")) throw new Error(`missing value for ${flag}`);
      return v;
    };
    switch (arg) {
      case "--task": a.task = next("--task"); break;
      case "--target": a.target = next("--target"); break;
      case "--parallel": a.parallel = Math.max(1, parseInt(next("--parallel"), 10) || 1); break;
      case "--model": a.model = next("--model"); break;
      case "--timeout-ms": a.timeoutMs = parseInt(next("--timeout-ms"), 10) || RUN_TIMEOUT_MS; break;
      case "--dry-run": a.dryRun = true; break;
      case "--no-pr": a.noPr = true; break;
      case "--keep": a.keep = true; break;
      case "--doctor": a.doctor = true; break;
      case "--clean": a.clean = true; break;
      default:
        if (arg.startsWith("--")) throw new Error(`unknown flag: ${arg}`);
        else if (!a.task) a.task = arg; // bare positional = task
    }
  }
  return a;
}

// ───────────────────────────── utilities ─────────────────────────────────────

function slugify(task: string): string {
  return (
    task
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "task"
  );
}

function newRunId(): string {
  const t = Date.now().toString(36).slice(-5);
  const r = Math.random().toString(36).slice(2, 5);
  return `${PREFIX}-${t}${r}`;
}

const RUN_BASE = join(tmpdir(), "adcelerate-sandbox");

async function dockerAvailable(): Promise<boolean> {
  return (await sh(["docker", "version", "--format", "{{.Server.Version}}"])).code === 0;
}

async function imageExists(): Promise<boolean> {
  return (await sh(["docker", "image", "inspect", IMAGE_TAG])).code === 0;
}

async function ensureNetwork(): Promise<void> {
  const ls = await sh(["docker", "network", "ls", "--format", "{{.Name}}"]);
  if (!ls.stdout.split("\n").includes(NETWORK_NAME)) {
    await sh(["docker", "network", "create", NETWORK_NAME]);
  }
}

/** Default branch of a checked-out repo (e.g. `master`), falling back to `main`. */
async function defaultBranch(repoDir: string): Promise<string> {
  const r = await sh(["git", "-C", repoDir, "symbolic-ref", "refs/remotes/origin/HEAD"]);
  const ref = r.stdout.trim();
  if (ref) return ref.replace("refs/remotes/origin/", "");
  return "main";
}

/**
 * Normalize a git remote URL to canonical HTTPS so a credential-less clone works
 * even when the host's `origin` is SSH (no SSH keys exist inside, and we clone on
 * the host without them too). Handles `git@host:owner/repo(.git)` and
 * `ssh://git@host/owner/repo(.git)`; leaves http(s) URLs unchanged and preserves
 * any trailing `.git` to match the standalone URLs in config.ts.
 */
function normalizeRemoteUrl(url: string): string {
  // ssh://[user@]host[:port]/owner/repo(.git)
  const sshProto = url.match(/^ssh:\/\/(?:[^@/]+@)?([^/:]+)(?::\d+)?\/(.+)$/);
  if (sshProto) return `https://${sshProto[1]}/${sshProto[2]}`;
  // scp-like: [user@]host:owner/repo(.git)
  const scpLike = url.match(/^(?:[^@/]+@)?([^/:]+):(.+)$/);
  if (scpLike && !url.includes("://")) return `https://${scpLike[1]}/${scpLike[2]}`;
  return url;
}

/** Resolve the parent monorepo's origin URL (host cwd is the parent repo). */
async function parentOrigin(): Promise<string> {
  const r = await sh(["git", "remote", "get-url", "origin"]);
  return normalizeRemoteUrl(r.stdout.trim());
}

// ───────────────────────────── docker run argv ───────────────────────────────

interface RunSpec {
  id: string;
  slug: string;
  branch: string;
  target: string;
  cfg: TargetConfig;
  stage: string; // host per-run dir, bind-mounted to /work
  task: string;
  model: string;
  token: string;
}

/** Build the EXACT `docker run` argv. Shared by dry-run printing and real exec. */
function buildDockerArgs(s: RunSpec): string[] {
  // Run as the host UID:GID (not the image's hardcoded `node`) so the bind-mounted
  // clone — which keeps host ownership — stays writable inside the container. On
  // hosts where node's uid/gid != host uid/gid, `--user node` causes EACCES on
  // installs/edits under /work/repo.
  const uid = typeof process.getuid === "function" ? String(process.getuid()) : "1000";
  const gid = typeof process.getgid === "function" ? String(process.getgid()) : "1000";
  return [
    "run",
    "--name", s.id,
    "--network", NETWORK_NAME,
    "--cap-drop", "ALL",
    ...CAP_ADD.flatMap((c) => ["--cap-add", c]),
    "--user", `${uid}:${gid}`,
    "--cpus", LIMITS.cpus,
    "--memory", LIMITS.memory,
    "--pids-limit", LIMITS.pidsLimit,
    // NB: /var/run/docker.sock is never mounted; the only mount is the throwaway clone.
    "-v", `${s.stage}:/work`,
    // Subscription auth only. ANTHROPIC_API_KEY is intentionally NOT forwarded.
    "-e", `${OAUTH_ENV}=${s.token}`,
    "-e", `SANDBOX_ID=${s.id}`,
    "-e", `SANDBOX_SLUG=${s.slug}`,
    "-e", `SANDBOX_TARGET=${s.target}`,
    "-e", `SANDBOX_MODEL=${s.model}`,
    "-e", `SANDBOX_INSTALL_DIR=${s.cfg.path}`,
    "-e", `SANDBOX_BRANCH=${s.branch}`,
    "-e", `SANDBOX_ALLOWLIST=${ALLOWLIST_DOMAINS.join(" ")}`,
    "-e", `SANDBOX_TASK=${s.task}`,
    IMAGE_TAG,
    s.task,
  ];
}

/** Printable form of the docker argv with the token redacted. */
function printableDockerArgs(s: RunSpec): string {
  return buildDockerArgs({ ...s, token: "***REDACTED***" })
    .map((a) => (a.includes(" ") ? JSON.stringify(a) : a))
    .join(" ");
}

// ───────────────────────────── result shape ──────────────────────────────────

interface RunResult {
  id: string;
  slug: string;
  target: string;
  branch: string;
  task: string;
  firewall_ok?: boolean;
  install_ok?: boolean;
  agent_exit?: number;
  tests?: { ran: boolean; passed: boolean | null };
  has_changes?: boolean;
  commit?: string;
  changed_files?: string[];
  changed_submodules?: string[];
  error?: string;
}

interface RunSummary {
  id: string;
  target: string;
  branch: string;
  prUrl?: string;
  submodulePrUrls?: string[];
  testsPassed?: boolean | null;
  hasChanges?: boolean;
  error?: string;
}

// ───────────────────────────── PR helpers ────────────────────────────────────

function prBody(res: RunResult, extra = ""): string {
  const tests = res.tests?.ran
    ? res.tests.passed === true
      ? "✅ passed"
      : res.tests.passed === false
        ? "❌ failed"
        : "—"
    : "not run";
  const files = (res.changed_files ?? []).slice(0, 50).map((f) => `- \`${f}\``).join("\n") || "_(none)_";
  return [
    `**Task:** ${res.task}`,
    `**Target:** ${res.target}`,
    `**Sandbox run:** \`${res.id}\``,
    `**Tests:** ${tests}`,
    `**Agent exit:** ${res.agent_exit ?? "?"}`,
    "",
    "**Changed files:**",
    files,
    extra ? `\n${extra}` : "",
    "",
    "---",
    "🤖 Generated by the Adcelerate agent-sandbox. Review before merge — this branch was produced by an autonomous agent in an isolated, network-locked container.",
  ].join("\n");
}

async function openPr(
  repoDir: string,
  branch: string,
  title: string,
  body: string,
  draft: boolean,
): Promise<{ url?: string; error?: string }> {
  const base = await defaultBranch(repoDir);
  const args = ["pr", "create", "--head", branch, "--base", base, "--title", title, "--body", body];
  if (draft) args.push("--draft");
  const r = await sh(["gh", ...args], { cwd: repoDir });
  if (r.code !== 0) return { error: r.stderr.trim() || r.stdout.trim() };
  return { url: r.stdout.trim() };
}

// ───────────────────────────── one run ───────────────────────────────────────

async function runOne(args: Args, idx: number, parentUrl: string): Promise<RunSummary> {
  const cfg = resolveTarget(args.target)!;
  const id = newRunId();
  const slug = slugify(args.task!);
  const branch = `${BRANCH_PREFIX}/${id}-${slug}`;
  const stage = join(RUN_BASE, id);
  const repoDir = join(stage, "repo");
  const token = process.env[OAUTH_ENV] ?? "";

  const summary: RunSummary = { id, target: args.target, branch };
  const tag = `[${id}]`;
  const cloneUrl = cfg.kind === "standalone" ? cfg.url! : parentUrl;
  const recurse = cfg.kind !== "standalone";

  const spec: RunSpec = { id, slug, branch, target: args.target, cfg, stage, task: args.task!, model: args.model, token };

  // ── dry-run: print the plan, touch nothing. ──
  if (args.dryRun) {
    console.log(`\n${tag} DRY RUN`);
    console.log(`${tag} clone: git clone ${recurse ? "--recurse-submodules " : ""}${cloneUrl} ${repoDir}`);
    console.log(`${tag} docker ${printableDockerArgs(spec)}`);
    console.log(`${tag} (no API key forwarded · caps: drop ALL, add ${CAP_ADD.join("+")} · limits: cpus=${LIMITS.cpus} mem=${LIMITS.memory} pids=${LIMITS.pidsLimit})`);
    console.log(`${tag} push: git -C ${repoDir} push origin ${branch}  →  gh pr create (base=<default>)`);
    return summary;
  }

  try {
    await mkdir(stage, { recursive: true });

    // 1. clone the throwaway per-run copy (host holds any credentials).
    console.log(`${tag} cloning ${cloneUrl}`);
    const cloneArgs = ["git", "clone", ...(recurse ? ["--recurse-submodules"] : []), cloneUrl, repoDir];
    const clone = await sh(cloneArgs);
    if (clone.code !== 0) {
      summary.error = `clone failed: ${clone.stderr.trim()}`;
      return summary;
    }
    // No chmod 0o777 workaround needed: the container runs as the host UID:GID
    // (see buildDockerArgs), so the host-owned clone is already writable.

    // 2. run the agent container (trap-guaranteed teardown below).
    console.log(`${tag} starting container`);
    const code = await streamScrubbed(
      ["docker", ...buildDockerArgs(spec)],
      token,
      args.timeoutMs,
      () => console.error(`${tag} TIMEOUT after ${args.timeoutMs}ms — killing container`),
    );
    if (code === 124) summary.error = "run timed out";

    // 3. teardown (guaranteed even if the run failed).
    if (!args.keep) await sh(["docker", "rm", "-f", id]);

    // 4. read result.json.
    const resultPath = join(stage, "result.json");
    if (!existsSync(resultPath)) {
      summary.error = summary.error ?? "no result.json produced";
      return summary;
    }
    const res: RunResult = JSON.parse(await readFile(resultPath, "utf8"));
    summary.testsPassed = res.tests?.passed ?? null;
    summary.hasChanges = res.has_changes;

    if (!res.has_changes) {
      console.log(`${tag} agent produced no changes — skipping PR`);
      summary.error = summary.error ?? "no changes";
      return summary;
    }

    if (args.noPr) {
      console.log(`${tag} --no-pr: committed on ${branch}, skipping push/PR`);
      return summary;
    }

    const testsFailed = res.tests?.ran === true && res.tests?.passed === false;
    const agentFailed = (res.agent_exit ?? 0) !== 0;
    const draft = testsFailed || agentFailed;
    const title = `sandbox: ${args.task!.slice(0, 60)}`;

    // 5. submodule auto-sync (parent/subpath targets only).
    const subPrUrls: string[] = [];
    const changedSubs = res.changed_submodules ?? [];
    let submoduleSyncFailed = false;
    if (changedSubs.length > 0) {
      for (const sp of changedSubs) {
        const subDir = join(repoDir, sp);
        console.log(`${tag} pushing submodule branch: ${sp}`);
        const push = await sh(["git", "-C", subDir, "push", "origin", branch]);
        if (push.code !== 0) {
          console.error(`${tag} submodule push failed (${sp}): ${push.stderr.trim()}`);
          submoduleSyncFailed = true;
          continue;
        }
        const pr = await openPr(subDir, branch, title, prBody(res, `Submodule \`${sp}\` change.`), draft);
        if (pr.url) {
          subPrUrls.push(pr.url);
          console.log(`${tag} submodule PR: ${pr.url}`);
        } else {
          console.error(`${tag} submodule PR failed (${sp}): ${pr.error}`);
          submoduleSyncFailed = true;
        }
      }
      summary.submodulePrUrls = subPrUrls;
    }

    // If any submodule push/PR failed, do NOT push the parent branch or open the
    // parent PR — a parent-pointer PR referencing an unpushed submodule SHA breaks
    // the "submodule PR first, then parent draft PR" choreography.
    if (submoduleSyncFailed) {
      summary.error = "submodule sync failed";
      return summary;
    }

    // 6. push parent/standalone branch + open PR.
    console.log(`${tag} pushing ${branch}`);
    const push = await sh(["git", "-C", repoDir, "push", "origin", branch]);
    if (push.code !== 0) {
      summary.error = `push failed: ${push.stderr.trim()}`;
      return summary;
    }
    // A parent-pointer PR that references unmerged submodule SHAs must be a DRAFT
    // until the submodule PR merges (avoids the post-merge pointer-regression trap).
    const parentDraft = draft || subPrUrls.length > 0;
    const linkNote =
      subPrUrls.length > 0
        ? `Blocked on submodule PR(s): ${subPrUrls.join(", ")}. Merge those first, then re-point.`
        : "";
    const pr = await openPr(repoDir, branch, title, prBody(res, linkNote), parentDraft);
    if (pr.url) {
      summary.prUrl = pr.url;
      console.log(`${tag} PR: ${pr.url}`);
    } else {
      summary.error = `gh pr create failed: ${pr.error}`;
    }

    return summary;
  } catch (e) {
    summary.error = `unexpected: ${(e as Error).message}`;
    return summary;
  } finally {
    // teardown safety-net + run-dir prune.
    if (!args.keep) {
      await sh(["docker", "rm", "-f", id]);
      await rm(stage, { recursive: true, force: true }).catch(() => {});
    } else {
      console.log(`${tag} --keep: container ${id} + ${stage} preserved`);
    }
  }
}

// ───────────────────────────── concurrency pool ──────────────────────────────

async function pool<T, R>(items: T[], cap: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(cap, items.length) }, async () => {
    for (;;) {
      const i = cursor++;
      if (i >= items.length) break;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

// ───────────────────────────── doctor ────────────────────────────────────────

interface Check {
  name: string;
  ok: boolean;
  note?: string;
}

async function doctor(): Promise<number> {
  const checks: Check[] = [];
  const push = (name: string, ok: boolean, note?: string) => checks.push({ name, ok, note });

  const hasDocker = await dockerAvailable();
  push("Docker engine reachable", hasDocker);

  const hasImage = hasDocker && (await imageExists());
  push("Image adcelerate-sandbox:latest present", hasImage, hasImage ? undefined : "run: just sandbox-build");

  if (hasDocker) {
    await ensureNetwork();
    const net = await sh(["docker", "network", "ls", "--format", "{{.Name}}"]);
    push("Network sandbox-net exists", net.stdout.split("\n").includes(NETWORK_NAME));
  } else {
    push("Network sandbox-net exists", false, "docker unavailable");
  }

  // Static argv audit — built from the same code path real runs use.
  const sample: RunSpec = {
    id: "sb-doctor", slug: "doctor", branch: "sandbox/doctor", target: "adcelerate",
    cfg: resolveTarget("adcelerate")!, stage: "/tmp/adcelerate-sandbox/sb-doctor", task: "noop",
    model: DEFAULT_MODEL, token: "x",
  };
  const argv = buildDockerArgs(sample);
  const argStr = argv.join(" ");
  push(
    `Caps: drop ALL + add ${CAP_ADD.join("+")} only`,
    argStr.includes("--cap-drop ALL") &&
      CAP_ADD.every((c) => argStr.includes(`--cap-add ${c}`)) &&
      argStr.match(/--cap-add/g)?.length === CAP_ADD.length,
  );
  push("Runs as non-root (--user <uid>:<gid>)", /--user \d+:\d+/.test(argStr));
  push("Resource limits set (cpus/memory/pids)", argStr.includes("--cpus") && argStr.includes("--memory") && argStr.includes("--pids-limit"));
  push("No docker.sock mount", !argStr.includes("docker.sock"));
  push("No host working-tree bind-mount", !argv.some((a) => a.includes(process.cwd())));
  push("ANTHROPIC_API_KEY not forwarded", !argStr.includes("ANTHROPIC_API_KEY"));
  push("Subscription OAuth token forwarded", argStr.includes(OAUTH_ENV));

  const tokenPresent = !!process.env[OAUTH_ENV];
  push("CLAUDE_CODE_OAUTH_TOKEN available in env", tokenPresent, tokenPresent ? undefined : "set it in .env (claude setup-token); needed for real runs");

  // Live firewall allow/deny self-test inside a throwaway container.
  if (hasImage) {
    console.log("[doctor] running in-container firewall self-test…");
    const fw = await sh([
      "docker", "run", "--rm",
      "--network", NETWORK_NAME,
      "--cap-drop", "ALL", ...CAP_ADD.flatMap((c) => ["--cap-add", c]),
      "--user", "node",
      "--entrypoint", "bash",
      IMAGE_TAG,
      "-c", "/usr/local/bin/init-firewall.sh >/dev/null 2>&1 && /usr/local/bin/init-firewall.sh --self-test",
    ]);
    push("Firewall allows Anthropic, blocks example.com + LAN", fw.code === 0, fw.code === 0 ? undefined : fw.stderr.trim().split("\n").slice(-2).join(" "));
  } else {
    push("Firewall allows Anthropic, blocks example.com + LAN", false, "build the image first");
  }

  // Report.
  console.log("\nAdcelerate Sandbox Doctor");
  console.log("==========================");
  let failed = 0;
  for (const c of checks) {
    const mark = c.ok ? "✅" : "❌";
    if (!c.ok) failed++;
    console.log(`  ${mark} ${c.name}${c.note ? `  — ${c.note}` : ""}`);
  }
  console.log("");
  console.log("Threat-model coverage (see sandbox/README.md for the full table):");
  console.log("  • token exfil → egress allowlist + OAuth + scrubbed logs + non-root");
  console.log("  • container escape → no docker.sock, no --privileged");
  console.log("  • LAN/host pivot → RFC-1918 + host-gateway dropped");
  console.log("  • destructive git → push to fresh sandbox/* branch only, never --force/main");
  console.log("  • resource abuse → cpu/mem/pid limits + wall-clock timeout + guaranteed teardown");
  console.log("");
  if (failed > 0) {
    console.error(`${failed} check(s) failed.`);
    return 1;
  }
  console.log("All checks passed.");
  return 0;
}

// ───────────────────────────── clean ─────────────────────────────────────────

async function clean(): Promise<number> {
  if (await dockerAvailable()) {
    const ps = await sh(["docker", "ps", "-aq", "--filter", `name=^${PREFIX}-`]);
    const ids = ps.stdout.split("\n").filter(Boolean);
    if (ids.length) {
      console.log(`[clean] removing ${ids.length} sandbox container(s)`);
      await sh(["docker", "rm", "-f", ...ids]);
    }
    const vols = await sh(["docker", "volume", "ls", "-q", "--filter", `name=^${PREFIX}-`]);
    const vol = vols.stdout.split("\n").filter(Boolean);
    if (vol.length) {
      console.log(`[clean] removing ${vol.length} stray sandbox volume(s)`);
      await sh(["docker", "volume", "rm", ...vol]);
    }
  }
  await rm(RUN_BASE, { recursive: true, force: true }).catch(() => {});
  console.log(`[clean] pruned run dirs under ${RUN_BASE}`);
  return 0;
}

// ───────────────────────────── main ──────────────────────────────────────────

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));

  if (args.doctor) return doctor();
  if (args.clean) return clean();

  if (!args.task) {
    console.error('Usage: bun run sandbox/orchestrator.ts --task "<task>" [--target …] [--parallel N] [--dry-run]');
    return 2;
  }
  if (!resolveTarget(args.target)) {
    console.error(`Unknown target "${args.target}". Known: ${targetNames().join(", ")}`);
    return 2;
  }

  if (!args.dryRun) {
    if (!(await dockerAvailable())) {
      console.error("[orchestrator] Docker engine not reachable. Is Docker running?");
      return 1;
    }
    if (!(await imageExists())) {
      console.error(`[orchestrator] image ${IMAGE_TAG} not found. Run: just sandbox-build`);
      return 1;
    }
    if (!process.env[OAUTH_ENV]) {
      console.error(`[orchestrator] ${OAUTH_ENV} not set. Run \`claude setup-token\` and store it in .env.`);
      return 1;
    }
    await ensureNetwork();
  }

  const parentUrl = args.dryRun ? "<parent-origin>" : await parentOrigin();

  const effectiveCap = Math.min(args.parallel, CONCURRENCY_CAP);
  if (args.parallel > 1) {
    console.log(`[orchestrator] fan-out ${args.parallel} (concurrency cap ${effectiveCap}).`);
    console.warn("[orchestrator] ⚠️  Parallel sandboxes share ONE subscription rate-limit pool — they will throttle each other.");
    if (args.parallel > CONCURRENCY_CAP) {
      console.warn(`[orchestrator] ⚠️  --parallel ${args.parallel} exceeds cap ${CONCURRENCY_CAP}; running ${effectiveCap} at a time.`);
    }
  }

  const runs = Array.from({ length: args.parallel }, (_, i) => i);
  const summaries = await pool(runs, effectiveCap, (i) => runOne(args, i, parentUrl));

  // Aggregate summary table.
  console.log("\nSandbox run summary");
  console.log("===================");
  for (const s of summaries) {
    const status = s.error ? `error: ${s.error}` : s.prUrl ? s.prUrl : "(no PR)";
    const tests = s.testsPassed === true ? "tests✅" : s.testsPassed === false ? "tests❌" : "tests—";
    console.log(`  ${s.id} [${s.target}] ${tests}  ${status}`);
    if (s.submodulePrUrls?.length) {
      for (const u of s.submodulePrUrls) console.log(`      └─ submodule PR: ${u}`);
    }
  }

  const prCount = summaries.filter((s) => s.prUrl).length;
  console.log(`\n${prCount}/${summaries.length} PR(s) opened.`);
  // Fail the exit code if ANY real run hard-failed — a partial fan-out failure
  // must not be reported as success (it would hide real errors from CI).
  // "no changes" is a graceful non-failure and does not count.
  const hardFailures = summaries.some((s) => s.error && s.error !== "no changes");
  if (!args.dryRun && hardFailures) return 1;
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((e) => {
    console.error("[orchestrator] fatal:", e);
    process.exit(1);
  });
