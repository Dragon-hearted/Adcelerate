/**
 * Export-view browser entry — renders ONE slide as an unscaled, chrome-free
 * `.slide-stage` at exact format pixel dimensions, for headless PNG export.
 *
 * It reuses the editor's own `buildStage()` so exported slides are pixel-for-
 * pixel identical to what the operator sees in the editor (same layer nodes,
 * same brand treatment classes, same background). When fonts + images have
 * settled it flips `document.documentElement.dataset.exportReady = "1"`, which
 * the Playwright driver (`src/export.ts`) waits on before screenshotting.
 *
 * Config arrives via `window.__PB_EXPORT = { projectId, slideId }`, injected by
 * the `/export-view/:projectId/:slideId` server shell.
 */

import { buildStage } from "./stage";
import type { BrandResponse, Project } from "./types";

interface ExportConfig {
	projectId: string;
	slideId: string;
}

declare global {
	interface Window {
		__PB_EXPORT?: ExportConfig;
		__PB_EXPORT_ERROR?: string;
	}
}

/** Resolve once every image inside `root` has loaded (or errored). */
async function imagesSettled(root: HTMLElement): Promise<void> {
	const imgs = Array.from(root.querySelectorAll("img"));
	await Promise.all(
		imgs.map((img) =>
			img.complete
				? Promise.resolve()
				: new Promise<void>((resolve) => {
						img.addEventListener("load", () => resolve(), { once: true });
						img.addEventListener("error", () => resolve(), { once: true });
					}),
		),
	);
}

/** Wait two animation frames so the final paint (filters/blends) is committed. */
function paintSettled(): Promise<void> {
	return new Promise((resolve) =>
		requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
	);
}

async function main(): Promise<void> {
	const cfg = window.__PB_EXPORT;
	if (!cfg) {
		throw new Error("missing window.__PB_EXPORT config");
	}

	const [brandRes, projectRes] = await Promise.all([
		fetch("/api/brand"),
		fetch(`/api/projects/${encodeURIComponent(cfg.projectId)}`),
	]);
	if (!brandRes.ok) {
		throw new Error(`GET /api/brand → ${brandRes.status}`);
	}
	if (!projectRes.ok) {
		throw new Error(`GET /api/projects/${cfg.projectId} → ${projectRes.status}`);
	}
	const brand = (await brandRes.json()) as BrandResponse;
	const project = (await projectRes.json()) as Project;

	const slide = project.slides.find((s) => s.id === cfg.slideId);
	if (!slide) {
		throw new Error(`slide "${cfg.slideId}" not found in project "${cfg.projectId}"`);
	}

	// Build the unscaled stage at exact format dimensions (no transform/chrome).
	const stage = buildStage(brand, project, slide);
	stage.style.transform = "none";
	stage.style.position = "absolute";
	stage.style.left = "0";
	stage.style.top = "0";

	const root = document.getElementById("export-root");
	if (!root) {
		throw new Error("missing #export-root");
	}
	root.appendChild(stage);

	await document.fonts.ready;
	await imagesSettled(stage);
	await paintSettled();

	document.documentElement.dataset.exportReady = "1";
}

main().catch((err: unknown) => {
	window.__PB_EXPORT_ERROR = err instanceof Error ? err.message : String(err);
	document.documentElement.dataset.exportError = "1";
});
