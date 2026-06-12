/**
 * Copy-generation contract — the typed boundary between the **copy skills**
 * (PostBoard `/post-board` skill, copywriting/ad-creative skills, PromptWriter)
 * that *produce* post text and the PostBoard renderer that *consumes* it.
 *
 * A {@link CopyDoc} is the shape a copy skill emits: a hook (cover), an ordered
 * list of body slides (content / stat / quote), a CTA, and optional caption +
 * hashtags. {@link copyDocToSlides} maps a CopyDoc onto a brand-themed set of
 * {@link Slide}s — the same riso/ink-bleed layouts the seed path and the editor
 * use (via `src/templates`), so generated copy lands in editable layers with
 * stable, semantic ids (`l-cover-headline`, `l-content-1-body`, …).
 *
 * Missing fields fall back to the brand's positioning banners (headline_promise,
 * proof_stats, cta_banner) — never lorem ipsum — so a partially-specified
 * CopyDoc still yields an on-brand, post-ready draft.
 *
 * Flow:
 *   copy skill → CopyDoc (JSON) → copyDocToSlides() → Slide[] → Project
 *               → PUT /api/projects/:id (server) → editor → export
 */

import { z } from "zod";
import type { BrandBundle } from "./brand-loader";
import type { FormatPreset } from "./formats";
import type { Layer, LogoLayer, Slide, TextLayer } from "./project";
import { colorOf, familyOf, makeTextLayer } from "./templates";

// ─── CopyDoc schema ───

/** A single proof statistic (`{ value: "+300%", label: "output" }`). */
export const copyDocStatSchema = z.object({
	value: z.string().min(1),
	label: z.string().min(1),
});

/**
 * The role of a *body* slide. The cover and CTA slides are derived from the
 * top-level `hook`/`cta` fields, so they are not listed here.
 */
export const copyDocSlideRoleSchema = z.enum(["content", "stat", "quote"]);

/**
 * One body slide of a CopyDoc. Fields are role-dependent and all optional —
 * a `content` slide uses `headline`/`body`, a `stat` slide uses `stat`, a
 * `quote` slide uses `quote`. Anything omitted falls back to a brand default.
 */
export const copyDocSlideSchema = z.object({
	role: copyDocSlideRoleSchema,
	headline: z.string().optional(),
	body: z.string().optional(),
	stat: copyDocStatSchema.optional(),
	quote: z.string().optional(),
});

/**
 * The full copy contract a copy skill produces for one post/carousel.
 *
 * - `hook` → the cover headline (display font, ink-bleed).
 * - `slides` → ordered body slides (content / stat / quote).
 * - `cta` → the closing call-to-action slide.
 * - `caption` / `hashtags` → the Instagram/LinkedIn caption block (not rendered
 *   onto slides; carried for the publish step + stored on the project brief).
 */
export const copyDocSchema = z.object({
	hook: z.string(),
	slides: z.array(copyDocSlideSchema),
	cta: z.string(),
	caption: z.string().optional(),
	hashtags: z.array(z.string()).optional(),
});

export type CopyDocStat = z.infer<typeof copyDocStatSchema>;
export type CopyDocSlideRole = z.infer<typeof copyDocSlideRoleSchema>;
export type CopyDocSlide = z.infer<typeof copyDocSlideSchema>;
export type CopyDoc = z.infer<typeof copyDocSchema>;

/** Validate + normalize an unknown value into a {@link CopyDoc} (throws on invalid). */
export function parseCopyDoc(value: unknown): CopyDoc {
	return copyDocSchema.parse(value);
}

/** Non-throwing CopyDoc validation; returns the Zod `SafeParseReturnType`. */
export function safeParseCopyDoc(value: unknown) {
	return copyDocSchema.safeParse(value);
}

// ─── Rendering: CopyDoc → Slide[] ───

/** Default light-first feed style mode (mirrors `seed.ts`). */
const DEFAULT_STYLE_MODE = "08-popart-screenprint";

/** Options for {@link copyDocToSlides}. */
export interface CopyDocToSlidesOptions {
	/** Style mode applied to every slide's CSS background (default popart). */
	styleMode?: string;
}

/** Resolved brand theme tokens for the current format (mirrors `templates.ts`). */
interface Theme {
	ink: string;
	primary: string;
	display: string;
	mono: string;
	body: string;
	margin: number;
	contentW: number;
}

function resolveTheme(bundle: BrandBundle, format: FormatPreset): Theme {
	const margin = Math.round(format.width * 0.07);
	return {
		ink: colorOf(bundle, "ink", "#111318"),
		primary: colorOf(bundle, "primary", "#0B5FFF"),
		display: familyOf(bundle, "display", "PP Neue Machina"),
		mono: familyOf(bundle, "tech", "IBM Plex Mono"),
		body: familyOf(bundle, "body", "Inter"),
		margin,
		contentW: format.width - margin * 2,
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
function fitDisplaySize(
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

/** The `[DRGN.LAB//00N]` mono kicker shared by every slide. */
function kickerLayer(id: string, n: number, theme: Theme, format: FormatPreset): TextLayer {
	return makeTextLayer({
		id,
		content: `[DRGN.LAB//${String(n).padStart(3, "0")}]`,
		family: theme.mono,
		weight: 500,
		size: Math.round(format.width * 0.024),
		color: theme.ink,
		treatment: "clean",
		x: theme.margin,
		y: theme.margin,
		w: theme.contentW,
		h: Math.round(format.height * 0.05),
		z: 2,
		letterSpacing: 1,
	});
}

/** The container-free riso logo plate (cover + cta). */
function logoLayer(id: string, theme: Theme, format: FormatPreset, z: number): LogoLayer {
	return {
		id,
		kind: "logo",
		x: theme.margin,
		y: Math.round(format.height * 0.86),
		w: Math.round(format.width * 0.26),
		h: Math.round(format.height * 0.07),
		rotation: 0,
		z,
		variant: "riso_graphite",
	};
}

/** Cover slide — the hook lands as a display-font, ink-bleed headline layer. */
function coverSlide(
	copyDoc: CopyDoc,
	bundle: BrandBundle,
	format: FormatPreset,
	theme: Theme,
	background: Slide["background"],
	slideNo: number,
): Slide {
	const pos = bundle.positioning;
	const hook =
		copyDoc.hook.trim() || pos.headlinePromise || "BUILDING AI SYSTEMS THAT DRIVE REAL RESULTS.";
	const sub = pos.proofBanner || "BUILT DIFFERENT. BUILT TO WIN.";

	const headlineW = Math.round(theme.contentW * 0.92);
	const headlineH = Math.round(format.height * 0.4);
	const headlineSize = fitDisplaySize(hook, headlineW, headlineH, Math.round(format.width * 0.11));

	const layers: Layer[] = [
		kickerLayer("l-cover-kicker", slideNo, theme, format),
		makeTextLayer({
			id: "l-cover-headline",
			content: hook,
			family: theme.display,
			weight: 800,
			size: headlineSize,
			color: theme.ink,
			treatment: "ink-bleed",
			x: theme.margin,
			y: Math.round(format.height * 0.32),
			w: headlineW,
			h: headlineH,
			z: 3,
			letterSpacing: -2,
		}),
		makeTextLayer({
			id: "l-cover-sub",
			content: sub,
			family: theme.mono,
			weight: 500,
			size: Math.round(format.width * 0.03),
			color: theme.ink,
			treatment: "clean",
			x: theme.margin,
			y: Math.round(format.height * 0.78),
			w: theme.contentW,
			h: Math.round(format.height * 0.06),
			z: 2,
		}),
		logoLayer("l-cover-logo", theme, format, 4),
	];
	return { id: `slide-${slideNo}`, role: "cover", background, layers };
}

/** Content slide — headline + supporting body copy. */
function contentSlide(
	slide: CopyDocSlide,
	format: FormatPreset,
	theme: Theme,
	background: Slide["background"],
	slideNo: number,
	bodyIndex: number,
): Slide {
	const headline = slide.headline?.trim() || "POINT TITLE GOES HERE.";
	const body =
		slide.body?.trim() ||
		"Supporting copy — crisp, concrete, zero corporate filler. Edit this in the editor.";
	const headlineH = Math.round(format.height * 0.3);
	const headlineSize = fitDisplaySize(
		headline,
		theme.contentW,
		headlineH,
		Math.round(format.width * 0.075),
	);
	const layers: Layer[] = [
		kickerLayer(`l-content-${bodyIndex}-kicker`, slideNo, theme, format),
		makeTextLayer({
			id: `l-content-${bodyIndex}-headline`,
			content: headline,
			family: theme.display,
			weight: 800,
			size: headlineSize,
			color: theme.ink,
			treatment: "ink-bleed",
			x: theme.margin,
			y: Math.round(format.height * 0.22),
			w: theme.contentW,
			h: headlineH,
			z: 3,
			letterSpacing: -1,
		}),
		makeTextLayer({
			id: `l-content-${bodyIndex}-body`,
			content: body,
			family: theme.body,
			weight: 400,
			size: Math.round(format.width * 0.034),
			color: theme.ink,
			treatment: "clean",
			x: theme.margin,
			y: Math.round(format.height * 0.56),
			w: theme.contentW,
			h: Math.round(format.height * 0.32),
			z: 2,
			lineHeight: 1.35,
		}),
	];
	return { id: `slide-${slideNo}`, role: "content", background, layers };
}

/** Stat slide — a big riso stat value over a mono label. */
function statSlide(
	slide: CopyDocSlide,
	bundle: BrandBundle,
	format: FormatPreset,
	theme: Theme,
	background: Slide["background"],
	slideNo: number,
	bodyIndex: number,
	statFallbackIndex: number,
): Slide {
	const fallback = bundle.positioning.proofStats[statFallbackIndex] ??
		bundle.positioning.proofStats[0] ?? { value: "+300%", label: "output" };
	const stat = slide.stat ?? fallback;
	const layers: Layer[] = [
		kickerLayer(`l-stat-${bodyIndex}-kicker`, slideNo, theme, format),
		makeTextLayer({
			id: `l-stat-${bodyIndex}-value`,
			content: stat.value,
			family: theme.display,
			weight: 800,
			size: Math.round(format.width * 0.22),
			color: theme.primary,
			treatment: "ink-bleed",
			x: theme.margin,
			y: Math.round(format.height * 0.34),
			w: theme.contentW,
			h: Math.round(format.height * 0.28),
			z: 3,
		}),
		makeTextLayer({
			id: `l-stat-${bodyIndex}-label`,
			content: stat.label.toUpperCase(),
			family: theme.mono,
			weight: 600,
			size: Math.round(format.width * 0.04),
			color: theme.ink,
			treatment: "clean",
			x: theme.margin,
			y: Math.round(format.height * 0.62),
			w: theme.contentW,
			h: Math.round(format.height * 0.1),
			z: 2,
		}),
	];
	return { id: `slide-${slideNo}`, role: "stat", background, layers };
}

/** Quote slide — a display pull-quote over a mono attribution line. */
function quoteSlide(
	slide: CopyDocSlide,
	bundle: BrandBundle,
	format: FormatPreset,
	theme: Theme,
	background: Slide["background"],
	slideNo: number,
	bodyIndex: number,
): Slide {
	const quote = slide.quote?.trim() || slide.headline?.trim() || "“WE DON’T DEMO. WE SHIP.”";
	const attribution =
		slide.body?.trim() ||
		`— ${(bundle.wordmark ?? bundle.brand ?? "DRAGONHEARTED LABS").toUpperCase()}`;
	const quoteH = Math.round(format.height * 0.4);
	const quoteSize = fitDisplaySize(
		quote,
		theme.contentW,
		quoteH,
		Math.round(format.width * 0.085),
		1.0,
	);
	const layers: Layer[] = [
		kickerLayer(`l-quote-${bodyIndex}-kicker`, slideNo, theme, format),
		makeTextLayer({
			id: `l-quote-${bodyIndex}-text`,
			content: quote,
			family: theme.display,
			weight: 800,
			size: quoteSize,
			color: theme.ink,
			treatment: "ink-bleed",
			x: theme.margin,
			y: Math.round(format.height * 0.3),
			w: theme.contentW,
			h: quoteH,
			z: 3,
			letterSpacing: -1,
			lineHeight: 1.0,
		}),
		makeTextLayer({
			id: `l-quote-${bodyIndex}-attr`,
			content: attribution,
			family: theme.mono,
			weight: 500,
			size: Math.round(format.width * 0.028),
			color: theme.ink,
			treatment: "clean",
			x: theme.margin,
			y: Math.round(format.height * 0.78),
			w: theme.contentW,
			h: Math.round(format.height * 0.06),
			z: 2,
		}),
	];
	return { id: `slide-${slideNo}`, role: "quote", background, layers };
}

/** CTA slide — closing call-to-action; falls back to positioning.cta_banner. */
function ctaSlide(
	copyDoc: CopyDoc,
	bundle: BrandBundle,
	format: FormatPreset,
	theme: Theme,
	background: Slide["background"],
	slideNo: number,
): Slide {
	const cta =
		copyDoc.cta.trim() || bundle.positioning.ctaBanner || "READY TO BUILD INTELLIGENT SYSTEMS?";
	const handle = bundle.wordmark ? `@${bundle.wordmark}` : "@dragonhearted.labs";
	const headlineH = Math.round(format.height * 0.36);
	const headlineSize = fitDisplaySize(
		cta,
		theme.contentW,
		headlineH,
		Math.round(format.width * 0.09),
	);
	const layers: Layer[] = [
		kickerLayer("l-cta-kicker", slideNo, theme, format),
		makeTextLayer({
			id: "l-cta-headline",
			content: cta,
			family: theme.display,
			weight: 800,
			size: headlineSize,
			color: theme.ink,
			treatment: "ink-bleed",
			x: theme.margin,
			y: Math.round(format.height * 0.32),
			w: theme.contentW,
			h: headlineH,
			z: 3,
			letterSpacing: -1,
		}),
		makeTextLayer({
			id: "l-cta-handle",
			content: handle,
			family: theme.mono,
			weight: 500,
			size: Math.round(format.width * 0.03),
			color: theme.primary,
			treatment: "clean",
			x: theme.margin,
			y: Math.round(format.height * 0.74),
			w: theme.contentW,
			h: Math.round(format.height * 0.05),
			z: 2,
		}),
		logoLayer("l-cta-logo", theme, format, 4),
	];
	return { id: `slide-${slideNo}`, role: "cta", background, layers };
}

/**
 * Map a {@link CopyDoc} onto a brand-themed array of {@link Slide}s ready to
 * drop into a {@link import("./project").Project} (the result Zod-parses inside
 * a valid project document).
 *
 * Slide order: cover (from `hook`) → each body slide in `copyDoc.slides`
 * (content / stat / quote) → cta (from `cta`). Every text layer carries a
 * stable, semantic id so the editor + skill can address it for follow-up edits.
 *
 * @param copyDoc  The copy contract a copy skill produced.
 * @param bundle   The normalized brand bundle (fonts, palette, positioning).
 * @param format   The target {@link FormatPreset} (use `getFormatPreset(...)`).
 * @param options  Style-mode override for the CSS backgrounds.
 */
export function copyDocToSlides(
	copyDoc: CopyDoc,
	bundle: BrandBundle,
	format: FormatPreset,
	options: CopyDocToSlidesOptions = {},
): Slide[] {
	const theme = resolveTheme(bundle, format);
	const styleMode = options.styleMode ?? DEFAULT_STYLE_MODE;
	const background: Slide["background"] = {
		type: "css",
		styleMode,
		cssClass: `mode-${styleMode}`,
	};

	const slides: Slide[] = [];
	let slideNo = 1;
	slides.push(coverSlide(copyDoc, bundle, format, theme, background, slideNo));

	let statFallbackIndex = 0;
	copyDoc.slides.forEach((slide, bodyIndex) => {
		slideNo += 1;
		const i = bodyIndex + 1;
		switch (slide.role) {
			case "stat":
				slides.push(
					statSlide(slide, bundle, format, theme, background, slideNo, i, statFallbackIndex),
				);
				statFallbackIndex += 1;
				break;
			case "quote":
				slides.push(quoteSlide(slide, bundle, format, theme, background, slideNo, i));
				break;
			default:
				slides.push(contentSlide(slide, format, theme, background, slideNo, i));
				break;
		}
	});

	slideNo += 1;
	slides.push(ctaSlide(copyDoc, bundle, format, theme, background, slideNo));
	return slides;
}

// ─── Placeholder copy (seed parity) ───

/**
 * Build a CopyDoc-shaped *placeholder* derived from the brand's positioning
 * banners — the on-brand, non-lorem starting point a `post-board new` draft
 * uses before the `/post-board` skill replaces it with real generated copy via
 * `PUT /api/projects/:id`.
 *
 * This is the canonical CopyDoc the seed path conceptually produces (the seed
 * draft built by `seed.ts` renders the same positioning-derived placeholder
 * layers); exposing it here lets the skill and tests start from the exact same
 * contract object.
 */
export function placeholderCopyDoc(bundle: BrandBundle, type: "post" | "carousel"): CopyDoc {
	const pos = bundle.positioning;
	const hook = pos.headlinePromise ?? "BUILDING AI SYSTEMS THAT DRIVE REAL RESULTS.";
	const cta = pos.ctaBanner ?? "READY TO BUILD INTELLIGENT SYSTEMS?";

	if (type === "post") {
		return { hook, slides: [], cta };
	}

	const slides: CopyDocSlide[] = [
		{
			role: "content",
			headline: "POINT TITLE GOES HERE.",
			body: "Supporting copy — crisp, concrete, zero corporate filler. Edit this in the editor.",
		},
		{ role: "stat", stat: pos.proofStats[0] ?? { value: "+300%", label: "output" } },
		{
			role: "content",
			headline: "ANOTHER LESSON, SAME ENERGY.",
			body: "Replace with real proof — a number, a before/after, a shipped result.",
		},
	];
	return { hook, slides, cta };
}
