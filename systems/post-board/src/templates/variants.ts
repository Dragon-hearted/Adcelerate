/**
 * Layout-variant registry — the per-role library of slide layouts.
 *
 * Each variant is a **pure function** that returns a fresh `Layer[]` from
 * canvas-fraction geometry, themed from the resolved {@link Theme}. Variants are
 * **image-forward** (per the @ohneis652 reference patterns): every non-CTA layout
 * reserves a hero zone — when a `hero` image src is supplied it lands as an
 * `image` layer, otherwise the zone is left open for the operator/skill to drop a
 * generated image without breaking the render. Variants may also compose:
 *   - **Neon-Lime accent blocks** — `shape` layers filled with the `accent` token
 *     sitting *behind* type (Graphite text on a lime field; lime is a SURFACE,
 *     never a text colour on the light canvas).
 *   - **brand graphic-element cutouts** — `element` layers pointing at the
 *     task-#2 transparent cutouts (starburst / barcode / halftone / wireframe).
 *   - **structural rules** — thin Electric-Blue `shape` layers.
 *
 * Semantic layer ids follow the `l-{base}-{part}` scheme (`base` = `cover`,
 * `content-1`, `stat-2`, …) so the editor + skill can address every layer for
 * follow-up edits, exactly as before the refactor.
 *
 * IMPORTANT: types-only imports from the server modules — bundles into the
 * browser editor with no Node dependencies.
 */

import type { ElementLayer, Layer, LogoLayer, SlideRole } from "../project";
import { type Theme, fitDisplaySize, makeShapeLayer, makeTextLayer } from "./index";

/** Minimal canvas dimensions a variant needs (FormatPreset / ProjectFormat both fit). */
export interface CanvasDims {
	width: number;
	height: number;
}

// ─── Variant names ───

export const COVER_VARIANTS = [
	"hero-editorial",
	"split-accent",
	"stacked-index",
	"chrome-hero",
] as const;
export const CONTENT_VARIANTS = [
	"hero-annotated",
	"prompt-proof",
	"grid-showcase",
	"big-number",
	"left-rule",
] as const;
export const STAT_VARIANTS = ["stat-block", "stat-hero"] as const;
export const QUOTE_VARIANTS = ["quote-bleed", "quote-raster"] as const;
export const CTA_VARIANTS = ["cta-save", "cta-hero"] as const;

export type CoverVariant = (typeof COVER_VARIANTS)[number];
export type ContentVariant = (typeof CONTENT_VARIANTS)[number];
export type StatVariant = (typeof STAT_VARIANTS)[number];
export type QuoteVariant = (typeof QUOTE_VARIANTS)[number];
export type CtaVariant = (typeof CTA_VARIANTS)[number];
export type VariantName = CoverVariant | ContentVariant | StatVariant | QuoteVariant | CtaVariant;

/** Every variant name, grouped by the role it belongs to. */
export const VARIANTS_BY_ROLE: Record<SlideRole, readonly VariantName[]> = {
	cover: COVER_VARIANTS,
	content: CONTENT_VARIANTS,
	stat: STAT_VARIANTS,
	quote: QUOTE_VARIANTS,
	cta: CTA_VARIANTS,
};

// ─── Brand graphic-element cutouts (task #2) ───

/** Cutout families, keyed by the brand `element_ref`. */
export type CutoutKind = "starburst" | "barcode" | "wireframe-globe" | "halftone";

interface CutoutSpec {
	dir: string;
	count: number;
	elementId: string;
}

const CUTOUTS: Record<CutoutKind, CutoutSpec> = {
	starburst: { dir: "starbursts-chrome", count: 6, elementId: "starburst" },
	barcode: { dir: "barcode-marks", count: 6, elementId: "barcode" },
	"wireframe-globe": { dir: "wireframe-globes", count: 4, elementId: "wireframe-globe" },
	halftone: { dir: "texture-fields", count: 4, elementId: "halftone" },
};

/** Served route for a cutout PNG (`n` is 1-based, wrapped to the family count). */
export function cutoutSrc(kind: CutoutKind, n: number): string {
	const spec = CUTOUTS[kind];
	const idx = ((Math.max(1, n) - 1) % spec.count) + 1;
	return `/brand-assets/cutouts/elements/${spec.dir}/${idx}.png`;
}

// ─── Decoration plan (decided by the arc picker, consumed by the variants) ───

/** What graphic elements a slide carries (budgeted across the deck by the picker). */
export interface Decor {
	/** Drop the single barcode authenticity stamp in a corner. */
	barcode?: boolean;
	/** A graphic-element cutout (starburst punctuation / halftone field). */
	element?: { kind: CutoutKind; n: number };
}

/** A slide's resolved variant + decoration, produced by the arc picker. */
export interface SlidePlan {
	role: SlideRole;
	variant: VariantName;
	decor: Decor;
}

// ─── Per-role resolved content ───

export interface CoverData {
	role: "cover";
	headline: string;
	sub: string;
	/** Optional hero image route (full-bleed cover usually uses a bg image instead). */
	hero?: string;
}
export interface ContentData {
	role: "content";
	headline: string;
	body: string;
	/** Step index for `big-number` (`01`, `02`, …). */
	step: string;
	hero?: string;
}
export interface StatData {
	role: "stat";
	value: string;
	label: string;
	hero?: string;
}
export interface QuoteData {
	role: "quote";
	quote: string;
	attribution: string;
	hero?: string;
}
export interface CtaData {
	role: "cta";
	cta: string;
	handle: string;
	hero?: string;
}
export type SlideData = CoverData | ContentData | StatData | QuoteData | CtaData;

// ─── Build context shared by every variant ───

interface Ctx {
	format: CanvasDims;
	theme: Theme;
	base: string;
	slideNo: number;
	total: number;
	decor: Decor;
}

const px = (frac: number, dim: number): number => Math.round(frac * dim);
const pad2 = (n: number): string => String(n).padStart(2, "0");

/** `l-{base}-{part}` — the semantic id for a slide part. */
function id(ctx: Ctx, part: string): string {
	return `l-${ctx.base}-${part}`;
}

// ─── Shared sub-layers ───

/** The IBM Plex Mono system-tag metadata rail (`[DRGN.LAB//01·07]`). Secondary. */
function kicker(ctx: Ctx): Layer {
	const { format: f, theme: t } = ctx;
	return makeTextLayer({
		id: id(ctx, "kicker"),
		content: `[DRGN.LAB//${pad2(ctx.slideNo)}·${pad2(ctx.total)}]`,
		family: t.mono,
		weight: 500,
		size: px(0.024, f.width),
		color: t.ink,
		treatment: "clean",
		x: t.margin,
		y: t.margin,
		w: t.contentW,
		h: px(0.05, f.height),
		z: 5,
		letterSpacing: 1,
	});
}

/** A right-edge "SWIPE ›" affordance for the cover (open-loop cue). */
function swipeCue(ctx: Ctx): Layer {
	const { format: f, theme: t } = ctx;
	return makeTextLayer({
		id: id(ctx, "swipe"),
		content: "SWIPE ›",
		family: t.mono,
		weight: 600,
		size: px(0.026, f.width),
		color: t.primary,
		treatment: "clean",
		x: px(0.62, f.width),
		y: px(0.92, f.height),
		w: px(0.31, f.width),
		h: px(0.05, f.height),
		z: 5,
		align: "right",
		letterSpacing: 2,
	});
}

/** The container-free riso logo plate. */
function logo(ctx: Ctx, z = 4): LogoLayer {
	const { format: f, theme: t } = ctx;
	return {
		id: id(ctx, "logo"),
		kind: "logo",
		x: t.margin,
		y: px(0.86, f.height),
		w: px(0.26, f.width),
		h: px(0.07, f.height),
		rotation: 0,
		z,
		variant: "riso_graphite",
	};
}

/** An `element` cutout layer. */
function elementLayer(
	ctx: Ctx,
	part: string,
	kind: CutoutKind,
	n: number,
	geom: { x: number; y: number; w: number; h: number; z: number; rotation?: number },
): ElementLayer {
	return {
		id: id(ctx, part),
		kind: "element",
		x: geom.x,
		y: geom.y,
		w: geom.w,
		h: geom.h,
		rotation: geom.rotation ?? 0,
		z: geom.z,
		elementId: CUTOUTS[kind].elementId,
		src: cutoutSrc(kind, n),
	};
}

/** Opacity of a legibility scrim band (retro-white paper over the hero image). */
const SCRIM_OPACITY = 0.84;

/**
 * A legibility **scrim band** — a semi-opaque retro-white paper panel behind the
 * text so an overlaid headline reads cleanly over a full-bleed hero image (and
 * looks like an on-brand riso panel over the CSS-riso fallback when no hero is
 * generated yet). The hero image keeps the rest of the frame, so it dominates.
 */
function scrim(
	ctx: Ctx,
	part: string,
	geom: { x: number; y: number; w: number; h: number; z: number },
): Layer {
	return makeShapeLayer({
		id: id(ctx, part),
		fill: ctx.theme.canvas,
		opacity: SCRIM_OPACITY,
		x: geom.x,
		y: geom.y,
		w: geom.w,
		h: geom.h,
		z: geom.z,
	});
}

/** The barcode corner stamp (≤1 per deck — the picker enforces the budget). */
function barcodeStamp(ctx: Ctx): ElementLayer {
	const { format: f } = ctx;
	return elementLayer(ctx, "barcode", "barcode", 1, {
		x: px(0.74, f.width),
		y: px(0.05, f.height),
		w: px(0.19, f.width),
		h: px(0.03, f.height),
		z: 5,
	});
}

/** Append the picker-budgeted decoration (barcode / element) to a layer list. */
function withDecor(
	ctx: Ctx,
	layers: Layer[],
	elementGeom?: { x: number; y: number; w: number; h: number; z: number; rotation?: number },
): Layer[] {
	if (ctx.decor.barcode) {
		layers.push(barcodeStamp(ctx));
	}
	if (ctx.decor.element && elementGeom) {
		layers.push(
			elementLayer(ctx, "element", ctx.decor.element.kind, ctx.decor.element.n, elementGeom),
		);
	}
	return layers;
}

// ─── COVER variants ───
// Image-forward: the generated hero IS the full-bleed slide background; each
// variant overlays a legibility scrim band + the brand-locked type so the image
// dominates and the headline still reads. No grey image-zone placeholders — when
// no hero is generated the CSS-riso background shows through the scrim.

function coverHeroEditorial(ctx: Ctx, c: CoverData): Layer[] {
	const { format: f, theme: t } = ctx;
	const hW = px(0.86, f.width);
	const hH = px(0.2, f.height);
	const layers: Layer[] = [
		// Bottom scrim band — hero image dominates the top ~58%.
		scrim(ctx, "scrim", { x: 0, y: px(0.56, f.height), w: f.width, h: px(0.44, f.height), z: 1 }),
		kicker(ctx),
		makeTextLayer({
			id: id(ctx, "headline"),
			content: c.headline,
			family: t.display,
			weight: 800,
			size: fitDisplaySize(c.headline, hW, hH, px(0.11, f.width)),
			color: t.ink,
			treatment: "ink-bleed",
			x: t.margin,
			y: px(0.6, f.height),
			w: hW,
			h: hH,
			z: 3,
			letterSpacing: -2,
		}),
		makeTextLayer({
			id: id(ctx, "sub"),
			content: c.sub,
			family: t.body,
			weight: 500,
			size: px(0.032, f.width),
			color: t.ink,
			treatment: "clean",
			x: t.margin,
			y: px(0.82, f.height),
			w: px(0.8, f.width),
			h: px(0.08, f.height),
			z: 3,
			lineHeight: 1.3,
		}),
		logo(ctx),
		swipeCue(ctx),
	];
	return withDecor(ctx, layers);
}

function coverSplitAccent(ctx: Ctx, c: CoverData): Layer[] {
	const { format: f, theme: t } = ctx;
	const colW = px(0.46, f.width);
	const layers: Layer[] = [
		// Neon-Lime accent block — the bottom band (a SURFACE behind the type);
		// the hero image dominates the upper ~56%.
		makeShapeLayer({
			id: id(ctx, "accent"),
			fill: t.accent,
			x: 0,
			y: px(0.56, f.height),
			w: f.width,
			h: px(0.44, f.height),
			z: 1,
		}),
		kicker(ctx),
		makeTextLayer({
			id: id(ctx, "headline"),
			content: c.headline,
			family: t.display,
			weight: 800,
			size: fitDisplaySize(c.headline, px(0.86, f.width), px(0.2, f.height), px(0.1, f.width)),
			color: t.ink,
			treatment: "ink-bleed",
			x: t.margin,
			y: px(0.6, f.height),
			w: px(0.86, f.width),
			h: px(0.2, f.height),
			z: 3,
			letterSpacing: -2,
		}),
		makeTextLayer({
			id: id(ctx, "sub"),
			content: c.sub,
			family: t.body,
			weight: 600,
			size: px(0.03, f.width),
			color: t.ink,
			treatment: "clean",
			x: t.margin,
			y: px(0.82, f.height),
			w: colW + px(0.3, f.width),
			h: px(0.08, f.height),
			z: 3,
			lineHeight: 1.3,
		}),
		logo(ctx),
		swipeCue(ctx),
	];
	// A starburst/cutout punctuates the hero (picker may supply one).
	return withDecor(ctx, layers, {
		x: px(0.7, f.width),
		y: px(0.08, f.height),
		w: px(0.22, f.width),
		h: px(0.22, f.width),
		z: 2,
	});
}

function coverStackedIndex(ctx: Ctx, c: CoverData): Layer[] {
	const { format: f, theme: t } = ctx;
	const layers: Layer[] = [
		// Bottom scrim band; hero image dominates the top ~52%.
		scrim(ctx, "scrim", { x: 0, y: px(0.5, f.height), w: f.width, h: px(0.5, f.height), z: 1 }),
		// Oversized ghosted slide-index numeral, top-right over the hero.
		makeTextLayer({
			id: id(ctx, "ghost"),
			content: pad2(ctx.slideNo),
			family: t.display,
			weight: 800,
			size: px(0.34, f.width),
			color: t.metal,
			treatment: "clean",
			x: px(0.55, f.width),
			y: px(0.04, f.height),
			w: px(0.38, f.width),
			h: px(0.26, f.height),
			z: 2,
			align: "right",
		}),
		kicker(ctx),
		makeTextLayer({
			id: id(ctx, "headline"),
			content: c.headline,
			family: t.display,
			weight: 800,
			size: fitDisplaySize(c.headline, px(0.92, f.width), px(0.24, f.height), px(0.1, f.width)),
			color: t.ink,
			treatment: "ink-bleed",
			x: t.margin,
			y: px(0.54, f.height),
			w: px(0.92, f.width),
			h: px(0.24, f.height),
			z: 3,
			letterSpacing: -2,
		}),
		makeTextLayer({
			id: id(ctx, "sub"),
			content: c.sub,
			family: t.body,
			weight: 500,
			size: px(0.03, f.width),
			color: t.ink,
			treatment: "clean",
			x: t.margin,
			y: px(0.82, f.height),
			w: px(0.8, f.width),
			h: px(0.08, f.height),
			z: 3,
			lineHeight: 1.3,
		}),
		logo(ctx),
		swipeCue(ctx),
	];
	return withDecor(ctx, layers);
}

function coverChromeHero(ctx: Ctx, c: CoverData): Layer[] {
	const { format: f, theme: t } = ctx;
	// Flagship: the chrome hero fills the frame; bottom-anchored type on a scrim.
	const layers: Layer[] = [
		scrim(ctx, "scrim", { x: 0, y: px(0.62, f.height), w: f.width, h: px(0.38, f.height), z: 1 }),
		kicker(ctx),
		makeTextLayer({
			id: id(ctx, "headline"),
			content: c.headline,
			family: t.display,
			weight: 800,
			size: fitDisplaySize(c.headline, px(0.92, f.width), px(0.22, f.height), px(0.1, f.width)),
			color: t.ink,
			treatment: "ink-bleed",
			x: t.margin,
			y: px(0.66, f.height),
			w: px(0.92, f.width),
			h: px(0.22, f.height),
			z: 3,
			letterSpacing: -2,
		}),
		makeTextLayer({
			id: id(ctx, "sub"),
			content: c.sub,
			family: t.body,
			weight: 500,
			size: px(0.03, f.width),
			color: t.ink,
			treatment: "clean",
			x: t.margin,
			y: px(0.88, f.height),
			w: px(0.8, f.width),
			h: px(0.06, f.height),
			z: 3,
			lineHeight: 1.3,
		}),
		logo(ctx),
		swipeCue(ctx),
	];
	return withDecor(ctx, layers);
}

// ─── CONTENT variants ───
// The hero image dominates; text rides in a TOP scrim band (matches the prompt's
// reserved band). No grey placeholder panels/cards — the generated image is the
// proof/showcase; the CSS-riso fallback shows through the scrim until then.

/** Shared content headline + body (the part-ids every content variant must emit). */
function contentCore(
	ctx: Ctx,
	c: ContentData,
	geom: {
		hx: number;
		hy: number;
		hw: number;
		hh: number;
		bx: number;
		by: number;
		bw: number;
		bh: number;
	},
): Layer[] {
	const { format: f, theme: t } = ctx;
	return [
		makeTextLayer({
			id: id(ctx, "headline"),
			content: c.headline,
			family: t.display,
			weight: 800,
			size: fitDisplaySize(c.headline, geom.hw, geom.hh, px(0.07, f.width)),
			color: t.ink,
			treatment: "ink-bleed",
			x: geom.hx,
			y: geom.hy,
			w: geom.hw,
			h: geom.hh,
			z: 3,
			letterSpacing: -1,
		}),
		makeTextLayer({
			id: id(ctx, "body"),
			content: c.body,
			family: t.body,
			weight: 400,
			size: px(0.03, f.width),
			color: t.ink,
			treatment: "clean",
			x: geom.bx,
			y: geom.by,
			w: geom.bw,
			h: geom.bh,
			z: 3,
			lineHeight: 1.35,
		}),
	];
}

/** Top text band geometry shared by the hero content variants. */
function topBand(ctx: Ctx, c: ContentData): Layer[] {
	const { format: f, theme: t } = ctx;
	return [
		scrim(ctx, "scrim", { x: 0, y: 0, w: f.width, h: px(0.36, f.height), z: 1 }),
		kicker(ctx),
		...contentCore(ctx, c, {
			hx: t.margin,
			hy: px(0.1, f.height),
			hw: px(0.92, f.width),
			hh: px(0.15, f.height),
			bx: t.margin,
			by: px(0.26, f.height),
			bw: px(0.84, f.width),
			bh: px(0.09, f.height),
		}),
	];
}

function contentHeroAnnotated(ctx: Ctx, c: ContentData): Layer[] {
	const { format: f } = ctx;
	// Marker-annotation: a starburst cut-out pointing into the hero (if budgeted).
	return withDecor(ctx, topBand(ctx, c), {
		x: px(0.64, f.width),
		y: px(0.46, f.height),
		w: px(0.24, f.width),
		h: px(0.24, f.width),
		z: 2,
		rotation: 12,
	});
}

function contentPromptProof(ctx: Ctx, c: ContentData): Layer[] {
	// The "proof" is the generated screenshot/UI hero behind the text band.
	return withDecor(ctx, topBand(ctx, c));
}

function contentGridShowcase(ctx: Ctx, c: ContentData): Layer[] {
	// The "grid/range" is carried by the generated multi-up hero behind the band.
	return withDecor(ctx, topBand(ctx, c));
}

function contentBigNumber(ctx: Ctx, c: ContentData): Layer[] {
	const { format: f, theme: t } = ctx;
	const layers: Layer[] = [
		scrim(ctx, "scrim", { x: 0, y: 0, w: f.width, h: px(0.44, f.height), z: 1 }),
		kicker(ctx),
		// The dominant device: an oversized step numeral, top-left.
		makeTextLayer({
			id: id(ctx, "index"),
			content: c.step,
			family: t.display,
			weight: 800,
			size: px(0.2, f.width),
			color: t.primary,
			treatment: "ink-bleed",
			x: t.margin,
			y: px(0.08, f.height),
			w: px(0.3, f.width),
			h: px(0.2, f.height),
			z: 3,
		}),
		...contentCore(ctx, c, {
			hx: px(0.34, f.width),
			hy: px(0.1, f.height),
			hw: px(0.58, f.width),
			hh: px(0.16, f.height),
			bx: t.margin,
			by: px(0.3, f.height),
			bw: px(0.84, f.width),
			bh: px(0.1, f.height),
		}),
	];
	return withDecor(ctx, layers);
}

function contentLeftRule(ctx: Ctx, c: ContentData): Layer[] {
	const { format: f, theme: t } = ctx;
	const railX = px(0.08, f.width);
	// The quiet teaching slide: a left scrim column keeps the text legible while
	// the hero image peeks on the right.
	const layers: Layer[] = [
		scrim(ctx, "scrim", { x: 0, y: 0, w: px(0.66, f.width), h: f.height, z: 1 }),
		makeShapeLayer({
			id: id(ctx, "rule"),
			fill: t.primary,
			x: railX,
			y: px(0.2, f.height),
			w: Math.max(3, px(0.005, f.width)),
			h: px(0.52, f.height),
			z: 2,
		}),
		kicker(ctx),
		...contentCore(ctx, c, {
			hx: railX + px(0.04, f.width),
			hy: px(0.22, f.height),
			hw: px(0.5, f.width),
			hh: px(0.2, f.height),
			bx: railX + px(0.04, f.width),
			by: px(0.5, f.height),
			bw: px(0.5, f.width),
			bh: px(0.34, f.height),
		}),
	];
	return withDecor(ctx, layers);
}

// ─── STAT variants ───

function statBlock(ctx: Ctx, c: StatData): Layer[] {
	const { format: f, theme: t } = ctx;
	const layers: Layer[] = [
		kicker(ctx),
		// Neon-Lime accent block; the value sits on it as Graphite (ink) text.
		makeShapeLayer({
			id: id(ctx, "accent"),
			fill: t.accent,
			x: t.margin,
			y: px(0.36, f.height),
			w: px(0.86, f.width),
			h: px(0.24, f.height),
			z: 2,
		}),
		makeTextLayer({
			id: id(ctx, "value"),
			content: c.value,
			family: t.display,
			weight: 800,
			size: px(0.2, f.width),
			color: t.ink,
			treatment: "ink-bleed",
			x: t.margin + px(0.02, f.width),
			y: px(0.375, f.height),
			w: px(0.82, f.width),
			h: px(0.22, f.height),
			z: 3,
		}),
		// Label rides its own scrim chip so it reads over the hero.
		scrim(ctx, "scrim", { x: 0, y: px(0.62, f.height), w: f.width, h: px(0.14, f.height), z: 1 }),
		makeTextLayer({
			id: id(ctx, "label"),
			content: c.label,
			family: t.mono,
			weight: 600,
			size: px(0.04, f.width),
			color: t.ink,
			treatment: "clean",
			x: t.margin,
			y: px(0.65, f.height),
			w: t.contentW,
			h: px(0.1, f.height),
			z: 3,
		}),
	];
	return withDecor(ctx, layers, {
		x: px(0.72, f.width),
		y: px(0.12, f.height),
		w: px(0.2, f.width),
		h: px(0.2, f.width),
		z: 3,
		rotation: 8,
	});
}

function statHero(ctx: Ctx, c: StatData): Layer[] {
	const { format: f, theme: t } = ctx;
	const layers: Layer[] = [
		// Centered scrim band so the big number reads over the hero.
		scrim(ctx, "scrim", { x: 0, y: px(0.32, f.height), w: f.width, h: px(0.42, f.height), z: 1 }),
		kicker(ctx),
		makeTextLayer({
			id: id(ctx, "value"),
			content: c.value,
			family: t.display,
			weight: 800,
			size: px(0.22, f.width),
			color: t.primary,
			treatment: "ink-bleed",
			x: t.margin,
			y: px(0.36, f.height),
			w: t.contentW,
			h: px(0.26, f.height),
			z: 3,
		}),
		makeTextLayer({
			id: id(ctx, "label"),
			content: c.label,
			family: t.mono,
			weight: 600,
			size: px(0.04, f.width),
			color: t.ink,
			treatment: "clean",
			x: t.margin,
			y: px(0.63, f.height),
			w: t.contentW,
			h: px(0.1, f.height),
			z: 3,
		}),
	];
	return withDecor(ctx, layers, {
		x: px(0.72, f.width),
		y: px(0.1, f.height),
		w: px(0.2, f.width),
		h: px(0.2, f.width),
		z: 3,
		rotation: 8,
	});
}

// ─── QUOTE variants ───

function quoteBleed(ctx: Ctx, c: QuoteData): Layer[] {
	const { format: f, theme: t } = ctx;
	const layers: Layer[] = [
		// Scrim behind the display quote so it reads over the duotone hero.
		scrim(ctx, "scrim", { x: 0, y: px(0.16, f.height), w: f.width, h: px(0.62, f.height), z: 1 }),
		kicker(ctx),
		makeTextLayer({
			id: id(ctx, "text"),
			content: c.quote,
			family: t.display,
			weight: 800,
			size: fitDisplaySize(c.quote, t.contentW, px(0.4, f.height), px(0.085, f.width), 1.0),
			color: t.ink,
			treatment: "ink-bleed",
			x: t.margin,
			y: px(0.2, f.height),
			w: t.contentW,
			h: px(0.4, f.height),
			z: 3,
			letterSpacing: -1,
			lineHeight: 1.0,
		}),
		makeTextLayer({
			id: id(ctx, "attr"),
			content: c.attribution,
			family: t.mono,
			weight: 500,
			size: px(0.028, f.width),
			color: t.ink,
			treatment: "clean",
			x: t.margin,
			y: px(0.66, f.height),
			w: t.contentW,
			h: px(0.06, f.height),
			z: 3,
		}),
	];
	return withDecor(ctx, layers);
}

function quoteRaster(ctx: Ctx, c: QuoteData): Layer[] {
	const { format: f, theme: t } = ctx;
	// The duotone/halftone hero IS the generated background; a softer scrim keeps
	// the quote legible while letting the raster show through more.
	const layers: Layer[] = [
		makeShapeLayer({
			id: id(ctx, "scrim"),
			fill: t.canvas,
			opacity: 0.72,
			x: 0,
			y: px(0.22, f.height),
			w: f.width,
			h: px(0.52, f.height),
			z: 1,
		}),
		kicker(ctx),
		makeTextLayer({
			id: id(ctx, "text"),
			content: c.quote,
			family: t.display,
			weight: 800,
			size: fitDisplaySize(c.quote, t.contentW, px(0.4, f.height), px(0.085, f.width), 1.0),
			color: t.ink,
			treatment: "ink-bleed",
			x: t.margin,
			y: px(0.26, f.height),
			w: t.contentW,
			h: px(0.4, f.height),
			z: 3,
			letterSpacing: -1,
			lineHeight: 1.0,
		}),
		makeTextLayer({
			id: id(ctx, "attr"),
			content: c.attribution,
			family: t.mono,
			weight: 500,
			size: px(0.028, f.width),
			color: t.ink,
			treatment: "clean",
			x: t.margin,
			y: px(0.7, f.height),
			w: t.contentW,
			h: px(0.06, f.height),
			z: 3,
		}),
	];
	if (ctx.decor.barcode) {
		layers.push(barcodeStamp(ctx));
	}
	return layers;
}

// ─── CTA variants ───

function ctaSave(ctx: Ctx, c: CtaData): Layer[] {
	const { format: f, theme: t } = ctx;
	const hH = px(0.3, f.height);
	return [
		// Footer scrim so the handle + logo read over the hero.
		scrim(ctx, "scrim", { x: 0, y: px(0.68, f.height), w: f.width, h: px(0.32, f.height), z: 1 }),
		kicker(ctx),
		// Neon-Lime action block; the CTA line sits on it as Graphite (ink) text.
		makeShapeLayer({
			id: id(ctx, "accent"),
			fill: t.accent,
			x: t.margin,
			y: px(0.32, f.height),
			w: px(0.86, f.width),
			h: hH,
			z: 2,
		}),
		makeTextLayer({
			id: id(ctx, "headline"),
			content: c.cta,
			family: t.display,
			weight: 800,
			size: fitDisplaySize(c.cta, px(0.82, f.width), hH, px(0.07, f.width)),
			color: t.ink,
			treatment: "ink-bleed",
			x: t.margin + px(0.02, f.width),
			y: px(0.34, f.height),
			w: px(0.82, f.width),
			h: hH,
			z: 3,
			letterSpacing: -1,
		}),
		makeTextLayer({
			id: id(ctx, "handle"),
			content: c.handle,
			family: t.mono,
			weight: 500,
			size: px(0.03, f.width),
			color: t.primary,
			treatment: "clean",
			x: t.margin,
			y: px(0.75, f.height),
			w: t.contentW,
			h: px(0.05, f.height),
			z: 3,
		}),
		logo(ctx),
	];
}

function ctaHero(ctx: Ctx, c: CtaData): Layer[] {
	const { format: f, theme: t } = ctx;
	const hH = px(0.34, f.height);
	const layers: Layer[] = [
		scrim(ctx, "scrim", { x: 0, y: px(0.52, f.height), w: f.width, h: px(0.48, f.height), z: 1 }),
		kicker(ctx),
		makeTextLayer({
			id: id(ctx, "headline"),
			content: c.cta,
			family: t.display,
			weight: 800,
			size: fitDisplaySize(c.cta, t.contentW, hH, px(0.085, f.width)),
			color: t.ink,
			treatment: "ink-bleed",
			x: t.margin,
			y: px(0.56, f.height),
			w: t.contentW,
			h: hH,
			z: 3,
			letterSpacing: -1,
		}),
		makeTextLayer({
			id: id(ctx, "handle"),
			content: c.handle,
			family: t.mono,
			weight: 500,
			size: px(0.03, f.width),
			color: t.primary,
			treatment: "clean",
			x: t.margin,
			y: px(0.9, f.height),
			w: t.contentW,
			h: px(0.05, f.height),
			z: 3,
		}),
		logo(ctx),
	];
	return withDecor(ctx, layers);
}

// ─── Dispatch ───

type AnyVariantFn = (ctx: Ctx, data: never) => Layer[];

const REGISTRY: Record<SlideRole, Record<string, AnyVariantFn>> = {
	cover: {
		"hero-editorial": coverHeroEditorial as AnyVariantFn,
		"split-accent": coverSplitAccent as AnyVariantFn,
		"stacked-index": coverStackedIndex as AnyVariantFn,
		"chrome-hero": coverChromeHero as AnyVariantFn,
	},
	content: {
		"hero-annotated": contentHeroAnnotated as AnyVariantFn,
		"prompt-proof": contentPromptProof as AnyVariantFn,
		"grid-showcase": contentGridShowcase as AnyVariantFn,
		"big-number": contentBigNumber as AnyVariantFn,
		"left-rule": contentLeftRule as AnyVariantFn,
	},
	stat: {
		"stat-block": statBlock as AnyVariantFn,
		"stat-hero": statHero as AnyVariantFn,
	},
	quote: {
		"quote-bleed": quoteBleed as AnyVariantFn,
		"quote-raster": quoteRaster as AnyVariantFn,
	},
	cta: {
		"cta-save": ctaSave as AnyVariantFn,
		"cta-hero": ctaHero as AnyVariantFn,
	},
};

/** The first (default/flagship) variant name for a role. */
export function defaultVariant(role: SlideRole): VariantName {
	return VARIANTS_BY_ROLE[role][0];
}

export interface RenderArgs {
	data: SlideData;
	variant: string;
	decor: Decor;
	base: string;
	slideNo: number;
	total: number;
	format: CanvasDims;
	theme: Theme;
}

/**
 * Render one slide's `Layer[]` by dispatching `data.role` + `variant` through the
 * registry. Falls back to the role's default variant if `variant` is unknown.
 */
export function renderSlideLayers(args: RenderArgs): Layer[] {
	const ctx: Ctx = {
		format: args.format,
		theme: args.theme,
		base: args.base,
		slideNo: args.slideNo,
		total: args.total,
		decor: args.decor,
	};
	const byRole = REGISTRY[args.data.role];
	const fn = byRole[args.variant] ?? byRole[defaultVariant(args.data.role)];
	return fn(ctx, args.data as never);
}
