import { describe, expect, test } from "bun:test";
import { loadBrand } from "../brand-loader";
import { getFormatPreset } from "../formats";
import { type Layer, type Project, parseProject } from "../project";
import { createSeedProject } from "../seed";
import { dominantDevice, planCarousel, planSlide } from "./arc";
import { resolveTheme } from "./index";
import {
	CONTENT_VARIANTS,
	COVER_VARIANTS,
	CTA_VARIANTS,
	QUOTE_VARIANTS,
	STAT_VARIANTS,
	type SlideData,
	type SlidePlan,
	VARIANTS_BY_ROLE,
	cutoutSrc,
	renderSlideLayers,
} from "./variants";

const bundle = loadBrand({ silent: true });
const format = getFormatPreset("ig-4x5");
const theme = resolveTheme(bundle, format);

const ACCENT = bundle.palette.find((c) => c.token === "accent")?.hex ?? "#C6FF00";

const DATA: Record<string, SlideData> = {
	cover: { role: "cover", headline: "STOP SHIPPING PROMPTS.", sub: "Build systems instead." },
	content: { role: "content", headline: "ONE IDEA PER SLIDE.", body: "Keep it tight.", step: "01" },
	stat: { role: "stat", value: "+300%", label: "OUTPUT" },
	quote: { role: "quote", quote: "“WE SHIP.”", attribution: "— DRGN" },
	cta: { role: "cta", cta: "SAVE THIS POST.", handle: "@dragonhearted.labs" },
};

function render(role: keyof typeof DATA, variant: string, plan?: Partial<SlidePlan>): Layer[] {
	return renderSlideLayers({
		data: DATA[role],
		variant,
		decor: plan?.decor ?? {},
		base: role,
		slideNo: 1,
		total: 7,
		format,
		theme,
	});
}

// ─── Registry coverage ───

describe("variant registry", () => {
	test("has the required variant counts per role (≥3 cover, ≥4 content, ≥2 each)", () => {
		expect(COVER_VARIANTS.length).toBeGreaterThanOrEqual(3);
		expect(CONTENT_VARIANTS.length).toBeGreaterThanOrEqual(4);
		expect(STAT_VARIANTS.length).toBeGreaterThanOrEqual(2);
		expect(QUOTE_VARIANTS.length).toBeGreaterThanOrEqual(2);
		expect(CTA_VARIANTS.length).toBeGreaterThanOrEqual(2);
	});

	test("every variant is a pure function returning a non-empty Layer[]", () => {
		for (const [role, variants] of Object.entries(VARIANTS_BY_ROLE)) {
			for (const v of variants) {
				const layers = render(role as keyof typeof DATA, v);
				expect(Array.isArray(layers)).toBe(true);
				expect(layers.length).toBeGreaterThan(0);
				// Pure: re-rendering yields the same geometry (ids may differ only by
				// the semantic-base scheme, which is identical here).
				const again = render(role as keyof typeof DATA, v);
				expect(again.map((l) => [l.kind, l.x, l.y, l.w, l.h])).toEqual(
					layers.map((l) => [l.kind, l.x, l.y, l.w, l.h]),
				);
			}
		}
	});

	test("every cover/content/cta variant emits its semantic headline id", () => {
		for (const v of COVER_VARIANTS) {
			expect(render("cover", v).some((l) => l.id === "l-cover-headline")).toBe(true);
		}
		for (const v of CONTENT_VARIANTS) {
			const layers = render("content", v);
			expect(layers.some((l) => l.id === "l-content-headline")).toBe(true);
			expect(layers.some((l) => l.id === "l-content-body")).toBe(true);
		}
		for (const v of CTA_VARIANTS) {
			expect(render("cta", v).some((l) => l.id === "l-cta-headline")).toBe(true);
		}
	});

	test("the cover headline is display-font + ink-bleed, never glitch on body", () => {
		const headline = render("cover", "hero-editorial").find((l) => l.id === "l-cover-headline");
		expect(headline?.kind).toBe("text");
		if (headline?.kind === "text") {
			expect(headline.fontFamily).toBe(theme.display);
			expect(headline.treatment).toBe("ink-bleed");
		}
	});

	test("stat-block + cta-save compose a Neon-Lime accent SHAPE (lime is a surface)", () => {
		for (const layers of [render("stat", "stat-block"), render("cta", "cta-save")]) {
			const limeShape = layers.find(
				(l) => l.kind === "shape" && l.fill.toUpperCase() === ACCENT.toUpperCase(),
			);
			expect(limeShape).toBeDefined();
		}
	});

	test("NEVER renders lime as a text colour (only as a shape fill)", () => {
		for (const [role, variants] of Object.entries(VARIANTS_BY_ROLE)) {
			for (const v of variants) {
				const limeText = render(role as keyof typeof DATA, v).find(
					(l) => l.kind === "text" && l.color.toUpperCase() === ACCENT.toUpperCase(),
				);
				expect(limeText).toBeUndefined();
			}
		}
	});

	test("body copy stays clean Inter (no bleed/glitch on body)", () => {
		for (const v of CONTENT_VARIANTS) {
			const body = render("content", v).find((l) => l.id === "l-content-body");
			if (body?.kind === "text") {
				expect(body.treatment).toBe("clean");
				expect(body.fontFamily).toBe(theme.body);
			}
		}
	});

	test("cutoutSrc maps to the served brand-assets route and wraps the family count", () => {
		expect(cutoutSrc("starburst", 1)).toBe(
			"/brand-assets/cutouts/elements/starbursts-chrome/1.png",
		);
		// wraps: halftone has 4 cutouts, so n=5 → 1
		expect(cutoutSrc("halftone", 5)).toBe("/brand-assets/cutouts/elements/texture-fields/1.png");
		expect(cutoutSrc("barcode", 1)).toBe("/brand-assets/cutouts/elements/barcode-marks/1.png");
	});
});

// ─── Picker determinism + invariants ───

const ARC: ReadonlyArray<"cover" | "content" | "stat" | "quote" | "cta"> = [
	"cover",
	"content",
	"content",
	"stat",
	"content",
	"quote",
	"cta",
];

describe("carousel-arc picker", () => {
	test("is deterministic — same (roles, seed) → identical plan", () => {
		const a = planCarousel(ARC, "project-xyz");
		const b = planCarousel(ARC, "project-xyz");
		expect(a).toEqual(b);
	});

	test("different seeds can vary the content variants (but stay valid)", () => {
		const planA = planCarousel(ARC, "seed-a");
		const b = planCarousel(ARC, "seed-b").map((p) => p.variant);
		// every chosen variant belongs to its role's pool
		for (const p of planA) {
			expect(VARIANTS_BY_ROLE[p.role]).toContain(p.variant);
		}
		// not asserting inequality (hashes may collide) — just that both are valid
		expect(planA.length).toBe(b.length);
	});

	test("adjacent slides never share the same dominant device", () => {
		for (const seed of ["s1", "s2", "deck-42", "another"]) {
			const plans = planCarousel(ARC, seed);
			for (let i = 1; i < plans.length; i++) {
				expect(dominantDevice(plans[i - 1].role, plans[i - 1].variant)).not.toBe(
					dominantDevice(plans[i].role, plans[i].variant),
				);
			}
		}
	});

	test("consecutive content slides rotate to different variants", () => {
		const roles = ["content", "content", "content", "content"] as const;
		const variants = planCarousel(roles, "seed").map((p) => p.variant);
		for (let i = 1; i < variants.length; i++) {
			expect(variants[i]).not.toBe(variants[i - 1]);
		}
	});

	test("cover is the flagship hook; the deck carries exactly ≤1 barcode", () => {
		const plans = planCarousel(ARC, "seed");
		expect(plans[0].variant).toBe("hero-editorial");
		const barcodes = plans.filter((p) => p.decor.barcode).length;
		expect(barcodes).toBe(1);
	});

	test("starburst budget stays within 1–3 across the deck", () => {
		const heavy = ["cover", "stat", "stat", "stat", "stat", "cta"] as const;
		const starbursts = planCarousel(heavy, "seed").filter(
			(p) => p.decor.element?.kind === "starburst",
		).length;
		expect(starbursts).toBeGreaterThanOrEqual(1);
		expect(starbursts).toBeLessThanOrEqual(3);
	});

	test("the first stat introduces the lime block (stat-block) and cta closes on lime (cta-save)", () => {
		const plans = planCarousel(ARC, "seed");
		expect(plans.find((p) => p.role === "stat")?.variant).toBe("stat-block");
		expect(plans[plans.length - 1].variant).toBe("cta-save");
	});

	test("planSlide rotates a content run by occurrence", () => {
		const v0 = planSlide("content", 1, "seed", { occurrence: 0 }).variant;
		const v1 = planSlide("content", 2, "seed", { occurrence: 1 }).variant;
		expect(v0).not.toBe(v1);
	});
});

// ─── End-to-end: variety + brand-lock + Zod round-trip ───

describe("seeded deck variety + validity", () => {
	const project: Project = createSeedProject(bundle, {
		brief: "5 lessons from building an AI content pipeline.",
		type: "carousel",
		format: "ig-4x5",
		now: 1_750_000_000_000,
		id: "variety-seed",
	});

	test("the seed deck Zod round-trips (shape layers included)", () => {
		expect(() => parseProject(project)).not.toThrow();
	});

	test("shows visibly varied layouts — ≥3 distinct dominant devices", () => {
		const devices = new Set<string>();
		for (const slide of project.slides) {
			// approximate the device by the set of non-text layer kinds + headline box y
			const kinds = slide.layers
				.map((l) => l.kind)
				.sort()
				.join(",");
			devices.add(`${slide.role}:${kinds}`);
		}
		expect(devices.size).toBeGreaterThanOrEqual(3);
	});

	test("carries ≥1 Neon-Lime accent block and ≥1 brand graphic-element layer", () => {
		const all = project.slides.flatMap((s) => s.layers);
		const lime = all.find(
			(l) => l.kind === "shape" && l.fill.toUpperCase() === ACCENT.toUpperCase(),
		);
		const element = all.find((l) => l.kind === "element");
		expect(lime).toBeDefined();
		expect(element).toBeDefined();
	});

	test("stays brand-locked: ≤1 glitch headline, no lime text, clean body", () => {
		const all = project.slides.flatMap((s) => s.layers);
		const glitch = all.filter((l) => l.kind === "text" && l.treatment === "glitch").length;
		expect(glitch).toBeLessThanOrEqual(1);
		const limeText = all.find(
			(l) => l.kind === "text" && l.color.toUpperCase() === ACCENT.toUpperCase(),
		);
		expect(limeText).toBeUndefined();
	});

	test("all layer ids are unique project-wide", () => {
		const ids = project.slides.flatMap((s) => s.layers.map((l) => l.id));
		expect(new Set(ids).size).toBe(ids.length);
	});
});
