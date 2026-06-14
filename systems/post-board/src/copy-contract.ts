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
import { buildSlideHeroPrompt } from "./cover-prompt";
import type { FormatPreset } from "./formats";
import type { Slide, SlideRole } from "./project";
import { type SlideData, planCarousel, renderSlideLayers, resolveTheme } from "./templates";

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
	/**
	 * Deterministic seed for the carousel-arc picker — pass the project id so
	 * re-seeding a project yields the same varied layout. Defaults to the hook.
	 */
	seed?: string;
	/**
	 * Project brief — the visual-subject fallback baked into each slide's
	 * `heroPrompt` (image-forward carousels). Defaults to the hook.
	 */
	brief?: string;
}

const pad2 = (n: number): string => String(n).padStart(2, "0");

/** Resolve one body slide's normalized {@link SlideData} + its semantic id base. */
function bodyData(
	slide: CopyDocSlide,
	bundle: BrandBundle,
	bodyIndex: number,
	contentStep: number,
	statFallbackIndex: number,
): { data: SlideData; base: string } {
	const i = bodyIndex + 1;
	const pos = bundle.positioning;
	switch (slide.role) {
		case "stat": {
			const fallback = pos.proofStats[statFallbackIndex] ??
				pos.proofStats[0] ?? { value: "+300%", label: "output" };
			const stat = slide.stat ?? fallback;
			return {
				base: `stat-${i}`,
				data: { role: "stat", value: stat.value, label: stat.label.toUpperCase() },
			};
		}
		case "quote": {
			const quote = slide.quote?.trim() || slide.headline?.trim() || "“WE DON’T DEMO. WE SHIP.”";
			const attribution =
				slide.body?.trim() ||
				`— ${(bundle.wordmark ?? bundle.brand ?? "DRAGONHEARTED LABS").toUpperCase()}`;
			return { base: `quote-${i}`, data: { role: "quote", quote, attribution } };
		}
		default: {
			const headline = slide.headline?.trim() || "POINT TITLE GOES HERE.";
			const body =
				slide.body?.trim() ||
				"Supporting copy — crisp, concrete, zero corporate filler. Edit this in the editor.";
			return {
				base: `content-${i}`,
				data: { role: "content", headline, body, step: pad2(contentStep) },
			};
		}
	}
}

/**
 * Map a {@link CopyDoc} onto a brand-themed array of {@link Slide}s ready to
 * drop into a {@link import("./project").Project} (the result Zod-parses inside
 * a valid project document).
 *
 * Slide order: cover (from `hook`) → each body slide in `copyDoc.slides`
 * (content / stat / quote) → cta (from `cta`). Each role is routed through the
 * **layout-variant registry** + the **deterministic carousel-arc picker** (see
 * `src/templates`) so adjacent slides differ in their dominant device and the
 * deck reads as designed. Every layer keeps a stable, semantic id
 * (`l-cover-headline`, `l-content-1-body`, …) so the editor + skill can address
 * it for follow-up edits.
 *
 * @param copyDoc  The copy contract a copy skill produced.
 * @param bundle   The normalized brand bundle (fonts, palette, positioning).
 * @param format   The target {@link FormatPreset} (use `getFormatPreset(...)`).
 * @param options  Style-mode + picker-seed overrides.
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
	const pos = bundle.positioning;
	const seed = options.seed ?? (copyDoc.hook || "post-board");

	// 1. Resolve normalized content + semantic id bases, aligned to slide order.
	const items: { role: SlideRole; data: SlideData; base: string }[] = [];
	items.push({
		role: "cover",
		base: "cover",
		data: {
			role: "cover",
			headline:
				copyDoc.hook.trim() ||
				pos.headlinePromise ||
				"BUILDING AI SYSTEMS THAT DRIVE REAL RESULTS.",
			sub: pos.proofBanner || "BUILT DIFFERENT. BUILT TO WIN.",
		},
	});
	let statFallbackIndex = 0;
	let contentStep = 0;
	copyDoc.slides.forEach((slide, bodyIndex) => {
		if (slide.role === "content") {
			contentStep += 1;
		}
		const resolved = bodyData(slide, bundle, bodyIndex, contentStep, statFallbackIndex);
		if (slide.role === "stat") {
			statFallbackIndex += 1;
		}
		items.push({ role: slide.role, data: resolved.data, base: resolved.base });
	});
	items.push({
		role: "cta",
		base: "cta",
		data: {
			role: "cta",
			cta: copyDoc.cta.trim() || pos.ctaBanner || "READY TO BUILD INTELLIGENT SYSTEMS?",
			handle: bundle.wordmark ? `@${bundle.wordmark}` : "@dragonhearted.labs",
		},
	});

	// 2. Pick a deterministic variant + decoration for every slide.
	const plans = planCarousel(
		items.map((it) => it.role),
		seed,
	);
	const total = items.length;

	// 3. Render each slide's layers through the registry; bake in the per-slide
	// hero prompt (image-forward) so the operator can review before generating.
	const promptProject = { brief: options.brief ?? copyDoc.hook, styleMode };
	return items.map((it, idx) => {
		const plan = plans[idx];
		const layers = renderSlideLayers({
			data: it.data,
			variant: plan.variant,
			decor: plan.decor,
			base: it.base,
			slideNo: idx + 1,
			total,
			format,
			theme,
		});
		const slide: Slide = { id: `slide-${idx + 1}`, role: it.role, background, layers };
		slide.heroPrompt = buildSlideHeroPrompt(bundle, promptProject, slide);
		return slide;
	});
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
