/**
 * Export pipeline tests.
 *
 * Two layers:
 *  1. `pngDimensions` — pure IHDR reader (no browser, no deps).
 *  2. A real end-to-end headless export of a seeded, CSS-only fixture project
 *     (no ImageEngine dependency): asserts one PNG per slide at EXACTLY the
 *     preset pixel dimensions, and a PDF whose page count equals the slide count.
 *
 * The render launches Chromium, so the e2e test gets a generous timeout. The
 * fixture uses a small custom format to keep the screenshot fast while still
 * exercising the exact-dimension guarantee.
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PDFDocument } from "pdf-lib";
import { loadBrand } from "./brand-loader";
import { exportProject, pngDimensions } from "./export";
import { type Project, projectDir, saveProject } from "./project";
import { createSeedProject } from "./seed";

// ─── Unit: PNG IHDR reader ───

describe("pngDimensions", () => {
	test("reads width/height from a valid PNG IHDR chunk", () => {
		// Minimal PNG: 8-byte signature + IHDR length/type + 13-byte IHDR data.
		const buf = new Uint8Array(33);
		buf.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0); // signature
		buf.set([0x00, 0x00, 0x00, 0x0d], 8); // IHDR length = 13
		buf.set([0x49, 0x48, 0x44, 0x52], 12); // "IHDR"
		const dv = new DataView(buf.buffer);
		dv.setUint32(16, 1080, false); // width
		dv.setUint32(20, 1350, false); // height
		expect(pngDimensions(buf)).toEqual({ width: 1080, height: 1350 });
	});

	test("returns undefined for non-PNG bytes", () => {
		expect(pngDimensions(new Uint8Array([1, 2, 3, 4]))).toBeUndefined();
		expect(pngDimensions(new Uint8Array(new Array(40).fill(0)))).toBeUndefined();
	});
});

// ─── E2E: headless export of a CSS-only carousel ───

const TMP_ROOT = mkdtempSync(join(tmpdir(), "post-board-export-"));
const BRAND_SLUG = "dragonhearted_labs";
const W = 432;
const H = 540;
let seeded: Project;

beforeAll(async () => {
	const bundle = loadBrand({ silent: true });
	seeded = createSeedProject(bundle, {
		brief: "export pipeline e2e carousel",
		type: "carousel",
		format: { preset: "test-sm", width: W, height: H },
		now: 1_700_000_000_000,
	});
	await saveProject(seeded, { root: TMP_ROOT, brandSlug: BRAND_SLUG });
});

afterAll(() => {
	rmSync(TMP_ROOT, { recursive: true, force: true });
});

describe("exportProject (headless)", () => {
	test("writes one PNG per slide at exact preset dims + a PDF with matching page count", async () => {
		expect(seeded.slides.length).toBeGreaterThan(1);

		const result = await exportProject(seeded.id, {
			root: TMP_ROOT,
			brandSlug: BRAND_SLUG,
			pdf: true,
		});

		// One PNG per slide, named slide-01.png … slide-NN.png.
		expect(result.pngs.length).toBe(seeded.slides.length);
		const dir = projectDir(seeded.id, { root: TMP_ROOT, brandSlug: BRAND_SLUG });
		expect(result.pngs[0]).toBe(join(dir, "slide-01.png"));

		// Every PNG is EXACTLY the preset pixel dimensions.
		for (const png of result.pngs) {
			const dims = pngDimensions(readFileSync(png));
			expect(dims).toEqual({ width: W, height: H });
		}

		// PDF exists with one page per slide, each at slide dimensions.
		expect(result.pdf).toBe(join(dir, "carousel.pdf"));
		const doc = await PDFDocument.load(readFileSync(result.pdf as string));
		expect(doc.getPageCount()).toBe(seeded.slides.length);
		const page0 = doc.getPage(0);
		expect(Math.round(page0.getWidth())).toBe(W);
		expect(Math.round(page0.getHeight())).toBe(H);
	}, 180_000);
});
