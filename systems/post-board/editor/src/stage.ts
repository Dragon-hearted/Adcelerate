/**
 * Stage rendering. Builds the fixed-size `.slide-stage` (format pixel canvas)
 * with its background (CSS riso style-mode + textures, or a full-bleed image)
 * and every layer node, then scales the whole stage with a CSS transform to fit
 * its container. Used both for the main editing stage and the live slide
 * thumbnails in the left panel.
 */

import { createLayerNode } from "./layer";
import { modeClass } from "./modes";
import type { BrandResponse, Project, Slide } from "./types";

export interface StageBuild {
	/** The full-pixel `.slide-stage` element. */
	stage: HTMLElement;
}

/** Build the full-pixel `.slide-stage` element for a slide (unscaled). */
export function buildStage(
	brand: BrandResponse,
	project: Project,
	slide: Slide,
	opts: { selection?: string[]; interactive?: boolean } = {},
): HTMLElement {
	const stage = document.createElement("div");
	stage.className = "slide-stage";
	stage.style.width = `${project.format.width}px`;
	stage.style.height = `${project.format.height}px`;

	// Background.
	if (slide.background.type === "css") {
		const mode = modeClass(slide.background.styleMode ?? project.styleMode);
		if (mode) {
			stage.classList.add(mode);
		}
		// Always-on textured field above the base paper grain (mode-tuned).
		const tex = document.createElement("div");
		tex.className = "pb-bg-field tex-halftone";
		tex.style.position = "absolute";
		tex.style.inset = "0";
		tex.style.zIndex = "0";
		tex.style.pointerEvents = "none";
		stage.appendChild(tex);
	} else {
		const img = document.createElement("img");
		img.className = "pb-bg-image";
		img.src = slide.background.src;
		img.alt = "background";
		img.draggable = false;
		img.style.position = "absolute";
		img.style.inset = "0";
		img.style.width = "100%";
		img.style.height = "100%";
		img.style.objectFit = "cover";
		img.style.zIndex = "0";
		img.style.pointerEvents = "none";
		stage.appendChild(img);
	}

	// Layers, painted in ascending z (z-index handles final stacking).
	const layers = [...slide.layers].sort((a, b) => a.z - b.z);
	for (const layer of layers) {
		const node = createLayerNode(brand, layer);
		if (opts.interactive) {
			node.classList.add("pb-interactive");
		}
		if (opts.selection?.includes(layer.id)) {
			node.classList.add("selected");
		}
		stage.appendChild(node);
	}
	return stage;
}

/** Compute the scale that fits `w×h` into the available box (never upscale). */
export function fitScale(w: number, h: number, availW: number, availH: number): number {
	if (availW <= 0 || availH <= 0) {
		return 1;
	}
	return Math.min(availW / w, availH / h, 1);
}

export interface StageMount {
	stage: HTMLElement;
	scaler: HTMLElement;
	scale: number;
}

/**
 * Render the interactive editing stage into `wrap`, scaled to fit. Returns the
 * stage element, its scaler, and the applied scale (for pointer math).
 */
export function mountStage(
	wrap: HTMLElement,
	brand: BrandResponse,
	project: Project,
	slide: Slide,
	selection: string[],
): StageMount {
	wrap.innerHTML = "";
	const { width, height } = project.format;
	const pad = 48;
	const scale = fitScale(width, height, wrap.clientWidth - pad, wrap.clientHeight - pad);

	const scaler = document.createElement("div");
	scaler.className = "pb-stage-scaler";
	scaler.style.width = `${width * scale}px`;
	scaler.style.height = `${height * scale}px`;

	const stage = buildStage(brand, project, slide, { selection, interactive: true });
	stage.style.transform = `scale(${scale})`;
	stage.style.transformOrigin = "top left";
	scaler.appendChild(stage);
	wrap.appendChild(scaler);
	return { stage, scaler, scale };
}

/** Render a small live thumbnail of a slide into a fixed-size box. */
export function renderThumb(
	box: HTMLElement,
	brand: BrandResponse,
	project: Project,
	slide: Slide,
	boxW: number,
): void {
	box.innerHTML = "";
	const { width, height } = project.format;
	const scale = boxW / width;
	box.style.width = `${width * scale}px`;
	box.style.height = `${height * scale}px`;
	const stage = buildStage(brand, project, slide);
	stage.style.transform = `scale(${scale})`;
	stage.style.transformOrigin = "top left";
	stage.style.pointerEvents = "none";
	box.appendChild(stage);
}
