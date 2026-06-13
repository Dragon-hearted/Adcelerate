/**
 * Right-hand inspector panel, bound to the current selection. Enforces the brand
 * guardrails: only brand fonts + their weights, only the 6 palette colours,
 * Neon-Lime never as text (offered as an `.accent-marker` block), body-role text
 * locked to the clean treatment, and a warning when a slide has >1 glitch.
 */

import { isLime } from "./layer";
import type { LayerPatch, Store } from "./store";
import type { Layer, TextLayer, Treatment } from "./types";

const ALIGNS: TextLayer["align"][] = ["left", "center", "right", "justify"];
const TREATMENTS: Treatment[] = ["clean", "ink-bleed", "glitch"];

function h<K extends keyof HTMLElementTagNameMap>(
	tag: K,
	attrs: Partial<Record<string, string>> = {},
	children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
	const el = document.createElement(tag);
	for (const [k, v] of Object.entries(attrs)) {
		if (v !== undefined) {
			el.setAttribute(k, v);
		}
	}
	for (const c of children) {
		el.append(typeof c === "string" ? document.createTextNode(c) : c);
	}
	return el;
}

function section(title: string, ...rows: Node[]): HTMLElement {
	return h("div", { class: "insp-section" }, [h("h3", { class: "insp-title" }, [title]), ...rows]);
}

function row(label: string, control: Node): HTMLElement {
	return h("label", { class: "insp-row" }, [h("span", { class: "insp-label" }, [label]), control]);
}

/** Role of a text layer's font family ("display" | "body" | "mono" | ""). */
function fontRole(store: Store, family: string): string {
	const role = store.brand.fonts.find((f) => f.family === family)?.role ?? "";
	if (role.includes("display")) return "display";
	if (role.includes("body")) return "body";
	if (role.includes("tech") || role.includes("mono") || role.includes("label")) return "mono";
	return "";
}

function buildTextControls(store: Store, layer: TextLayer): HTMLElement {
	const wrap = h("div");

	// ── Font family (grouped by role) ──
	const fontSel = h("select", { class: "insp-input" }) as HTMLSelectElement;
	const groups: Record<string, string> = {
		display: "Display",
		body: "Body",
		mono: "Mono / Labels",
	};
	for (const [roleKey, gLabel] of Object.entries(groups)) {
		const fonts = store.brand.fonts.filter((f) => fontRole(store, f.family) === roleKey);
		if (fonts.length === 0) continue;
		const og = h("optgroup", { label: gLabel }) as HTMLOptGroupElement;
		for (const f of fonts) {
			const opt = h("option", { value: f.family }, [f.family]) as HTMLOptionElement;
			if (f.family === layer.fontFamily) opt.selected = true;
			og.append(opt);
		}
		fontSel.append(og);
	}
	fontSel.onchange = () => {
		const family = fontSel.value;
		const patch: LayerPatch = { fontFamily: family };
		// Body-role text must stay clean per brand rules.
		if (fontRole(store, family) === "body") {
			patch.treatment = "clean";
		}
		const weights = store.brand.fonts.find((f) => f.family === family)?.weights ?? [];
		if (weights.length && !weights.includes(String(layer.fontWeight))) {
			patch.fontWeight = weights[weights.length - 1];
		}
		store.updateLayer(layer.id, patch);
	};

	// ── Weight (brand weights for the chosen family) ──
	const weightSel = h("select", { class: "insp-input" }) as HTMLSelectElement;
	const weights = store.brand.fonts.find((f) => f.family === layer.fontFamily)?.weights ?? [
		String(layer.fontWeight),
	];
	for (const w of weights) {
		const opt = h("option", { value: w }, [w]) as HTMLOptionElement;
		if (String(layer.fontWeight) === w) opt.selected = true;
		weightSel.append(opt);
	}
	weightSel.onchange = () => store.updateLayer(layer.id, { fontWeight: weightSel.value });

	// ── Size / line-height / letter-spacing ──
	const sizeIn = h("input", {
		class: "insp-input",
		type: "number",
		min: "8",
		max: "600",
		value: String(layer.fontSize),
	}) as HTMLInputElement;
	sizeIn.onchange = () =>
		store.updateLayer(layer.id, { fontSize: Math.max(8, Number(sizeIn.value) || layer.fontSize) });

	const lhIn = h("input", {
		class: "insp-input",
		type: "number",
		min: "0.7",
		max: "3",
		step: "0.05",
		value: String(layer.lineHeight),
	}) as HTMLInputElement;
	lhIn.onchange = () =>
		store.updateLayer(layer.id, { lineHeight: Number(lhIn.value) || layer.lineHeight });

	const lsIn = h("input", {
		class: "insp-input",
		type: "number",
		min: "-10",
		max: "40",
		step: "0.5",
		value: String(layer.letterSpacing ?? 0),
	}) as HTMLInputElement;
	lsIn.onchange = () => store.updateLayer(layer.id, { letterSpacing: Number(lsIn.value) || 0 });

	// ── Align ──
	const alignRow = h("div", { class: "insp-btns" });
	for (const a of ALIGNS) {
		const b = h("button", { class: "insp-btn", type: "button" }, [
			a[0].toUpperCase(),
		]) as HTMLButtonElement;
		b.title = a;
		if (layer.align === a) b.classList.add("active");
		b.onclick = () => store.updateLayer(layer.id, { align: a });
		alignRow.append(b);
	}

	// ── Colour swatches (palette only; lime = marker surface) ──
	const swatchRow = h("div", { class: "insp-swatches" });
	for (const c of store.brand.palette) {
		const sw = h("button", { class: "insp-swatch", type: "button" }) as HTMLButtonElement;
		sw.style.background = c.hex;
		sw.title = isLime(c.hex) ? `${c.name} — marker surface only (never text colour)` : c.name;
		if (isLime(c.hex)) sw.classList.add("is-marker");
		if (layer.color.toLowerCase() === c.hex.toLowerCase()) sw.classList.add("active");
		sw.onclick = () => store.updateLayer(layer.id, { color: c.hex });
		swatchRow.append(sw);
	}

	// ── Treatment (body locked to clean; warn on >1 glitch) ──
	const isBody = fontRole(store, layer.fontFamily) === "body";
	const treatRow = h("div", { class: "insp-btns" });
	for (const t of TREATMENTS) {
		const b = h("button", { class: "insp-btn", type: "button" }, [t]) as HTMLButtonElement;
		if (layer.treatment === t) b.classList.add("active");
		if (isBody && t !== "clean") {
			b.disabled = true;
			b.title = "Body text stays clean (brand rule)";
		}
		b.onclick = () => store.updateLayer(layer.id, { treatment: t });
		treatRow.append(b);
	}
	const glitchCount = store
		.activeSlide()
		.layers.filter((l) => l.kind === "text" && l.treatment === "glitch").length;
	const warn =
		glitchCount > 1
			? h("p", { class: "insp-warn" }, [
					`⚠ ${glitchCount} glitch layers on this slide — keep it to 1.`,
				])
			: h("span");

	wrap.append(
		section("Type", row("Font", fontSel), row("Weight", weightSel), row("Size", sizeIn)),
		section(
			"Spacing",
			row("Line height", lhIn),
			row("Letter spacing", lsIn),
			row("Align", alignRow),
		),
		section("Colour", swatchRow),
		section("Treatment", treatRow, warn),
	);
	return wrap;
}

function buildImageControls(store: Store, layer: Extract<Layer, { kind: "image" }>): HTMLElement {
	const fitSel = h("select", { class: "insp-input" }) as HTMLSelectElement;
	for (const fit of ["cover", "contain", "fill", "none", "scale-down"]) {
		const opt = h("option", { value: fit }, [fit]) as HTMLOptionElement;
		if (layer.objectFit === fit) opt.selected = true;
		fitSel.append(opt);
	}
	fitSel.onchange = () =>
		store.updateLayer(layer.id, { objectFit: fitSel.value as typeof layer.objectFit });
	return section("Image", row("Fit", fitSel));
}

function buildLogoControls(store: Store, layer: Extract<Layer, { kind: "logo" }>): HTMLElement {
	const sel = h("select", { class: "insp-input" }) as HTMLSelectElement;
	const variants: [string, string][] = [
		["riso_graphite", "Riso — Graphite"],
		["riso_electric_blue", "Riso — Electric Blue"],
		["primary", "Chrome (boxed)"],
	];
	for (const [v, label] of variants) {
		const opt = h("option", { value: v }, [label]) as HTMLOptionElement;
		if (layer.variant === v) opt.selected = true;
		sel.append(opt);
	}
	sel.onchange = () => store.updateLayer(layer.id, { variant: sel.value as typeof layer.variant });
	return section("Logo", row("Variant", sel));
}

function buildShapeControls(store: Store, layer: Extract<Layer, { kind: "shape" }>): HTMLElement {
	// Fill is a brand SURFACE — palette-only. Unlike text, lime IS allowed here
	// (the marker-block fill behind type); it's never a glyph colour.
	const swatchRow = h("div", { class: "insp-swatches" });
	for (const c of store.brand.palette) {
		const sw = h("button", { class: "insp-swatch", type: "button" }) as HTMLButtonElement;
		sw.style.background = c.hex;
		sw.title = isLime(c.hex) ? `${c.name} — accent-block fill (Graphite type on top)` : c.name;
		if (layer.fill.toLowerCase() === c.hex.toLowerCase()) sw.classList.add("active");
		sw.onclick = () => store.updateLayer(layer.id, { fill: c.hex });
		swatchRow.append(sw);
	}
	return section("Shape", row("Kind", h("span", { class: "insp-note" }, [layer.shape])), swatchRow);
}

/** Common arrange controls (z-order, lock, duplicate, delete). */
function buildArrange(store: Store, layer: Layer): HTMLElement {
	const mk = (label: string, fn: () => void, cls = "") => {
		const b = h("button", { class: `insp-btn ${cls}`, type: "button" }, [
			label,
		]) as HTMLButtonElement;
		b.onclick = fn;
		return b;
	};
	const zRow = h("div", { class: "insp-btns" }, [
		mk("▲ Forward", () => store.bringForward()),
		mk("▼ Back", () => store.sendBackward()),
	]);
	const lockBtn = mk(layer.locked ? "🔓 Unlock" : "🔒 Lock", () =>
		store.updateLayer(layer.id, { locked: !layer.locked }),
	);
	const actRow = h("div", { class: "insp-btns" }, [
		lockBtn,
		mk("⧉ Duplicate", () => store.duplicateSelected()),
		mk("🗑 Delete", () => store.deleteSelected(), "danger"),
	]);
	return section("Arrange", row("Z-order", zRow), actRow);
}

/** Render the inspector panel from the current selection. */
export function renderInspector(panel: HTMLElement, store: Store): void {
	panel.innerHTML = "";
	const selected = store.selectedLayers();

	if (selected.length === 0) {
		panel.append(
			h("div", { class: "insp-empty" }, ["Select a layer to edit it. Double-click text to type."]),
		);
		return;
	}

	if (selected.length > 1) {
		panel.append(section(`${selected.length} layers selected`), buildArrange(store, selected[0]));
		return;
	}

	const layer = selected[0];
	const head = h("div", { class: "insp-head" }, [`${layer.kind} layer`]);
	panel.append(head);
	if (layer.kind === "text") {
		panel.append(buildTextControls(store, layer));
	} else if (layer.kind === "image") {
		panel.append(buildImageControls(store, layer));
	} else if (layer.kind === "logo") {
		panel.append(buildLogoControls(store, layer));
	} else if (layer.kind === "element") {
		panel.append(section("Element", h("p", { class: "insp-note" }, [layer.elementId])));
	} else {
		panel.append(buildShapeControls(store, layer));
	}
	panel.append(buildArrange(store, layer));
}
