/**
 * Contract test: a realistic captured sidecar success response must validate
 * cleanly against the Zod result schema. Guards the wire contract between the
 * Python sidecar and the TS client against accidental drift.
 *
 * No spawn, network, or scrapling — pure schema validation over a fixture.
 */

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FetchResultSchema } from "../src/types";

const FIXTURE = join(import.meta.dir, "fixtures", "pinterest-search.json");

describe("FetchResultSchema contract", () => {
	test("captured pinterest-search response parses without error", () => {
		const raw = JSON.parse(readFileSync(FIXTURE, "utf8"));
		const result = FetchResultSchema.parse(raw);

		expect(result.ok).toBe(true);
		expect(result.status).toBe(200);
		expect(result.fetcher).toBe("stealthy");
		expect(result.extracted?.images).toHaveLength(3);
		expect(result.extracted?.videos).toHaveLength(1);
		// A null attribute (image with no alt) round-trips through the schema.
		expect(result.extracted?.images[2].attributes.alt).toBeNull();
		// Video src + poster survive extraction.
		expect(result.extracted?.videos[0].attributes.src).toContain(".mp4");
		expect(result.meta?.relocations).toBe(1);
		expect(result.meta?.scraplingVersion).toBe("0.4.8");
	});

	test("rejects a payload missing the required status field", () => {
		const bad = { ok: true, fetcher: "stealthy" };
		expect(() => FetchResultSchema.parse(bad)).toThrow();
	});
});
