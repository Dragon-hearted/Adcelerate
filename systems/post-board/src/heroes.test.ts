import { describe, expect, test } from "bun:test";
import { loadBrand } from "./brand-loader";
import { buildHeroBatchRequest, targetSlides } from "./heroes";
import { createSeedProject } from "./seed";

const bundle = loadBrand({ silent: true });

function project() {
	return createSeedProject(bundle, {
		brief: "Five lessons from building an AI content pipeline.",
		type: "carousel",
		format: "ig-4x5",
		now: 1_750_000_000_000,
		id: "heroes-test",
	});
}

describe("buildHeroBatchRequest", () => {
	test("emits one batch item per slide, each linked by sceneId", () => {
		const p = project();
		const batch = buildHeroBatchRequest(p, bundle);
		expect(batch.items).toHaveLength(p.slides.length);
		const sceneIds = batch.items.map((i) => i.sceneId);
		expect(sceneIds).toEqual(p.slides.map((s) => `${p.id}:${s.id}`));
	});

	test("every item carries an on-brand prompt and the format aspect ratio", () => {
		const p = project();
		const batch = buildHeroBatchRequest(p, bundle);
		for (const item of batch.items) {
			expect(item.prompt.length).toBeGreaterThan(0);
			expect(item.prompt).toContain("NO TEXT");
			// ig-4x5 → 4:5
			expect(item.aspectRatio).toBe("4:5");
		}
	});

	test("omits `model` so ImageEngine applies its NanoBanana Pro default", () => {
		const batch = buildHeroBatchRequest(project(), bundle);
		for (const item of batch.items) {
			expect("model" in item).toBe(false);
		}
	});

	test("autoFallback is off by default (surface error) and opt-in when requested", () => {
		const off = buildHeroBatchRequest(project(), bundle);
		expect(off.items.every((i) => i.autoFallback === undefined)).toBe(true);
		const on = buildHeroBatchRequest(project(), bundle, { autoFallback: true });
		expect(on.items.every((i) => i.autoFallback === true)).toBe(true);
	});

	test("slideIds restricts the batch to the named slides", () => {
		const p = project();
		const only = [p.slides[1].id];
		const batch = buildHeroBatchRequest(p, bundle, { slideIds: only });
		expect(batch.items).toHaveLength(1);
		expect(batch.items[0].sceneId).toBe(`${p.id}:${only[0]}`);
		expect(targetSlides(p, only)).toHaveLength(1);
	});
});
