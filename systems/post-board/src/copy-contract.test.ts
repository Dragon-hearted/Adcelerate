import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadBrand } from "./brand-loader";
import {
	type CopyDoc,
	copyDocToSlides,
	parseCopyDoc,
	placeholderCopyDoc,
	safeParseCopyDoc,
} from "./copy-contract";
import { getFormatPreset } from "./formats";
import { type Project, parseProject } from "./project";
import { familyOf } from "./templates";

const bundle = loadBrand({ silent: true });
const format = getFormatPreset("ig-4x5");

const sampleCopyDoc: CopyDoc = {
	hook: "5 LESSONS FROM BUILDING AN AI CONTENT PIPELINE.",
	slides: [
		{
			role: "content",
			headline: "STOP WRITING PROMPTS. BUILD SYSTEMS.",
			body: "One prompt is a coin flip. A system is a machine you can trust to ship.",
		},
		{ role: "stat", stat: { value: "-80%", label: "manual work" } },
		{ role: "quote", quote: "“WE DON’T DEMO. WE SHIP.”" },
	],
	cta: "READY TO BUILD INTELLIGENT SYSTEMS?",
	caption: "Five hard-won lessons from wiring an end-to-end AI content pipeline.",
	hashtags: ["#AIcontent", "#buildinpublic", "#automation"],
};

/** Wrap slides in a minimal valid project for end-to-end Zod validation. */
function projectFrom(slides: Project["slides"]): unknown {
	return {
		id: "copydoc-test",
		brand: "dragonhearted_labs",
		type: "carousel",
		format: { preset: format.id, width: format.width, height: format.height },
		styleMode: "08-popart-screenprint",
		brief: "test brief",
		createdAt: "2026-06-12T00:00:00.000Z",
		updatedAt: "2026-06-12T00:00:00.000Z",
		version: 1,
		slides,
	};
}

describe("copyDoc schema", () => {
	test("accepts a well-formed CopyDoc", () => {
		expect(safeParseCopyDoc(sampleCopyDoc).success).toBe(true);
		expect(parseCopyDoc(sampleCopyDoc)).toEqual(sampleCopyDoc);
	});

	test("rejects an invalid body-slide role", () => {
		const bad = { ...sampleCopyDoc, slides: [{ role: "cover" }] };
		expect(safeParseCopyDoc(bad).success).toBe(false);
	});

	test("rejects a stat missing its label", () => {
		const bad = { ...sampleCopyDoc, slides: [{ role: "stat", stat: { value: "+1" } }] };
		expect(safeParseCopyDoc(bad).success).toBe(false);
	});
});

describe("copyDocToSlides", () => {
	test("produces a Project that Zod-parses", () => {
		const slides = copyDocToSlides(sampleCopyDoc, bundle, format);
		const project = parseProject(projectFrom(slides));
		// cover + 3 body + cta
		expect(project.slides).toHaveLength(5);
		expect(project.slides.map((s) => s.role)).toEqual(["cover", "content", "stat", "quote", "cta"]);
	});

	test("the cover hook lands as a display-font text layer", () => {
		const slides = copyDocToSlides(sampleCopyDoc, bundle, format);
		const cover = slides.find((s) => s.role === "cover");
		expect(cover).toBeDefined();
		const headline = cover?.layers.find((l) => l.id === "l-cover-headline");
		expect(headline?.kind).toBe("text");
		if (headline?.kind === "text") {
			expect(headline.content).toBe(sampleCopyDoc.hook);
			expect(headline.fontFamily).toBe(familyOf(bundle, "display", "PP Neue Machina"));
			expect(headline.treatment).toBe("ink-bleed");
		}
	});

	test("the cta slide renders the CTA copy", () => {
		const slides = copyDocToSlides(sampleCopyDoc, bundle, format);
		const cta = slides.find((s) => s.role === "cta");
		const headline = cta?.layers.find((l) => l.id === "l-cta-headline");
		expect(headline?.kind).toBe("text");
		if (headline?.kind === "text") {
			expect(headline.content).toBe(sampleCopyDoc.cta);
		}
	});

	test("falls back to brand banners when fields are missing", () => {
		const sparse: CopyDoc = { hook: "", slides: [{ role: "stat" }], cta: "" };
		const slides = copyDocToSlides(sparse, bundle, format);
		const cover = slides.find((s) => s.role === "cover");
		const coverHeadline = cover?.layers.find((l) => l.id === "l-cover-headline");
		const cta = slides.find((s) => s.role === "cta");
		const ctaHeadline = cta?.layers.find((l) => l.id === "l-cta-headline");
		const stat = slides.find((s) => s.role === "stat");
		const statValue = stat?.layers.find((l) => l.id === "l-stat-1-value");

		if (coverHeadline?.kind === "text") {
			expect(coverHeadline.content).toBe(bundle.positioning.headlinePromise ?? "");
		}
		if (ctaHeadline?.kind === "text") {
			expect(ctaHeadline.content).toBe(bundle.positioning.ctaBanner ?? "");
		}
		// stat with no value pulls the first proof stat
		if (statValue?.kind === "text") {
			expect(statValue.content).toBe(bundle.positioning.proofStats[0]?.value ?? "");
		}
		// still a valid project
		expect(() => parseProject(projectFrom(slides))).not.toThrow();
	});

	test("all layer ids are unique across the project", () => {
		const slides = copyDocToSlides(sampleCopyDoc, bundle, format);
		const ids = slides.flatMap((s) => s.layers.map((l) => l.id));
		expect(new Set(ids).size).toBe(ids.length);
	});

	test("holds across all format presets", () => {
		for (const preset of ["ig-4x5", "ig-1x1", "story-9x16", "linkedin-4x5"] as const) {
			const slides = copyDocToSlides(sampleCopyDoc, bundle, getFormatPreset(preset));
			expect(() => parseProject(projectFrom(slides))).not.toThrow();
		}
	});
});

describe("display headline auto-fit", () => {
	const coverHeadline = (doc: CopyDoc) =>
		copyDocToSlides(doc, bundle, format)
			.find((s) => s.role === "cover")
			?.layers.find((l) => l.id === "l-cover-headline");
	const baseCoverSize = Math.round(format.width * 0.11);

	test("a short hook keeps the full base display size", () => {
		const h = coverHeadline({ hook: "SHIP IT.", slides: [], cta: "GO." });
		expect(h?.kind).toBe("text");
		if (h?.kind === "text") {
			expect(h.fontSize).toBe(baseCoverSize);
		}
	});

	test("a long hook is scaled down to fit its box", () => {
		const longHook =
			"5 LESSONS FROM BUILDING AN AI CONTENT PIPELINE THAT CUT MANUAL WORK 80% ACROSS THE STUDIO.";
		const h = coverHeadline({ hook: longHook, slides: [], cta: "GO." });
		expect(h?.kind).toBe("text");
		if (h?.kind === "text") {
			expect(h.fontSize).toBeLessThan(baseCoverSize);
			// estimated wrapped height fits within the headline box (h.h) with headroom
			const charsPerLine = Math.max(h.w / (h.fontSize * 0.6), 1);
			const lines = Math.ceil(longHook.trim().length / charsPerLine);
			expect(lines * h.fontSize * h.lineHeight).toBeLessThanOrEqual(h.h);
			// still bold — never collapses below the floor
			expect(h.fontSize).toBeGreaterThanOrEqual(Math.round(baseCoverSize * 0.42));
		}
	});

	test("a long CTA is also fit (no overflow on the closing slide)", () => {
		const longCta = "READY TO STOP SHIPPING ONE-OFF PROMPTS AND START BUILDING REAL SYSTEMS TODAY?";
		const cta = copyDocToSlides({ hook: "H", slides: [], cta: longCta }, bundle, format)
			.find((s) => s.role === "cta")
			?.layers.find((l) => l.id === "l-cta-headline");
		if (cta?.kind === "text") {
			expect(cta.fontSize).toBeLessThan(Math.round(format.width * 0.09));
		}
	});
});

describe("placeholderCopyDoc", () => {
	test("carousel placeholder is positioning-derived (not lorem) and valid", () => {
		const doc = placeholderCopyDoc(bundle, "carousel");
		expect(safeParseCopyDoc(doc).success).toBe(true);
		expect(doc.hook).toBe(bundle.positioning.headlinePromise ?? doc.hook);
		expect(doc.cta).toBe(bundle.positioning.ctaBanner ?? doc.cta);
		expect(doc.slides.length).toBeGreaterThan(0);
		// renders to a valid project
		const slides = copyDocToSlides(doc, bundle, format);
		expect(() => parseProject(projectFrom(slides))).not.toThrow();
	});

	test("post placeholder has no body slides", () => {
		const doc = placeholderCopyDoc(bundle, "post");
		expect(doc.slides).toHaveLength(0);
		const slides = copyDocToSlides(doc, bundle, format);
		// cover + cta only
		expect(slides.map((s) => s.role)).toEqual(["cover", "cta"]);
	});
});

describe("sample-copydoc.json fixture", () => {
	const raw = readFileSync(
		join(import.meta.dir, "..", "tests", "fixtures", "sample-copydoc.json"),
		"utf8",
	);
	const fixtureDoc = parseCopyDoc(JSON.parse(raw));

	test("matches the CopyDoc contract and renders", () => {
		const slides = copyDocToSlides(fixtureDoc, bundle, format);
		expect(() => parseProject(projectFrom(slides))).not.toThrow();
	});

	test("the sample hook auto-fits within the cover box (no overflow)", () => {
		// Regression for the #10 e2e: this long full-sentence hook overflowed the
		// cover box at the fixed display size and needed a manual fontSize nudge.
		const slides = copyDocToSlides(fixtureDoc, bundle, format);
		const headline = slides[0].layers.find((l) => l.id === "l-cover-headline");
		expect(headline?.kind).toBe("text");
		if (headline?.kind === "text") {
			// fitted below the base display size for this long hook
			expect(headline.fontSize).toBeLessThan(Math.round(format.width * 0.11));
			// estimated wrapped text height fits the headline box per the heuristic
			const charsPerLine = Math.max(headline.w / (headline.fontSize * 0.6), 1);
			const lines = Math.ceil(fixtureDoc.hook.trim().length / charsPerLine);
			expect(lines).toBeLessThanOrEqual(4);
			expect(lines * headline.fontSize * headline.lineHeight).toBeLessThanOrEqual(headline.h);
		}
	});
});
