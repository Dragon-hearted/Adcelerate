/**
 * Export pipeline — headless render of each slide to a post-ready PNG, plus an
 * optional combined PDF.
 *
 * Fidelity strategy: rather than re-implement slide rendering server-side (which
 * would drift from the editor), we render each slide through the SAME browser
 * code the editor uses (`editor/src/stage.ts` → `buildStage`). A tiny browser
 * entry (`editor/src/export-view.ts`) builds one unscaled `.slide-stage` at the
 * exact format pixel dimensions; a minimal server route
 * (`GET /export-view/:projectId/:slideId`) serves a chrome-free shell with the
 * brand `@font-face` CSS inlined and the riso SVG filter defs present. Headless
 * Chromium navigates there, waits for fonts + images, and screenshots the stage.
 *
 * Crispness / dimensions: we render at `deviceScaleFactor: 1` and screenshot the
 * `.slide-stage` element directly, so every PNG is EXACTLY the preset's pixel
 * size with no resampling step (and no extra image-resize dependency). At a
 * 1080px-wide native canvas, vector type + SVG-filter riso textures are already
 * crisp — a 2× pass would only force a downscale (to hit exact dims) that buys
 * nothing at native social-feed resolution. A `deviceScaleFactor` option is
 * exposed for callers that explicitly want a hi-DPI buffer (output dims become
 * `dim × deviceScaleFactor`).
 *
 * Self-contained: `exportProject` boots its own ephemeral Hono server (random
 * port, 127.0.0.1) for the render and tears it down after, so it works from the
 * CLI and tests with no separately-running server. `POST /api/export` reuses the
 * exact same function.
 */

import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { PDFDocument } from "pdf-lib";
import { chromium } from "playwright";
import { type Project, type ProjectStoreOptions, loadProject, projectDir } from "./project";

export interface ExportOptions extends ProjectStoreOptions {
	/** Also assemble a combined `carousel.pdf`. */
	pdf?: boolean;
	/**
	 * Headless render device-scale-factor. Default `1` → PNGs are exactly the
	 * preset pixel dimensions. Values > 1 produce a hi-DPI buffer whose pixel
	 * dimensions are `dim × deviceScaleFactor` (caller handles any downscale).
	 */
	deviceScaleFactor?: number;
	/** Per-slide readiness timeout (ms). Default 30000. */
	timeoutMs?: number;
}

export interface ExportResult {
	/** Absolute paths to the per-slide PNGs (`slide-NN.png`). */
	pngs: string[];
	/** Absolute path to the combined PDF, when `pdf` was requested. */
	pdf?: string;
}

/**
 * Retained for back-compat with callers that special-cased the pre-task-#7 stub
 * (e.g. `server.ts` mapping it to HTTP 501). The real pipeline never throws it.
 */
export class ExportNotImplementedError extends Error {
	constructor() {
		super("Export pipeline not implemented yet.");
		this.name = "ExportNotImplementedError";
	}
}

// ─── Export-view HTML shell ───

/** The riso/ink-bleed SVG filter defs referenced by `brand.css` (#ink-bleed …). */
const FILTER_DEFS_SVG = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
	<defs>
		<filter id="ink-bleed" x="-6%" y="-6%" width="112%" height="112%">
			<feTurbulence type="fractalNoise" baseFrequency="0.014 0.019" numOctaves="2" seed="7" result="noise" />
			<feDisplacementMap in="SourceGraphic" in2="noise" scale="2.4" xChannelSelector="R" yChannelSelector="G" />
		</filter>
		<filter id="ink-bleed-heavy" x="-12%" y="-12%" width="124%" height="124%">
			<feTurbulence type="fractalNoise" baseFrequency="0.02 0.028" numOctaves="3" seed="11" result="noise" />
			<feDisplacementMap in="SourceGraphic" in2="noise" scale="5.5" xChannelSelector="R" yChannelSelector="G" />
		</filter>
		<filter id="misregister" x="-10%" y="-10%" width="120%" height="120%">
			<feOffset in="SourceGraphic" dx="-2" dy="-1.4" result="rplate" />
			<feColorMatrix in="rplate" type="matrix" values="0 0 0 0 1   0 0 0 0 0.16   0 0 0 0 0.16   0 0 0 0.5 0" result="red" />
			<feOffset in="SourceGraphic" dx="2" dy="1.4" result="bplate" />
			<feColorMatrix in="bplate" type="matrix" values="0 0 0 0 0.04   0 0 0 0 0.37   0 0 0 0 1   0 0 0 0.5 0" result="blue" />
			<feMerge>
				<feMergeNode in="red" />
				<feMergeNode in="blue" />
				<feMergeNode in="SourceGraphic" />
			</feMerge>
		</filter>
	</defs>
</svg>`;

export interface ExportViewHtmlOptions {
	/** Base64-embedded `@font-face` CSS from the brand loader. */
	fontFaceCss: string;
	projectId: string;
	slideId: string;
}

/**
 * Build the chrome-free export-view shell. The `export-view.js` browser entry
 * (bundled from `editor/src/export-view.ts`) fetches the project + brand, builds
 * one unscaled `.slide-stage`, and flips `data-export-ready` when fonts + images
 * have settled.
 */
export function renderExportViewHtml(opts: ExportViewHtmlOptions): string {
	const cfg = JSON.stringify({ projectId: opts.projectId, slideId: opts.slideId });
	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
<style>${opts.fontFaceCss}</style>
<link rel="stylesheet" href="/editor/styles/brand.css" />
<style>
	html, body { margin: 0; padding: 0; background: #ffffff; }
	#export-root { position: absolute; top: 0; left: 0; }
	#export-root .slide-stage { transform: none !important; }
</style>
</head>
<body>
${FILTER_DEFS_SVG}
<div id="export-root"></div>
<script>window.__PB_EXPORT = ${cfg};</script>
<script type="module" src="/editor/dist/export-view.js"></script>
</body>
</html>`;
}

// ─── Bundle helper ───

const EDITOR_DIR = join(import.meta.dir, "..", "editor");

/** Bundle `editor/src/export-view.ts` → `editor/dist/export-view.js` (browser). */
async function ensureExportBundle(): Promise<void> {
	const result = await Bun.build({
		entrypoints: [join(EDITOR_DIR, "src", "export-view.ts")],
		outdir: join(EDITOR_DIR, "dist"),
		target: "browser",
		minify: true,
		naming: "[dir]/[name].[ext]",
	});
	if (!result.success) {
		const msg = result.logs.map((l) => l.message).join("\n");
		throw new Error(`export-view bundle failed:\n${msg}`);
	}
}

// ─── PNG header reader ───

/**
 * Read a PNG's pixel dimensions from its IHDR chunk (no image dependency).
 * Width is the big-endian uint32 at byte offset 16, height at offset 20.
 * Returns `undefined` if the buffer is not a valid PNG.
 */
export function pngDimensions(buf: Uint8Array): { width: number; height: number } | undefined {
	// PNG signature: 89 50 4E 47 0D 0A 1A 0A
	const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
	if (buf.length < 24) {
		return undefined;
	}
	for (let i = 0; i < sig.length; i++) {
		if (buf[i] !== sig[i]) {
			return undefined;
		}
	}
	const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
	return { width: dv.getUint32(16, false), height: dv.getUint32(20, false) };
}

// ─── PDF assembly ───

/** Assemble per-slide PNGs into a single PDF, one page per slide at slide dims. */
async function assemblePdf(
	pngPaths: string[],
	dir: string,
	width: number,
	height: number,
): Promise<string> {
	const doc = await PDFDocument.create();
	for (const png of pngPaths) {
		const bytes = await Bun.file(png).arrayBuffer();
		const embedded = await doc.embedPng(bytes);
		const page = doc.addPage([width, height]);
		page.drawImage(embedded, { x: 0, y: 0, width, height });
	}
	const pdfBytes = await doc.save();
	const out = join(dir, "carousel.pdf");
	await Bun.write(out, pdfBytes);
	return out;
}

// ─── Main entry ───

/** Zero-pad a slide index to `slide-NN`. */
function slideFileName(index: number): string {
	return `slide-${String(index + 1).padStart(2, "0")}.png`;
}

/**
 * Render a project's slides to PNGs (+ optional combined PDF) in the project's
 * directory under `client/<brand>/post-board/<id>/`.
 */
export async function exportProject(
	projectId: string,
	opts: ExportOptions = {},
): Promise<ExportResult> {
	const storeOpts: ProjectStoreOptions = {
		...(opts.root ? { root: opts.root } : {}),
		...(opts.brandSlug ? { brandSlug: opts.brandSlug } : {}),
	};

	const project: Project = await loadProject(projectId, storeOpts);
	if (project.slides.length === 0) {
		throw new Error(`project "${projectId}" has no slides to export`);
	}
	const { width, height } = project.format;
	const dir = projectDir(projectId, {
		...storeOpts,
		brandSlug: storeOpts.brandSlug ?? project.brand,
	});
	await mkdir(dir, { recursive: true });

	const scale = opts.deviceScaleFactor ?? 1;
	const timeout = opts.timeoutMs ?? 30000;

	// 1. Ensure the browser entry is bundled and reachable via /editor/dist/.
	await ensureExportBundle();

	// 2. Boot an ephemeral render server (dynamic import breaks the import cycle).
	const { createApp } = await import("./server");
	const app = createApp({ store: storeOpts });
	const server = Bun.serve({ port: 0, hostname: "127.0.0.1", fetch: app.fetch });
	const base = `http://127.0.0.1:${server.port}`;

	const pngs: string[] = [];
	const browser = await chromium.launch({ args: ["--force-color-profile=srgb"] });
	try {
		const context = await browser.newContext({
			viewport: { width, height },
			deviceScaleFactor: scale,
		});
		for (let i = 0; i < project.slides.length; i++) {
			const slide = project.slides[i];
			if (!slide) {
				continue;
			}
			const page = await context.newPage();
			try {
				await page.goto(`${base}/export-view/${projectId}/${encodeURIComponent(slide.id)}`, {
					// `load` (not `networkidle`) — readiness is gated on the
					// export-ready flag below, which already awaits fonts + images;
					// this avoids hanging on a slow font CDN connection.
					waitUntil: "load",
					timeout,
				});
				// Wait until the browser entry signals fonts + images have settled.
				await page.waitForFunction(
					() =>
						document.documentElement.dataset.exportReady === "1" ||
						document.documentElement.dataset.exportError === "1",
					undefined,
					{ timeout },
				);
				const err = await page.evaluate(
					() => (window as unknown as { __PB_EXPORT_ERROR?: string }).__PB_EXPORT_ERROR,
				);
				if (err) {
					throw new Error(`slide "${slide.id}" render failed: ${err}`);
				}
				const stage = page.locator(".slide-stage");
				const file = join(dir, slideFileName(i));
				await stage.screenshot({ path: file });
				pngs.push(file);
			} finally {
				await page.close();
			}
		}
	} finally {
		await browser.close();
		server.stop(true);
	}

	if (opts.pdf) {
		const pdf = await assemblePdf(pngs, dir, width, height);
		return { pngs, pdf };
	}
	return { pngs };
}
