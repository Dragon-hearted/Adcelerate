/**
 * Scrapling client — scrape-engine's transport to the Python sidecar.
 *
 * Shells out to `uv run python/scrapling_fetch.py`, pipes ONE JSON request to
 * the child's stdin, and parses the single JSON object the sidecar writes to
 * stdout. Modeled on scene-board's higgsfield-client: env-configurable runner,
 * Bun.spawn-first with a node:child_process fallback, a typed-error hierarchy,
 * and hint-array failure classification.
 *
 * The sidecar is an ENVIRONMENT prerequisite (uv + scrapling), not an npm dep.
 * See README.md / `just install`.
 */

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FetchRequestSchema, FetchResultSchema } from "./types";
import type { ErrorKind, FetchRequestInput, FetchResult } from "./types";

// ── Typed errors ───────────────────────────────────────────────────────────────

/** Base class so callers can `instanceof ScrapingError` to decide on fallback. */
export class ScrapingError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ScrapingError";
	}
}

/** uv / scrapling missing or not importable — run `just install`. */
export class ScrapingDependencyError extends ScrapingError {
	constructor(message: string) {
		super(message);
		this.name = "ScrapingDependencyError";
	}
}

/** Target responded with a bot wall (403/429/cloudflare/challenge/login/captcha). */
export class ScrapingBlockedError extends ScrapingError {
	constructor(message: string) {
		super(message);
		this.name = "ScrapingBlockedError";
	}
}

/** Fetch exceeded its deadline. */
export class ScrapingTimeoutError extends ScrapingError {
	constructor(message: string) {
		super(message);
		this.name = "ScrapingTimeoutError";
	}
}

/** Non-zero exit, unparseable stdout, or any otherwise-unclassified failure. */
export class ScrapingCliError extends ScrapingError {
	constructor(message: string) {
		super(message);
		this.name = "ScrapingCliError";
	}
}

// ── Configuration ──────────────────────────────────────────────────────────────
//
// Resolved at CALL time (not module-eval) so the runner/sidecar can be pointed
// at a shim per-invocation — keeps tests deterministic without re-importing the
// module, and lets the env be reconfigured at runtime.

/** The `uv` binary (or a shim, overridable via SCRAPLING_UV_BIN). */
function getRunner(): string {
	return process.env.SCRAPLING_UV_BIN ?? "uv";
}

/** Resolve the sidecar path relative to this module, with an env override. */
function getSidecar(): string {
	if (process.env.SCRAPLING_SIDECAR) return process.env.SCRAPLING_SIDECAR;
	// Works under both ESM (import.meta) and the CJS-ish fallback bundlers use.
	const here =
		typeof import.meta !== "undefined" && import.meta.url
			? dirname(fileURLToPath(import.meta.url))
			: __dirname;
	return resolve(here, "..", "python", "scrapling_fetch.py");
}

// ── Failure-classification hints ─────────────────────────────────────────────────

const DEPENDENCY_HINTS = [
	"no module named scrapling",
	"scrapling install",
	"uv: command not found",
	"modulenotfounderror",
	"no such file",
];

const TIMEOUT_HINTS = ["timed out", "timeout", "deadline exceeded"];

const BLOCKED_HINTS = [
	"403",
	"429",
	"cloudflare",
	"challenge",
	"/login",
	"captcha",
	"forbidden",
	"blocked",
];

// ── Spawn boundary ──────────────────────────────────────────────────────────────

export interface SpawnOutcome {
	exitCode: number;
	stdout: string;
	stderr: string;
}

/**
 * Run the sidecar via `RUNNER run SIDECAR [extraArgs…]`, piping `requestJson` to
 * its stdin. Prefers Bun.spawn, falling back to node:child_process so the module
 * is portable and testable. NEVER throws on a non-zero exit — captures and
 * returns exitCode/stdout/stderr for the caller to classify.
 */
export async function runScrapling(
	requestJson: string,
	extraArgs: string[] = [],
): Promise<SpawnOutcome> {
	const runner = getRunner();
	const sidecar = getSidecar();
	const argv = [runner, "run", sidecar, ...extraArgs];

	const bun = (globalThis as { Bun?: typeof import("bun") }).Bun;
	if (bun?.spawn) {
		const proc = bun.spawn(argv, {
			stdin: "pipe",
			stdout: "pipe",
			stderr: "pipe",
			env: process.env,
		});
		// Write the request then close stdin so the sidecar's read() returns.
		const stdin = proc.stdin as { write: (s: string) => void; end: () => void };
		stdin.write(requestJson);
		stdin.end();
		const [stdout, stderr] = await Promise.all([
			new Response(proc.stdout).text(),
			new Response(proc.stderr).text(),
		]);
		const exitCode = await proc.exited;
		return { exitCode, stdout, stderr };
	}

	// Node fallback (also the path most unit tests exercise).
	const { spawn } = await import("node:child_process");
	return new Promise<SpawnOutcome>((resolvePromise, reject) => {
		const child = spawn(runner, ["run", sidecar, ...extraArgs], {
			stdio: ["pipe", "pipe", "pipe"],
			env: process.env,
		});
		let stdout = "";
		let stderr = "";
		child.stdout?.on("data", (d: Buffer) => {
			stdout += d.toString();
		});
		child.stderr?.on("data", (d: Buffer) => {
			stderr += d.toString();
		});
		child.on("error", (err: Error) => {
			reject(new ScrapingCliError(`Failed to spawn "${runner}": ${err.message}`));
		});
		child.on("close", (code: number | null) => {
			resolvePromise({ exitCode: code ?? 0, stdout, stderr });
		});
		child.stdin?.write(requestJson);
		child.stdin?.end();
	});
}

// ── Error mapping ───────────────────────────────────────────────────────────────

/**
 * Convert a sidecar error payload (and/or stderr text) into the most specific
 * typed error. Prefers the structured `err.kind`; otherwise substring-matches
 * stderr in priority order dependency → timeout → blocked → cli.
 */
export function toTypedError(
	err?: { kind?: ErrorKind; message?: string; status?: number },
	stderr = "",
): ScrapingError {
	const message = err?.message?.trim() || stderr.trim() || "scraping failed";

	if (err?.kind) {
		switch (err.kind) {
			case "dependency":
				return new ScrapingDependencyError(message);
			case "timeout":
				return new ScrapingTimeoutError(message);
			case "blocked":
				return new ScrapingBlockedError(message);
			default:
				return new ScrapingCliError(message);
		}
	}

	const haystack = `${message}\n${stderr}`.toLowerCase();
	if (DEPENDENCY_HINTS.some((h) => haystack.includes(h))) {
		return new ScrapingDependencyError(message);
	}
	if (TIMEOUT_HINTS.some((h) => haystack.includes(h))) {
		return new ScrapingTimeoutError(message);
	}
	if (BLOCKED_HINTS.some((h) => haystack.includes(h))) {
		return new ScrapingBlockedError(message);
	}
	return new ScrapingCliError(message);
}

// ── Public API ──────────────────────────────────────────────────────────────────

/** Tail of stderr to attach to error messages without flooding logs. */
function stderrTail(stderr: string, max = 600): string {
	const t = stderr.trim();
	return t.length > max ? `…${t.slice(-max)}` : t;
}

/**
 * Fetch a page through the sidecar. Normalizes defaults via the Zod schema,
 * serializes the request, runs the sidecar, and returns a validated FetchResult.
 * Throws a typed ScrapingError on any failure.
 */
export async function fetchPage(req: FetchRequestInput): Promise<FetchResult> {
	const normalized = FetchRequestSchema.parse(req);
	const requestJson = JSON.stringify(normalized);

	const { exitCode, stdout, stderr } = await runScrapling(requestJson);

	let parsed: unknown;
	try {
		parsed = JSON.parse(stdout.trim());
	} catch {
		throw new ScrapingCliError(
			`Sidecar produced no parseable JSON (exit ${exitCode}). stderr: ${stderrTail(stderr)}`,
		);
	}

	const envelope = parsed as {
		ok?: boolean;
		error?: { kind?: ErrorKind; message?: string; status?: number };
	};
	if (!envelope || envelope.ok !== true) {
		throw toTypedError(envelope?.error, stderr);
	}

	return FetchResultSchema.parse(parsed);
}

/**
 * Cheap liveness probe: run the sidecar's `--selfcheck`. Returns true on exit 0,
 * false on any failure (missing binary, missing scrapling, …). Never throws.
 */
export async function checkScrapling(): Promise<boolean> {
	try {
		return (await runScrapling("", ["--selfcheck"])).exitCode === 0;
	} catch {
		return false;
	}
}
