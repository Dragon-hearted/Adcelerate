/**
 * Slide layout presets per role × format.
 *
 * `layoutForRole(role, format, bundle)` returns a fresh set of absolutely-
 * positioned {@link Layer}s for a new slide of the given role, sized to the
 * format preset's pixel canvas and themed from the brand bundle (fonts by role,
 * palette by token, positioning banners). Pure + side-effect-free (apart from a
 * monotonic id counter) so it is safe to import in both the server (POST
 * /api/projects seed, builder-skill copy contract) and the browser editor
 * (slides.ts "add slide").
 *
 * IMPORTANT: this module imports ONLY types from the server modules (`import
 * type`), so it carries no Node dependencies and bundles cleanly into the
 * browser editor.
 */

import type { BrandBundle } from "../brand-loader";
import type { FormatPreset } from "../formats";
import type { Layer, LogoLayer, SlideRole, TextLayer } from "../project";

// ─── Id helpers ───

let _seq = 0;

/** Generate a process-unique layer id (`<prefix>-<base36>`). */
export function newLayerId(prefix = "l"): string {
	_seq += 1;
	const stamp =
		typeof performance !== "undefined" && typeof performance.now === "function"
			? Math.floor(performance.now())
			: _seq;
	return `${prefix}-${stamp.toString(36)}-${_seq.toString(36)}`;
}

// ─── Brand lookups (mirror seed.ts conventions) ───

/** Resolve a palette token's hex with a safe fallback. */
export function colorOf(bundle: BrandBundle, token: string, fallback: string): string {
	return bundle.palette.find((c) => c.token === token)?.hex ?? fallback;
}

/** Resolve a font family by role substring with a safe fallback. */
export function familyOf(bundle: BrandBundle, role: string, fallback: string): string {
	return bundle.fonts.find((f) => f.role.includes(role))?.family ?? fallback;
}

interface TextSpec {
	id?: string;
	content: string;
	family: string;
	weight: string | number;
	size: number;
	color: string;
	treatment: TextLayer["treatment"];
	x: number;
	y: number;
	w: number;
	h: number;
	z: number;
	align?: TextLayer["align"];
	lineHeight?: number;
	letterSpacing?: number;
}

/** Build a text layer from a spec, filling defaults. */
export function makeTextLayer(spec: TextSpec): TextLayer {
	return {
		id: spec.id ?? newLayerId("t"),
		kind: "text",
		x: spec.x,
		y: spec.y,
		w: spec.w,
		h: spec.h,
		rotation: 0,
		z: spec.z,
		content: spec.content,
		fontFamily: spec.family,
		fontWeight: spec.weight,
		fontSize: spec.size,
		color: spec.color,
		treatment: spec.treatment,
		align: spec.align ?? "left",
		lineHeight: spec.lineHeight ?? 1.05,
		...(spec.letterSpacing !== undefined ? { letterSpacing: spec.letterSpacing } : {}),
	};
}

/** Build the logo layer (riso single-plate variant — container-free). */
function makeLogoLayer(
	format: { width: number; height: number },
	margin: number,
	z: number,
): LogoLayer {
	return {
		id: newLayerId("logo"),
		kind: "logo",
		x: margin,
		y: Math.round(format.height * 0.86),
		w: Math.round(format.width * 0.26),
		h: Math.round(format.height * 0.07),
		rotation: 0,
		z,
		variant: "riso_graphite",
	};
}

/**
 * The slide roles seeded for each project type (mirrors `seed.ts:rolesFor`).
 * Exposed so the editor + skill can offer a consistent add-slide menu.
 */
export const SLIDE_ROLES: readonly SlideRole[] = ["cover", "content", "stat", "quote", "cta"];

/**
 * Layout preset for a slide `role` at a given `format`, themed from `bundle`.
 *
 * Geometry is expressed as fractions of the canvas so every format preset
 * (1080×1350, 1080×1080, 1080×1920, …) stays on-grid. Display headlines carry
 * the ink-bleed treatment; body + mono stay clean per the brand rules.
 */
export function layoutForRole(role: SlideRole, format: FormatPreset, bundle: BrandBundle): Layer[] {
	const ink = colorOf(bundle, "ink", "#111318");
	const primary = colorOf(bundle, "primary", "#0B5FFF");
	const display = familyOf(bundle, "display", "PP Neue Machina");
	const mono = familyOf(bundle, "tech", "IBM Plex Mono");
	const body = familyOf(bundle, "body", "Inter");
	const margin = Math.round(format.width * 0.07);
	const contentW = format.width - margin * 2;
	const pos = bundle.positioning;

	const kicker = makeTextLayer({
		id: newLayerId("kicker"),
		content: "[DRGN.LAB//001]",
		family: mono,
		weight: 500,
		size: Math.round(format.width * 0.024),
		color: ink,
		treatment: "clean",
		x: margin,
		y: margin,
		w: contentW,
		h: Math.round(format.height * 0.05),
		z: 2,
		letterSpacing: 1,
	});

	switch (role) {
		case "cover":
			return [
				kicker,
				makeTextLayer({
					content: pos.headlinePromise ?? "BUILDING AI SYSTEMS THAT DRIVE REAL RESULTS.",
					family: display,
					weight: 800,
					size: Math.round(format.width * 0.11),
					color: ink,
					treatment: "ink-bleed",
					x: margin,
					y: Math.round(format.height * 0.32),
					w: Math.round(contentW * 0.92),
					h: Math.round(format.height * 0.4),
					z: 3,
					letterSpacing: -2,
				}),
				makeTextLayer({
					content: pos.proofBanner ?? "BUILT DIFFERENT. BUILT TO WIN.",
					family: mono,
					weight: 500,
					size: Math.round(format.width * 0.03),
					color: ink,
					treatment: "clean",
					x: margin,
					y: Math.round(format.height * 0.78),
					w: contentW,
					h: Math.round(format.height * 0.06),
					z: 2,
				}),
				makeLogoLayer(format, margin, 4),
			];

		case "stat": {
			const stat = pos.proofStats[0];
			return [
				kicker,
				makeTextLayer({
					content: stat?.value ?? "+300%",
					family: display,
					weight: 800,
					size: Math.round(format.width * 0.22),
					color: primary,
					treatment: "ink-bleed",
					x: margin,
					y: Math.round(format.height * 0.34),
					w: contentW,
					h: Math.round(format.height * 0.28),
					z: 3,
				}),
				makeTextLayer({
					content: (stat?.label ?? "OUTPUT").toUpperCase(),
					family: mono,
					weight: 600,
					size: Math.round(format.width * 0.04),
					color: ink,
					treatment: "clean",
					x: margin,
					y: Math.round(format.height * 0.62),
					w: contentW,
					h: Math.round(format.height * 0.1),
					z: 2,
				}),
			];
		}

		case "quote":
			return [
				kicker,
				makeTextLayer({
					content: "“WE DON’T DEMO. WE SHIP.”",
					family: display,
					weight: 800,
					size: Math.round(format.width * 0.085),
					color: ink,
					treatment: "ink-bleed",
					x: margin,
					y: Math.round(format.height * 0.3),
					w: contentW,
					h: Math.round(format.height * 0.4),
					z: 3,
					letterSpacing: -1,
					lineHeight: 1.0,
				}),
				makeTextLayer({
					content: "— DRAGONHEARTED LABS",
					family: mono,
					weight: 500,
					size: Math.round(format.width * 0.028),
					color: ink,
					treatment: "clean",
					x: margin,
					y: Math.round(format.height * 0.78),
					w: contentW,
					h: Math.round(format.height * 0.06),
					z: 2,
				}),
			];

		case "cta":
			return [
				kicker,
				makeTextLayer({
					content: pos.ctaBanner ?? "READY TO BUILD INTELLIGENT SYSTEMS?",
					family: display,
					weight: 800,
					size: Math.round(format.width * 0.09),
					color: ink,
					treatment: "ink-bleed",
					x: margin,
					y: Math.round(format.height * 0.32),
					w: contentW,
					h: Math.round(format.height * 0.36),
					z: 3,
					letterSpacing: -1,
				}),
				makeTextLayer({
					content: "@dragonhearted.labs",
					family: mono,
					weight: 500,
					size: Math.round(format.width * 0.03),
					color: primary,
					treatment: "clean",
					x: margin,
					y: Math.round(format.height * 0.74),
					w: contentW,
					h: Math.round(format.height * 0.05),
					z: 2,
				}),
				makeLogoLayer(format, margin, 4),
			];

		default:
			// content slide
			return [
				kicker,
				makeTextLayer({
					content: "POINT TITLE GOES HERE.",
					family: display,
					weight: 800,
					size: Math.round(format.width * 0.075),
					color: ink,
					treatment: "ink-bleed",
					x: margin,
					y: Math.round(format.height * 0.22),
					w: contentW,
					h: Math.round(format.height * 0.3),
					z: 3,
					letterSpacing: -1,
				}),
				makeTextLayer({
					content:
						"Supporting copy — crisp, concrete, zero corporate filler. Edit this in the editor.",
					family: body,
					weight: 400,
					size: Math.round(format.width * 0.034),
					color: ink,
					treatment: "clean",
					x: margin,
					y: Math.round(format.height * 0.56),
					w: contentW,
					h: Math.round(format.height * 0.32),
					z: 2,
					lineHeight: 1.35,
				}),
			];
	}
}
