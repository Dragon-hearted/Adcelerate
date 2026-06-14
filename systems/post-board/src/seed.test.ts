import { describe, expect, test } from "bun:test";
import { loadBrand } from "./brand-loader";
import { modeClassFor } from "./mode-class";
import { parseProject } from "./project";
import { createSeedProject } from "./seed";

const bundle = loadBrand({ silent: true });

function seed(type: "post" | "carousel", styleMode = "08-popart-screenprint") {
	return createSeedProject(bundle, {
		brief: "5 lessons from building an AI content pipeline.",
		type,
		format: "ig-4x5",
		styleMode,
		now: 1_750_000_000_000,
	});
}

describe("createSeedProject", () => {
	test("carousel seeds cover + 3 content + cta and validates", () => {
		const project = seed("carousel");
		expect(() => parseProject(project)).not.toThrow();
		expect(project.slides.map((s) => s.role)).toEqual([
			"cover",
			"content",
			"content",
			"content",
			"cta",
		]);
	});

	test("post seeds a single cover slide", () => {
		expect(seed("post").slides).toHaveLength(1);
	});

	test("layer ids are unique project-wide (regression: duplicate content kickers)", () => {
		const ids = seed("carousel").slides.flatMap((s) => s.layers.map((l) => l.id));
		expect(new Set(ids).size).toBe(ids.length);
	});

	test("css background uses the canonical brand.css mode class", () => {
		const project = seed("carousel", "02-lowpoly-neon-glow");
		for (const slide of project.slides) {
			expect(slide.background.type).toBe("css");
			if (slide.background.type === "css") {
				expect(slide.background.cssClass).toBe(modeClassFor("02-lowpoly-neon-glow"));
			}
		}
	});
});
