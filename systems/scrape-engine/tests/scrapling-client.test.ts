/**
 * Unit tests for the scrape-engine client.
 *
 * Strategy: exercise the REAL spawn path against a fake "uv" shim — a tiny
 * executable shell script written to a temp dir. The shim ignores the sidecar
 * path it's handed, reads stdin (optionally capturing it for assertions), and
 * emits a canned stdout/stderr + exit code driven by env vars set per-test.
 *
 * The client resolves the runner/sidecar at CALL time, so a `beforeEach` that
 * re-points the env is enough to keep every test deterministic — no module
 * re-import gymnastics, no cross-file env races.
 *
 * Fully hermetic: NO real uv, scrapling, browser, or network.
 */

import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	ScrapingBlockedError,
	ScrapingCliError,
	ScrapingDependencyError,
	ScrapingTimeoutError,
	checkScrapling,
	fetchPage,
} from "../src/scrapling-client";

const TMP = mkdtempSync(join(tmpdir(), "scrape-engine-"));
const SHIM = join(TMP, "uv-shim.sh");
const STDIN_CAPTURE = join(TMP, "stdin.json");

// A fake `uv`. Invoked as: `uv-shim.sh run <sidecar> [extraArgs…]`.
//  - captures stdin to $SCRAPE_STDIN_CAPTURE when set
//  - on `--selfcheck`, prints a version line and exits $SCRAPE_SELFCHECK_EXIT
//  - otherwise prints $SCRAPE_STDOUT / $SCRAPE_STDERR and exits $SCRAPE_EXIT
writeFileSync(
	SHIM,
	`#!/usr/bin/env bash
stdin="$(cat)"
if [ -n "$SCRAPE_STDIN_CAPTURE" ]; then printf '%s' "$stdin" > "$SCRAPE_STDIN_CAPTURE"; fi
for a in "$@"; do
  if [ "$a" = "--selfcheck" ]; then
    echo '{"ok":true,"version":"0.4.8"}'
    exit "\${SCRAPE_SELFCHECK_EXIT:-0}"
  fi
done
if [ -n "$SCRAPE_STDERR" ]; then printf '%s' "$SCRAPE_STDERR" >&2; fi
printf '%s' "$SCRAPE_STDOUT"
exit "\${SCRAPE_EXIT:-0}"
`,
);
chmodSync(SHIM, 0o755);

/** Restore the shim wiring + clear the per-test driver vars before each test. */
beforeEach(() => {
	process.env.SCRAPLING_UV_BIN = SHIM;
	process.env.SCRAPLING_SIDECAR = join(TMP, "ignored-sidecar.py");
	for (const k of [
		"SCRAPE_STDOUT",
		"SCRAPE_STDERR",
		"SCRAPE_EXIT",
		"SCRAPE_SELFCHECK_EXIT",
		"SCRAPE_STDIN_CAPTURE",
	]) {
		delete process.env[k];
	}
});

afterAll(() => rmSync(TMP, { recursive: true, force: true }));

const SUCCESS = JSON.stringify({
	ok: true,
	url: "https://example.com/search",
	status: 200,
	fetcher: "stealthy",
	adaptive: true,
	extracted: {
		images: [
			{ text: "", attributes: { src: "https://cdn.example.com/a.jpg" } },
			{ text: "", attributes: { src: "https://cdn.example.com/b.jpg" } },
		],
	},
	meta: { scraplingVersion: "0.4.8", elapsedMs: 1234.5, relocations: 0 },
});

describe("fetchPage — success", () => {
	test("parses a success envelope into a schema-valid FetchResult", async () => {
		process.env.SCRAPE_STDOUT = SUCCESS;
		const result = await fetchPage({ url: "https://example.com/search" });
		expect(result.ok).toBe(true);
		expect(result.status).toBe(200);
		expect(result.fetcher).toBe("stealthy");
		expect(result.extracted?.images).toHaveLength(2);
		expect(result.extracted?.images[0].attributes.src).toBe("https://cdn.example.com/a.jpg");
		expect(result.meta?.relocations).toBe(0);
	});

	test("serializes the normalized request to the sidecar's stdin", async () => {
		process.env.SCRAPE_STDOUT = SUCCESS;
		process.env.SCRAPE_STDIN_CAPTURE = STDIN_CAPTURE;
		await fetchPage({
			url: "https://example.com/search",
			selectors: { images: "img.thumb" },
			attributes: ["src"],
		});
		const sent = JSON.parse(readFileSync(STDIN_CAPTURE, "utf8"));
		// Caller-supplied fields survive…
		expect(sent.url).toBe("https://example.com/search");
		expect(sent.selectors).toEqual({ images: "img.thumb" });
		expect(sent.attributes).toEqual(["src"]);
		// …and schema defaults are applied before hitting the wire.
		expect(sent.fetcher).toBe("stealthy");
		expect(sent.headless).toBe(true);
		expect(sent.adaptive).toBe(true);
		expect(sent.output).toBe("extracted");
		expect(sent.timeoutMs).toBe(35000);
	});
});

describe("fetchPage — typed errors from error.kind", () => {
	const cases: Array<[string, new (m: string) => Error]> = [
		["blocked", ScrapingBlockedError],
		["timeout", ScrapingTimeoutError],
		["dependency", ScrapingDependencyError],
		["cli", ScrapingCliError],
	];

	for (const [kind, ErrCls] of cases) {
		test(`error.kind="${kind}" → ${ErrCls.name}`, async () => {
			process.env.SCRAPE_STDOUT = JSON.stringify({
				ok: false,
				error: { kind, message: `synthetic ${kind} failure` },
			});
			process.env.SCRAPE_EXIT = "1";
			await expect(fetchPage({ url: "https://example.com" })).rejects.toBeInstanceOf(ErrCls);
		});
	}
});

describe("fetchPage — failure classification fallbacks", () => {
	test("non-JSON stdout → ScrapingCliError", async () => {
		process.env.SCRAPE_STDOUT = "<html>fatal: not json</html>";
		process.env.SCRAPE_STDERR = "traceback: kaboom";
		process.env.SCRAPE_EXIT = "1";
		await expect(fetchPage({ url: "https://example.com" })).rejects.toBeInstanceOf(
			ScrapingCliError,
		);
	});

	test("ok:false without kind, classified from message hints (blocked)", async () => {
		// No structured kind → toTypedError falls back to substring-matching.
		process.env.SCRAPE_STDOUT = JSON.stringify({
			ok: false,
			error: { message: "request returned 429 too many requests" },
		});
		process.env.SCRAPE_EXIT = "1";
		await expect(fetchPage({ url: "https://example.com" })).rejects.toBeInstanceOf(
			ScrapingBlockedError,
		);
	});
});

describe("checkScrapling", () => {
	test("returns true when the sidecar selfcheck exits 0", async () => {
		expect(await checkScrapling()).toBe(true);
	});

	test("returns false when the sidecar selfcheck exits non-zero", async () => {
		process.env.SCRAPE_SELFCHECK_EXIT = "1";
		expect(await checkScrapling()).toBe(false);
	});

	test("returns false when RUNNER points at a nonexistent binary", async () => {
		process.env.SCRAPLING_UV_BIN = join(TMP, "definitely-not-a-real-uv-binary-xyz");
		expect(await checkScrapling()).toBe(false);
	});
});
