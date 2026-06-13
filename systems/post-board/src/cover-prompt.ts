/**
 * Cover-background prompt builder.
 *
 * Composes a single, continuous GPT-Image-2 prompt body for a slide's
 * background image from the brand's style mode + ink-bleed/riso background
 * system + palette + the project brief. The generated image is a BACKGROUND
 * ONLY — all copy and the logo stay editable HTML overlays in the editor, so
 * the prompt hard-forbids any text/lettering and any logo in the frame.
 *
 * HARD RULES (enforced here):
 *  - ≤ 4000 characters.
 *  - Explicitly instructs NO text / words / lettering / typography in the image.
 *  - Explicitly instructs NO logo / wordmark / brand mark in the image.
 *  - A single continuous prompt body (no separate system instruction).
 */

import type { BrandBundle, StyleMode } from "./brand-loader";
import type { Project, Slide, SlideRole } from "./project";

/**
 * The minimal project context a prompt needs: the brief (visual subject fallback)
 * and the default style mode. A full {@link Project} satisfies it, but the seed +
 * copy paths can pass a lightweight object before a project document exists.
 */
export type PromptProject = Pick<Project, "brief" | "styleMode">;

/** Max prompt length accepted by the transport. */
export const MAX_COVER_PROMPT_CHARS = 4000;

/** The flagship dark-first style mode id (cosmic-black canvas exception). */
const HERO_STYLE_ID = "01-chrome-hero";

/** Retro-white light-first canvas (the base system). */
const RETRO_WHITE_HEX = "#F4F6F8";
/** Cosmic-black Hero Mode canvas (the one full-dark exception). */
const VOID_HEX = "#05070D";

export interface BuildCoverPromptOptions {
	/** Style-mode id to compose for (defaults to the project's styleMode). */
	styleMode?: string;
	/** Slide role being generated (affects emphasis; defaults to "cover"). */
	slideRole?: SlideRole;
	/** Explicit subject override (defaults to the project brief). */
	subject?: string;
}

/** Resolve the style mode object for an id, falling back to the first mode. */
function resolveStyleMode(bundle: BrandBundle, id: string | undefined): StyleMode | undefined {
	if (id) {
		const found = bundle.styleModes.find((m) => m.id === id);
		if (found) {
			return found;
		}
	}
	return bundle.styleModes[0];
}

/** Compact palette descriptor: `name hex (role-lead)`. */
function paletteLine(bundle: BrandBundle): string {
	return bundle.palette
		.map((c) => `${c.name} ${c.hex}`)
		.slice(0, 7)
		.join(", ");
}

/**
 * Build the cover/background prompt. Always returns a string ≤
 * {@link MAX_COVER_PROMPT_CHARS}; if composition would exceed the ceiling it is
 * trimmed at a sentence boundary with the hard NO-TEXT/NO-LOGO clause preserved.
 */
export function buildCoverPrompt(
	bundle: BrandBundle,
	project: PromptProject,
	opts: BuildCoverPromptOptions = {},
): string {
	const styleId = opts.styleMode ?? project.styleMode;
	const mode = resolveStyleMode(bundle, styleId);
	const isHero = (mode?.id ?? styleId) === HERO_STYLE_ID;
	const subject = (opts.subject ?? project.brief ?? "").trim();
	const role = opts.slideRole ?? "cover";

	const bg = bundle.backgroundSystem;
	const textureNames = bg.textures.map((t) => t.name).join(", ");

	// The hard constraint clause — always kept, even after trimming.
	const constraints =
		"ABSOLUTELY NO TEXT, NO WORDS, NO LETTERING, NO TYPOGRAPHY, NO CAPTIONS, NO NUMBERS, and NO LOGO or wordmark or brand mark anywhere in the image. This is a pure BACKGROUND plate; all copy and the logo are added later as separate editable overlays. Leave clean negative space for text overlay. Do not render any UI, watermark, or signature.";

	const canvasClause = isHero
		? `Full-bleed dark canvas: Cosmic Black ${VOID_HEX} starfield ground with subtle fine grain and low-opacity silver/graphite stars — never dead-flat black. A single 3D liquid-chrome hero subject, photoreal and glossy, with electric-blue (#0B5FFF) glowing energy veins and rim light; chrome stays glossy (no paper texture on the chrome).`
		: `Full-bleed light-first canvas: Retro White ${RETRO_WHITE_HEX} paper ground, always textured (never flat white). Always-on ink-bleed / risograph-screenprint treatment: feathered soft ink edges, ink-soak halos around heavy elements, slight plate misregistration (1–3px offset between color plates), occasional roller streaks. Layer paper/riso grain plus 1–2 of these textures at low opacity: ${textureNames}.`;

	const parts: string[] = [
		`On-brand social ${role} BACKGROUND for ${bundle.brand}, an AI engineer–artist personal brand.`,
		mode ? `Style mode "${mode.name}" (${mode.id}): ${mode.description}` : "",
		canvasClause,
		`Color palette (use only these): ${paletteLine(bundle)}.`,
		subject ? `Creative subject / theme to evoke (visual only, no literal text): ${subject}` : "",
		`Background-system rule: ${bg.rule}`,
		"Composition: bold, scroll-stopping, generous empty area reserved for headline overlay; print-artifact, lab-zine aesthetic; high craft.",
		constraints,
	].filter((p) => p.length > 0);

	let prompt = parts.join("\n\n").trim();

	if (prompt.length > MAX_COVER_PROMPT_CHARS) {
		// Trim the body but always re-append the hard constraint clause.
		const budget = MAX_COVER_PROMPT_CHARS - constraints.length - 2;
		const head = prompt.slice(0, Math.max(0, budget));
		const lastStop = Math.max(head.lastIndexOf(". "), head.lastIndexOf("\n"));
		const trimmed = (lastStop > 0 ? head.slice(0, lastStop + 1) : head).trim();
		prompt = `${trimmed}\n\n${constraints}`.slice(0, MAX_COVER_PROMPT_CHARS);
	}

	return prompt;
}

// ─── Per-slide hero prompts (image-forward carousels) ───

/** Layer-id suffixes whose text is the slide's *idea* (not chrome/metadata). */
const SUBJECT_PART_RE = /-(headline|text|value|label|body|sub)$/;
/** Layer-id suffixes that are chrome/metadata, never part of the subject. */
const CHROME_PART_RE = /-(kicker|swipe|index|handle|ghost)$/;

/**
 * Distill a slide's own copy into a short visual subject for its hero image.
 * Reads the slide's semantic text layers (headline / value / body …), skipping
 * the mono chrome (kicker, swipe cue, index, handle). Falls back to the project
 * brief when a slide has no copy yet.
 */
export function slideSubject(slide: Slide, project: Pick<Project, "brief">): string {
	const parts: string[] = [];
	for (const layer of slide.layers) {
		if (layer.kind !== "text") {
			continue;
		}
		if (CHROME_PART_RE.test(layer.id)) {
			continue;
		}
		if (SUBJECT_PART_RE.test(layer.id) || !layer.id.includes("-")) {
			const text = layer.content.trim();
			if (text) {
				parts.push(text);
			}
		}
	}
	const subject = parts.join(" — ").trim();
	return subject || (project.brief ?? "").trim();
}

/**
 * Build the hero-image prompt for ONE slide of an image-forward carousel. The
 * generated image is the slide's hero plate (subject of the slide), with the
 * brand-locked headline/body rendered later as editable overlays — so the same
 * hard NO-TEXT / NO-LOGO rules as {@link buildCoverPrompt} apply, and the prompt
 * reserves clean negative space sized for the variant's text zone.
 *
 * The subject is the slide's own copy (via {@link slideSubject}); the canvas
 * follows the slide's style mode (light-first retro-white for feed slides,
 * `01-chrome-hero` cosmic-black for a flagship hero).
 */
export function buildSlideHeroPrompt(
	bundle: BrandBundle,
	project: PromptProject,
	slide: Slide,
	opts: { subject?: string } = {},
): string {
	const styleMode =
		slide.background.type === "css" ? slide.background.styleMode : project.styleMode;
	return buildCoverPrompt(bundle, project, {
		slideRole: slide.role,
		subject: opts.subject ?? slideSubject(slide, project),
		...(styleMode ? { styleMode } : {}),
	});
}
