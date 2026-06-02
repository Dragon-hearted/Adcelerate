/**
 * Contract types for the scrape-engine gateway.
 *
 * The Zod schemas here are the SINGLE SOURCE OF TRUTH for the request/response
 * shape exchanged with the Python sidecar (`python/scrapling_fetch.py`). The
 * TypeScript types are derived via `z.infer` so the wire contract and the
 * compile-time types can never drift apart.
 */

import { z } from "zod";

// ── Cookie ────────────────────────────────────────────────────────────────────
// Playwright-shaped cookie. Loose + passthrough: any extra keys a captured
// cookies.json carries (e.g. `sameParty`, `priority`) survive the round-trip to
// the browser context untouched.

export const CookieSchema = z
	.object({
		name: z.string(),
		value: z.string(),
		domain: z.string().optional(),
		path: z.string().optional(),
		expires: z.number().optional(),
		httpOnly: z.boolean().optional(),
		secure: z.boolean().optional(),
		sameSite: z.string().optional(),
	})
	.passthrough();
export type Cookie = z.infer<typeof CookieSchema>;

// ── FetchRequest ────────────────────────────────────────────────────────────────
// What the TS client serializes to the sidecar's stdin. Defaults are applied by
// `.parse()` so callers can pass a sparse object and still get a normalized,
// fully-populated request on the wire.

export const FetchRequestSchema = z.object({
	url: z.string(),
	urls: z.array(z.string()).optional(),
	fetcher: z.enum(["stealthy", "dynamic", "http"]).default("stealthy"),
	headless: z.boolean().default(true),
	adaptive: z.boolean().default(true),
	output: z.enum(["html", "extracted"]).default("extracted"),
	selectors: z.record(z.string()).optional(),
	attributes: z.array(z.string()).default([]),
	cookies: z.array(CookieSchema).optional(),
	userAgent: z.string().optional(),
	timeoutMs: z.number().default(35000),
	waitSelector: z.string().optional(),
	networkIdle: z.boolean().optional(),
});
/** Fully-normalized request (defaults applied) — the on-the-wire shape. */
export type FetchRequest = z.infer<typeof FetchRequestSchema>;
/** Caller-facing request: defaulted fields are optional (pre-`.parse()`). */
export type FetchRequestInput = z.input<typeof FetchRequestSchema>;

// ── ExtractedElement ─────────────────────────────────────────────────────────
// One matched DOM element: its text plus the requested attributes (each nullable
// because a selector may match an element that lacks the attribute).

export const ExtractedElementSchema = z.object({
	text: z.string(),
	attributes: z.record(z.string().nullable()),
});
export type ExtractedElement = z.infer<typeof ExtractedElementSchema>;

// ── FetchResult ────────────────────────────────────────────────────────────────
// The success envelope. Either `html` (output=html) or `extracted` (the default)
// is populated depending on the request's output mode.

export const FetchResultSchema = z.object({
	ok: z.literal(true),
	url: z.string().optional(),
	status: z.number(),
	fetcher: z.string().optional(),
	adaptive: z.boolean().optional(),
	html: z.string().nullable().optional(),
	extracted: z.record(z.array(ExtractedElementSchema)).optional(),
	meta: z
		.object({
			scraplingVersion: z.string().optional(),
			elapsedMs: z.number().optional(),
			relocations: z.number().optional(),
		})
		.partial()
		.optional(),
});
export type FetchResult = z.infer<typeof FetchResultSchema>;

// ── Errors ─────────────────────────────────────────────────────────────────────
// The four failure classes the sidecar (and the TS client) can surface.

export const ErrorKindSchema = z.enum(["blocked", "timeout", "dependency", "cli"]);
export type ErrorKind = z.infer<typeof ErrorKindSchema>;

export const FetchErrorSchema = z.object({
	ok: z.literal(false),
	error: z.object({
		kind: ErrorKindSchema,
		message: z.string(),
		status: z.number().optional(),
	}),
});
export type FetchError = z.infer<typeof FetchErrorSchema>;
