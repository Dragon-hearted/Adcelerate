import { describe, expect, test } from "bun:test";
import { loadBrand, loadBrandJson } from "./brand-loader";

describe("brand-loader", () => {
	const brand = loadBrand({ silent: true });

	test("loads the brand name", () => {
		expect(brand.brand).toBe("Dragonhearted Labs");
	});

	test("returns at least 3 fonts", () => {
		expect(brand.fonts.length).toBeGreaterThanOrEqual(3);
		const families = brand.fonts.map((f) => f.family);
		expect(families).toContain("PP Neue Machina");
		expect(families).toContain("IBM Plex Mono");
		expect(families).toContain("Inter");
	});

	test("returns at least 6 palette colors with hex values", () => {
		expect(brand.palette.length).toBeGreaterThanOrEqual(6);
		for (const color of brand.palette) {
			expect(color.hex).toMatch(/^#[0-9A-Fa-f]{6}$/);
			expect(color.token.length).toBeGreaterThan(0);
		}
	});

	test("fontFaceCss embeds real @font-face rules with base64 data URLs", () => {
		expect(brand.fontFaceCss).toContain("@font-face");
		expect(brand.fontFaceCss).toContain("PP Neue Machina");
		expect(brand.fontFaceCss).toContain("IBM Plex Mono");
		expect(brand.fontFaceCss).toContain("base64,");
		// Inter is not bundled — must fall back to a Google Fonts @import.
		expect(brand.fontFaceCss).toContain("fonts.googleapis.com");
	});

	test("font weight + style are derived from filenames", () => {
		// Neue Machina Ultrabold → 800; an italic Plex Mono → font-style: italic.
		expect(brand.fontFaceCss).toContain("font-weight: 800");
		expect(brand.fontFaceCss).toContain("font-style: italic");
	});

	test("normalizes style modes, elements, logo, background system, voice", () => {
		expect(brand.styleModes.length).toBeGreaterThanOrEqual(6);
		expect(brand.styleModes.some((m) => m.id === "01-chrome-hero")).toBe(true);

		expect(brand.elements.length).toBeGreaterThan(0);
		// Elements with an on-disk sheet expose an absolute path.
		const barcode = brand.elements.find((e) => e.id === "barcode");
		expect(barcode?.assetSheet?.startsWith("/")).toBe(true);

		expect(brand.logo.rules.donts.length).toBeGreaterThan(0);
		expect(brand.backgroundSystem.textures.length).toBeGreaterThan(0);
		expect(brand.voice.traits).toContain("Engineered");
		expect(brand.tagline.text.length).toBeGreaterThan(0);
		expect(brand.positioning.proofStats.length).toBeGreaterThan(0);
		expect(brand.heroMode?.id).toBe("01-chrome-hero");
	});

	test("raw json loader returns the canonical document", () => {
		const raw = loadBrandJson({ silent: true });
		expect(raw.brand).toBe("Dragonhearted Labs");
	});
});
