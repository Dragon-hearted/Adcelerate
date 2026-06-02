#!/usr/bin/env bun
/**
 * scrape-engine CLI — drive the adaptive scraping gateway from the shell.
 *
 *   bun run src/cli.ts fetch <url> [flags]
 *
 * Thin wrapper over the TS client (`fetchPage`). Prints a human summary by
 * default, or the raw FetchResult JSON with --json.
 */

import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { ScrapingError, fetchPage } from "./index";
import { CookieSchema, type FetchRequestInput } from "./types";

const HELP = `scrape-engine — adaptive scraping gateway (Scrapling-backed)

USAGE
  bun run src/cli.ts fetch <url> [flags]

FLAGS
  --fetcher <name>        stealthy | dynamic | http. Default stealthy.
  --output <mode>         extracted | html. Default extracted.
  --css <name=selector>   Add a named CSS selector (repeatable). Builds the
                          selectors map for --output extracted.
  --attr <name>           Attribute to collect from matched elements (repeatable).
  --adaptive              Enable Scrapling's adaptive relocation (default).
  --no-adaptive           Disable adaptive relocation.
  --headless              Run the browser headless (default).
  --no-headless           Run the browser headed (first-login / debugging).
  --cookies <path>        Path to a Playwright cookies.json to inject.
  --timeout-ms <n>        Per-fetch timeout in milliseconds. Default 35000.
  --user-agent <ua>       Override the User-Agent.
  --wait-selector <css>   Wait for this selector before reading the page.
  --json                  Print the raw FetchResult JSON instead of a summary.
  -h, --help              Show this help.

EXAMPLES
  # Extract image + video URLs from a search page
  bun run src/cli.ts fetch "https://example.com/search?q=neon" \\
      --css images=img.thumb --css videos=video --attr src --json

  # Grab raw HTML via the plain HTTP fetcher
  bun run src/cli.ts fetch "https://example.com" --fetcher http --output html

  # Authenticated scrape with captured cookies, headed
  bun run src/cli.ts fetch "https://example.com/feed" \\
      --cookies ./cookies.json --no-headless --css pins=a.pin --attr href

LEARN MORE
  README         : systems/scrape-engine/README.md
  Knowledge base : systems/scrape-engine/knowledge/
  Install        : just install   (uv + scrapling[all]==0.4.8)
`;

function die(msg: string, code = 1): never {
	console.error(`error: ${msg}`);
	console.error("");
	console.error("Run with --help for usage.");
	process.exit(code);
}

interface ParsedFlags {
	fetcher?: string;
	output?: string;
	css: string[];
	attr: string[];
	adaptive?: boolean;
	headless?: boolean;
	cookies?: string;
	timeoutMs?: number;
	userAgent?: string;
	waitSelector?: string;
	json: boolean;
}

function parseFlags(argv: string[]): { url: string; flags: ParsedFlags } {
	let parsed: ReturnType<typeof parseArgs>;
	try {
		parsed = parseArgs({
			args: argv,
			strict: true,
			allowPositionals: true,
			options: {
				fetcher: { type: "string" },
				output: { type: "string" },
				css: { type: "string", multiple: true },
				attr: { type: "string", multiple: true },
				adaptive: { type: "boolean" },
				"no-adaptive": { type: "boolean" },
				headless: { type: "boolean" },
				"no-headless": { type: "boolean" },
				cookies: { type: "string" },
				"timeout-ms": { type: "string" },
				"user-agent": { type: "string" },
				"wait-selector": { type: "string" },
				json: { type: "boolean" },
				help: { type: "boolean", short: "h" },
			},
		});
	} catch (e) {
		die(`bad arguments: ${e instanceof Error ? e.message : String(e)}`);
	}

	const v = parsed.values as Record<string, unknown>;
	if (v.help) {
		console.log(HELP);
		process.exit(0);
	}

	const positionals = parsed.positionals;
	if (positionals[0] !== "fetch") {
		die(`unknown command "${positionals[0] ?? ""}". Only "fetch <url>" is supported.`);
	}
	const url = positionals[1];
	if (!url) die("fetch requires a <url> positional argument");

	// --adaptive / --no-adaptive (default on); --headless / --no-headless (default on).
	let adaptive: boolean | undefined;
	if (v["no-adaptive"]) adaptive = false;
	else if (v.adaptive) adaptive = true;

	let headless: boolean | undefined;
	if (v["no-headless"]) headless = false;
	else if (v.headless) headless = true;

	let timeoutMs: number | undefined;
	if (typeof v["timeout-ms"] === "string") {
		const n = Number.parseInt(v["timeout-ms"], 10);
		if (!Number.isFinite(n) || n <= 0) die("--timeout-ms must be a positive integer");
		timeoutMs = n;
	}

	return {
		url,
		flags: {
			fetcher: v.fetcher as string | undefined,
			output: v.output as string | undefined,
			css: (v.css as string[] | undefined) ?? [],
			attr: (v.attr as string[] | undefined) ?? [],
			adaptive,
			headless,
			cookies: v.cookies as string | undefined,
			timeoutMs,
			userAgent: v["user-agent"] as string | undefined,
			waitSelector: v["wait-selector"] as string | undefined,
			json: Boolean(v.json),
		},
	};
}

/** Parse repeated `--css name=selector` into a selectors record. */
function buildSelectors(pairs: string[]): Record<string, string> | undefined {
	if (pairs.length === 0) return undefined;
	const selectors: Record<string, string> = {};
	for (const pair of pairs) {
		const eq = pair.indexOf("=");
		if (eq <= 0) die(`--css expects name=selector (got "${pair}")`);
		selectors[pair.slice(0, eq)] = pair.slice(eq + 1);
	}
	return selectors;
}

/** Read + validate a Playwright cookies.json file. */
function loadCookies(path: string): FetchRequestInput["cookies"] {
	let raw: string;
	try {
		raw = readFileSync(path, "utf8");
	} catch (e) {
		die(`could not read --cookies "${path}": ${e instanceof Error ? e.message : String(e)}`);
	}
	let json: unknown;
	try {
		json = JSON.parse(raw);
	} catch (e) {
		die(`--cookies "${path}" is not valid JSON: ${e instanceof Error ? e.message : String(e)}`);
	}
	// Playwright exports either a bare array or {cookies:[…]}.
	const arr = Array.isArray(json) ? json : (json as { cookies?: unknown }).cookies;
	const result = CookieSchema.array().safeParse(arr);
	if (!result.success) die(`--cookies "${path}" does not match the expected cookie shape`);
	return result.data;
}

function buildRequest(url: string, flags: ParsedFlags): FetchRequestInput {
	const req: Record<string, unknown> = { url };
	if (flags.fetcher) req.fetcher = flags.fetcher;
	if (flags.output) req.output = flags.output;
	const selectors = buildSelectors(flags.css);
	if (selectors) req.selectors = selectors;
	if (flags.attr.length > 0) req.attributes = flags.attr;
	if (flags.adaptive !== undefined) req.adaptive = flags.adaptive;
	if (flags.headless !== undefined) req.headless = flags.headless;
	if (flags.cookies) req.cookies = loadCookies(flags.cookies);
	if (flags.timeoutMs !== undefined) req.timeoutMs = flags.timeoutMs;
	if (flags.userAgent) req.userAgent = flags.userAgent;
	if (flags.waitSelector) req.waitSelector = flags.waitSelector;
	return req as FetchRequestInput;
}

function printSummary(result: FetchRequestResult): void {
	const { status, fetcher, adaptive, html, extracted, meta } = result;
	console.log("──────────────────────────────");
	console.log(
		`✓ fetched  status=${status}  fetcher=${fetcher ?? "?"}  adaptive=${adaptive ?? "?"}`,
	);
	if (meta) {
		const bits: string[] = [];
		if (meta.scraplingVersion) bits.push(`scrapling=${meta.scraplingVersion}`);
		if (typeof meta.elapsedMs === "number") bits.push(`${Math.round(meta.elapsedMs)}ms`);
		if (typeof meta.relocations === "number") bits.push(`relocations=${meta.relocations}`);
		if (bits.length) console.log(`  ${bits.join("  ")}`);
	}
	if (typeof html === "string") {
		console.log(`  html: ${html.length} chars`);
	}
	if (extracted) {
		for (const [name, els] of Object.entries(extracted)) {
			console.log(`  ${name}: ${els.length} element(s)`);
		}
	}
	console.log("──────────────────────────────");
}

// Local alias to avoid importing the result type name collision in summary.
type FetchRequestResult = Awaited<ReturnType<typeof fetchPage>>;

async function main(): Promise<void> {
	const { url, flags } = parseFlags(process.argv.slice(2));
	const req = buildRequest(url, flags);

	try {
		const result = await fetchPage(req);
		if (flags.json) {
			console.log(JSON.stringify(result, null, 2));
		} else {
			printSummary(result);
		}
		process.exit(0);
	} catch (e) {
		if (e instanceof ScrapingError) {
			console.error(`✖ ${e.name}: ${e.message}`);
			process.exit(1);
		}
		console.error(`✖ ${e instanceof Error ? e.message : String(e)}`);
		process.exit(1);
	}
}

if (import.meta.main) {
	main();
}
