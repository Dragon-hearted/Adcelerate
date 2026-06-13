/**
 * Layer node factory + style application. Each project layer becomes one
 * absolutely-positioned `.layer` node inside the stage; the type-specific inner
 * content (text / image / element / logo) is built per kind and the brand
 * treatment classes are applied. Geometry (x/y/w/h/rotation/z) is written as
 * inline styles so `offsetLeft/offsetTop/offsetWidth/offsetHeight` always read
 * back exact stage-pixel values regardless of the stage's CSS scale.
 */

import type { BrandResponse, Layer, TextLayer } from "./types";

/** Canonical Neon-Lime hex — never rendered as text colour (marker surface only). */
export const LIME_HEX = "#c6ff00";

/** True when a hex string is the brand's Neon-Lime token. */
export function isLime(hex: string): boolean {
	return hex.trim().toLowerCase() === LIME_HEX;
}

/** Resolve a logo variant to its served image src from the brand palette. */
function logoSrc(brand: BrandResponse, variant: string): string | undefined {
	const id =
		variant === "primary"
			? "logo-primary"
			: variant === "riso_electric_blue"
				? "logo-riso-electric-blue"
				: "logo-riso-graphite";
	return brand.elementAssets.find((a) => a.elementId === id)?.src;
}

/** Apply geometry + z-order to a `.layer` node. */
export function applyGeometry(node: HTMLElement, layer: Layer): void {
	node.style.left = `${layer.x}px`;
	node.style.top = `${layer.y}px`;
	node.style.width = `${layer.w}px`;
	node.style.height = `${layer.h}px`;
	node.style.transform = layer.rotation ? `rotate(${layer.rotation}deg)` : "";
	node.style.zIndex = String(layer.z);
}

/** Map a text layer's role-ish font family to a brand `type-*` class. */
function typeRoleClass(brand: BrandResponse, family: string): string {
	const font = brand.fonts.find((f) => f.family === family);
	const role = font?.role ?? "";
	if (role.includes("display")) {
		return "type-display";
	}
	if (role.includes("tech") || role.includes("mono") || role.includes("label")) {
		return "type-mono";
	}
	return "type-body";
}

/** Build the inner content node for a text layer + apply brand text styling. */
function buildText(brand: BrandResponse, layer: TextLayer): HTMLElement {
	const inner = document.createElement("div");
	inner.className = `pb-text ${typeRoleClass(brand, layer.fontFamily)} treat-${layer.treatment}`;
	inner.dataset.text = layer.content;
	inner.textContent = layer.content;

	inner.style.fontFamily = `"${layer.fontFamily}", sans-serif`;
	inner.style.fontWeight = String(layer.fontWeight);
	inner.style.fontSize = `${layer.fontSize}px`;
	inner.style.lineHeight = String(layer.lineHeight);
	inner.style.textAlign = layer.align;
	inner.style.whiteSpace = "pre-wrap";
	inner.style.width = "100%";
	if (layer.letterSpacing !== undefined) {
		inner.style.letterSpacing = `${layer.letterSpacing}px`;
	}

	// Lime is a marker SURFACE, never text colour: render as an .accent-marker
	// block (ink text on a lime field) instead of lime glyphs on the canvas.
	if (isLime(layer.color)) {
		inner.classList.add("accent-marker");
		inner.style.color = "";
	} else {
		inner.style.color = layer.color;
	}
	return inner;
}

/** Build the inner content for a brand-element layer. */
function buildElement(layer: Extract<Layer, { kind: "element" }>): HTMLElement {
	// Barcode renders as a CSS-native ink-bar strip; other sheets use the image.
	if (/barcode/i.test(layer.elementId)) {
		const bar = document.createElement("div");
		bar.className = "element-barcode treat-ink-bleed";
		bar.style.width = "100%";
		bar.style.height = "100%";
		return bar;
	}
	const img = document.createElement("img");
	img.src = layer.src;
	img.alt = layer.elementId;
	img.draggable = false;
	return img;
}

/**
 * Build the inner content for a shape layer — a flat brand-colour fill (the
 * "color-block" device). Neon-Lime fills are the marker-block SURFACE behind
 * type; other fills are structural rules / panels. Carries the ink-bleed plate
 * misregistration so the block reads as printed, never a flat web rectangle.
 */
function buildShape(layer: Extract<Layer, { kind: "shape" }>): HTMLElement {
	const box = document.createElement("div");
	box.className = `pb-shape shape-${layer.shape}`;
	if (isLime(layer.fill)) {
		box.classList.add("accent-block");
	}
	box.style.width = "100%";
	box.style.height = "100%";
	box.style.background = layer.fill;
	// Sub-1 opacity = a legibility scrim band behind overlaid text; tag it so the
	// riso paper grain reads through and it never looks like a flat web rectangle.
	if (layer.opacity !== undefined && layer.opacity < 1) {
		box.style.opacity = String(layer.opacity);
		box.classList.add("scrim");
	}
	return box;
}

/** Build the inner content for a logo layer (container rule enforced for chrome). */
function buildLogo(brand: BrandResponse, layer: Extract<Layer, { kind: "logo" }>): HTMLElement {
	const src = logoSrc(brand, layer.variant);
	const img = document.createElement("img");
	if (src) {
		img.src = src;
	}
	img.alt = "Dragonhearted Labs";
	img.draggable = false;

	if (layer.variant === "primary") {
		// Chrome master MUST sit inside a Graphite container panel.
		const box = document.createElement("div");
		box.className = "logo-container";
		box.style.width = "100%";
		box.style.height = "100%";
		box.appendChild(img);
		return box;
	}
	const box = document.createElement("div");
	box.className = "logo-riso";
	box.style.width = "100%";
	box.style.height = "100%";
	box.appendChild(img);
	return box;
}

/** Create the `.layer` node for a project layer. */
export function createLayerNode(brand: BrandResponse, layer: Layer): HTMLElement {
	const node = document.createElement("div");
	node.className = `layer layer-${layer.kind}`;
	node.dataset.layerId = layer.id;
	if (layer.locked) {
		node.classList.add("locked");
	}
	applyGeometry(node, layer);

	switch (layer.kind) {
		case "text":
			node.appendChild(buildText(brand, layer));
			break;
		case "image": {
			const img = document.createElement("img");
			img.src = layer.src;
			img.alt = "uploaded";
			img.draggable = false;
			img.style.objectFit = layer.objectFit;
			node.appendChild(img);
			break;
		}
		case "element":
			node.appendChild(buildElement(layer));
			break;
		case "logo":
			node.appendChild(buildLogo(brand, layer));
			break;
		case "shape":
			node.appendChild(buildShape(layer));
			break;
	}
	return node;
}
