/**
 * Slide layout system — a **layout-variant registry** plus a deterministic
 * carousel-arc picker.
 *
 * Instead of one fixed geometry per role, each slide role exposes several named
 * **variants** (e.g. cover: `hero-editorial`, `split-accent`, `stacked-index`,
 * `chrome-hero`; content: `hero-annotated`, `prompt-proof`, `grid-showcase`,
 * `big-number`, `left-rule`). Every variant is a pure function returning a fresh
 * set of absolutely-positioned
 * {@link Layer}s from canvas-fraction geometry, themed from the brand bundle, and
 * may compose Neon-Lime accent blocks (`shape` layers) + brand graphic-element
 * cutouts (`element` layers) alongside the type.
 *
 * The picker ({@link planCarousel}) assigns a variant + decoration to each slide
 * deterministically (seeded off the project id + slide index — never
 * `Math.random()`) so adjacent slides differ in their dominant device and the
 * deck reads as designed, not templated. Re-seeding a project is stable.
 *
 * `layoutForRole()` (editor "add slide"), `copyDocToSlides()` (skill copy
 * contract) and `seed.ts` (`cli new`) all consume this one registry so geometry
 * lives in exactly one place.
 *
 * IMPORTANT: this module imports ONLY types from the server modules (`import
 * type`), so it carries no Node dependencies and bundles cleanly into the
 * browser editor.
 */

import type { BrandBundle } from "../brand-loader";
import type { FormatPreset } from "../formats";
import type { Layer, LogoLayer, ShapeLayer, SlideRole, TextLayer } from "../project";
import { planSlide } from "./arc";
import { type SlideData, renderSlideLayers } from "./variants";

export {
	type CutoutKind,
	type Decor,
	type SlideData,
	type SlidePlan,
	type VariantName,
	COVER_VARIANTS,
	CONTENT_VARIANTS,
	STAT_VARIANTS,
	QUOTE_VARIANTS,
	CTA_VARIANTS,
	VARIANTS_BY_ROLE,
	renderSlideLayers,
} from "./variants";
export { planCarousel, planSlide, dominantDevice } from "./arc";

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

/**
 * Resolved brand theme tokens for the current format. Shared by the registry,
 * the copy contract and the seed path so colours / fonts / margins never drift.
 */
export interface Theme {
	ink: string;
	primary: string;
	/** Neon-Lime — a marker SURFACE only, never a text colour on the light canvas. */
	accent: string;
	/** Low-contrast Silver — ghost numerals, rules, faint pattern fields. */
	metal: string;
	display: string;
	mono: string;
	body: string;
	margin: number;
	contentW: number;
}

/** Build the {@link Theme} for a format from a brand bundle. */
export function resolveTheme(bundle: BrandBundle, format: { width: number }): Theme {
	const margin = Math.round(format.width * 0.07);
	return {
		ink: colorOf(bundle, "ink", "#111318"),
		primary: colorOf(bundle, "primary", "#0B5FFF"),
		accent: colorOf(bundle, "accent", "#C6FF00"),
		metal: colorOf(bundle, "metal", "#C7CCD6"),
		display: familyOf(bundle, "display", "PP Neue Machina"),
		mono: familyOf(bundle, "tech", "IBM Plex Mono"),
		body: familyOf(bundle, "body", "Inter"),
		margin,
		contentW: format.width - margin * 2,
	};
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

interface ShapeSpec {
	id?: string;
	fill: string;
	x: number;
	y: number;
	w: number;
	h: number;
	z: number;
	rotation?: number;
}

/** Build a `rect` shape layer (Neon-Lime accent panel or structural rule). */
export function makeShapeLayer(spec: ShapeSpec): ShapeLayer {
	return {
		id: spec.id ?? newLayerId("shape"),
		kind: "shape",
		x: spec.x,
		y: spec.y,
		w: spec.w,
		h: spec.h,
		rotation: spec.rotation ?? 0,
		z: spec.z,
		shape: "rect",
		fill: spec.fill,
	};
}

/** Build the logo layer (riso single-plate variant — container-free). */
export function makeLogoLayer(
	format: { width: number; height: number },
	margin: number,
	z: number,
	id?: string,
): LogoLayer {
	return {
		id: id ?? newLayerId("logo"),
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
 * Length-aware display fontSize so a long headline doesn't overflow its box.
 *
 * Pure heuristic (no glyph metrics): assume an average glyph advance of ~0.6×
 * fontSize for the bold display face, then shrink from `baseSize` (in 2px steps)
 * until the estimated wrapped text height fits within `boxH` (with headroom) AND
 * the line count stays within `maxLines`. Short headlines keep the full
 * `baseSize`; the result never drops below ~0.42×base so headlines stay bold.
 * The box `w`/`h` the caller assigns to the layer should match `boxW`/`boxH`.
 */
export function fitDisplaySize(
	text: string,
	boxW: number,
	boxH: number,
	baseSize: number,
	lineHeight = 1.05,
	maxLines = 4,
): number {
	const len = Math.max(text.trim().length, 1);
	const AVG_ADVANCE = 0.6; // glyph advance as a fraction of fontSize
	const HEADROOM = 0.85; // keep ~15% vertical breathing room inside the box
	const floor = Math.max(Math.round(baseSize * 0.42), 12);
	let fs = baseSize;
	while (fs > floor) {
		const charsPerLine = Math.max(boxW / (fs * AVG_ADVANCE), 1);
		const lines = Math.ceil(len / charsPerLine);
		const textHeight = lines * fs * lineHeight;
		if (lines <= maxLines && textHeight <= boxH * HEADROOM) {
			break;
		}
		fs -= 2;
	}
	return Math.max(fs, floor);
}

/**
 * The slide roles seeded for each project type (mirrors `seed.ts:rolesFor`).
 * Exposed so the editor + skill can offer a consistent add-slide menu.
 */
export const SLIDE_ROLES: readonly SlideRole[] = ["cover", "content", "stat", "quote", "cta"];

// ─── Default placeholder content per role (positioning-derived, never lorem) ───

/** On-brand placeholder copy for a fresh slide of `role`, drawn from the brand. */
function placeholderData(bundle: BrandBundle, role: SlideRole): SlideData {
	const pos = bundle.positioning;
	switch (role) {
		case "cover":
			return {
				role: "cover",
				headline: pos.headlinePromise ?? "BUILDING AI SYSTEMS THAT DRIVE REAL RESULTS.",
				sub: pos.proofBanner ?? "BUILT DIFFERENT. BUILT TO WIN.",
			};
		case "stat": {
			const stat = pos.proofStats[0] ?? { value: "+300%", label: "output" };
			return { role: "stat", value: stat.value, label: stat.label.toUpperCase() };
		}
		case "quote":
			return {
				role: "quote",
				quote: "“WE DON’T DEMO. WE SHIP.”",
				attribution: `— ${(bundle.wordmark ?? bundle.brand ?? "DRAGONHEARTED LABS").toUpperCase()}`,
			};
		case "cta":
			return {
				role: "cta",
				cta: pos.ctaBanner ?? "READY TO BUILD INTELLIGENT SYSTEMS?",
				handle: bundle.wordmark ? `@${bundle.wordmark}` : "@dragonhearted.labs",
			};
		default:
			return {
				role: "content",
				headline: "POINT TITLE GOES HERE.",
				body: "Supporting copy — crisp, concrete, zero corporate filler. Edit this in the editor.",
				step: "01",
			};
	}
}

/**
 * Layout preset for a single slide `role` at a given `format`, themed from
 * `bundle` — the editor "add slide" entry point.
 *
 * Routes the role through the variant registry + the deterministic picker so a
 * freshly-added slide already shows a designed, on-brand layout (not the flat
 * kicker→headline→body stack). Pass `index`/`seed` to make the picked variant
 * reproducible for a given deck position; omit them for an isolated add.
 */
export function layoutForRole(
	role: SlideRole,
	format: FormatPreset,
	bundle: BrandBundle,
	opts: { index?: number; seed?: string; variant?: string } = {},
): Layer[] {
	const theme = resolveTheme(bundle, format);
	const index = opts.index ?? 0;
	const seed = opts.seed ?? "add-slide";
	const plan = planSlide(role, index, seed, { occurrence: index });
	const variant = opts.variant ?? plan.variant;
	// Add-slide layers get process-unique ids (no semantic-id contract needed).
	const base = `${role}-${newLayerId("s")}`;
	return renderSlideLayers({
		data: placeholderData(bundle, role),
		variant,
		decor: plan.decor,
		base,
		slideNo: index + 1,
		total: Math.max(index + 1, 1),
		format,
		theme,
	});
}
