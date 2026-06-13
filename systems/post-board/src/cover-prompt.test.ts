import { describe, expect, test } from "bun:test";
import { loadBrand } from "./brand-loader";
import {
	MAX_COVER_PROMPT_CHARS,
	buildCoverPrompt,
	buildSlideHeroPrompt,
	slideSubject,
} from "./cover-prompt";
import { createSeedProject } from "./seed";

const bundle = loadBrand({ silent: true });

function project(styleMode: string) {
	return createSeedProject(bundle, {
		brief: "Launch the build-in-public AI systems carousel for fast-moving founders.",
		type: "carousel",
		format: "ig-4x5",
		styleMode,
		now: 1_750_000_000_000,
	});
}

describe("buildCoverPrompt", () => {
	test("light-first mode uses the retro-white canvas hex + style keywords", () => {
		const p = project("08-popart-screenprint");
		const prompt = buildCoverPrompt(bundle, p);
		expect(prompt).toContain("#F4F6F8");
		expect(prompt.toLowerCase()).toContain("ink-bleed");
		expect(prompt).toContain("Pop-Art Screenprint");
	});

	test("hard rule: forbids text and logo in the image", () => {
		const prompt = buildCoverPrompt(bundle, project("08-popart-screenprint"));
		expect(prompt).toContain("NO TEXT");
		expect(prompt.toUpperCase()).toContain("NO LOGO");
	});

	test("includes palette hexes and the brief subject", () => {
		const prompt = buildCoverPrompt(bundle, project("08-popart-screenprint"));
		expect(prompt).toContain("#0B5FFF");
		expect(prompt).toContain("build-in-public");
	});

	test("hero mode switches to the cosmic-black canvas", () => {
		const prompt = buildCoverPrompt(bundle, project("01-chrome-hero"));
		expect(prompt).toContain("#05070D");
	});

	test("never exceeds the 4000-char ceiling, even with a huge brief", () => {
		const huge = createSeedProject(bundle, {
			brief: "AI systems ".repeat(2000),
			type: "carousel",
			format: "ig-4x5",
			styleMode: "08-popart-screenprint",
			now: 1_750_000_000_000,
		});
		const prompt = buildCoverPrompt(bundle, huge);
		expect(prompt.length).toBeLessThanOrEqual(MAX_COVER_PROMPT_CHARS);
		// The hard constraint clause survives trimming.
		expect(prompt).toContain("NO TEXT");
	});
});

describe("buildSlideHeroPrompt (per-slide hero plates)", () => {
	const p = project("08-popart-screenprint");

	test("slideSubject distills the slide's own copy (not the kicker chrome)", () => {
		const content = p.slides.find((s) => s.role === "content");
		expect(content).toBeDefined();
		if (content) {
			const subject = slideSubject(content, p);
			expect(subject).toContain("POINT TITLE GOES HERE.");
			// never pulls the mono system-tag kicker into the subject
			expect(subject).not.toContain("DRGN.LAB");
		}
	});

	test("each slide gets an on-brand BACKGROUND prompt (no text, no logo, ≤4000)", () => {
		for (const slide of p.slides) {
			const prompt = buildSlideHeroPrompt(bundle, p, slide);
			expect(prompt.length).toBeLessThanOrEqual(MAX_COVER_PROMPT_CHARS);
			expect(prompt).toContain("NO TEXT");
			expect(prompt.toUpperCase()).toContain("NO LOGO");
			// light-first feed canvas for the default style mode
			expect(prompt).toContain("#F4F6F8");
		}
	});

	test("the prompt evokes the slide's idea (its headline copy)", () => {
		const cta = p.slides.find((s) => s.role === "cta");
		if (cta) {
			const prompt = buildSlideHeroPrompt(bundle, p, cta);
			// the CTA banner copy seeds the visual subject
			expect(prompt).toContain(bundle.positioning.ctaBanner ?? "READY");
		}
	});
});
