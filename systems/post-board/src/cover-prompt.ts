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
 * The visual MEDIUM a style mode renders its subject in (subject-driven, from
 * `brand.json` `style_modes`). This is what makes the hero an actual subject —
 * a chrome object, a halftone portrait, a low-poly form — not a flat texture.
 */
function modeMedium(styleId: string): { medium: string; dark: boolean } {
	switch (styleId) {
		case "01-chrome-hero":
			return {
				dark: true,
				medium: `a single photoreal 3D liquid-chrome hero object — glossy, sculptural, dimensional (a chrome dragon / glyph / product form) — on a Cosmic Black ${VOID_HEX} starfield ground with fine grain; Electric Blue ${"#0B5FFF"} glowing energy veins + rim light thread the chrome (blue is the only chromatic energy)`,
			};
		case "05-y2k-chrome":
		case "07-chrome-space":
			return {
				dark: false,
				medium: `a glossy liquid-chrome cut-out subject (chrome object / Y2K form) floating as a die-cut on the Retro White ${RETRO_WHITE_HEX} textured paper ground; chrome stays glossy, the ground stays printed paper with grain + halftone star-field flecks in Graphite/Silver`,
			};
		case "02-lowpoly-neon-glow":
			return {
				dark: false,
				medium: `a low-poly 3D form with Electric Blue ${"#0B5FFF"} edge-wireframe linework printed as ink plates on the Retro White ${RETRO_WHITE_HEX} riso ground, the glow re-rendered as halftone gradients`,
			};
		case "03-ascii-dotmatrix":
		case "06-ascii-glow-night":
			return {
				dark: false,
				medium: `an ASCII / dot-matrix rendering of the subject — Graphite/Silver ink dots and terminal-art glyphs on Retro White ${RETRO_WHITE_HEX} paper, dot-matrix-printer-on-paper aesthetic`,
			};
		default:
			// 08-popart-screenprint (default feed) + anything else
			return {
				dark: false,
				medium: `a bold halftone / screenprint subject — a high-contrast duotone portrait or product hit — with heavy ink-bleed, 1–3px plate misregistration and flat color hits on the Retro White ${RETRO_WHITE_HEX} textured paper ground`,
			};
	}
}

/** The concrete hero SUBJECT for a slide role (the archetypes the refs use). */
function roleSubject(role: SlideRole): string {
	switch (role) {
		case "cover":
			return "the deck's flagship hero subject — one striking emblem of the topic that stops the scroll";
		case "stat":
			return "a single bold proof object — a chrome 3D form or starburst that punctuates the number (the number itself is overlaid later, not in the image)";
		case "quote":
			return "a high-contrast duotone / halftone portrait subject (an evocative face or figure) as the reset beat";
		case "cta":
			return "a glossy chrome / branded hero object that invites the save/follow action";
		default:
			return "a product / app mockup or tool-UI screen that illustrates this point as a tangible subject";
	}
}

/**
 * Build the hero-image prompt for ONE slide of an image-forward carousel.
 *
 * Unlike {@link buildCoverPrompt} (a flat background plate), this emits a prompt
 * for an actual SUBJECT — a chrome object, halftone portrait, product/app
 * mockup, tool-UI screenshot, or low-poly form, chosen from the slide's style
 * mode (subject-driven `style_modes`) and role archetype, themed by the slide's
 * own copy. The subject fills ~two-thirds of the frame and the prompt reserves a
 * clean low-detail band for the text overlay (the layout adds a legibility
 * scrim). Brand-locked treatment (riso grain, Electric-Blue/Lime accents,
 * retro-white or cosmic-black ground) and the same hard NO-TEXT / NO-LOGO rules.
 */
export function buildSlideHeroPrompt(
	bundle: BrandBundle,
	project: PromptProject,
	slide: Slide,
	opts: { subject?: string } = {},
): string {
	const styleId =
		(slide.background.type === "css" ? slide.background.styleMode : undefined) ?? project.styleMode;
	const mode = bundle.styleModes.find((m) => m.id === styleId);
	const { medium, dark } = modeMedium(styleId);
	const theme = opts.subject ?? slideSubject(slide, project);
	const bandSide = slide.role === "content" ? "top" : "bottom";

	const constraints =
		"ABSOLUTELY NO TEXT, NO WORDS, NO LETTERING, NO TYPOGRAPHY, NO CAPTIONS, NO NUMBERS, and NO LOGO or wordmark or brand mark anywhere in the image — the headline, body and logo are added later as separate editable overlays. Do not render any UI chrome, watermark, or signature.";

	const parts: string[] = [
		`On-brand IMAGE-FORWARD social ${slide.role} hero for ${bundle.brand}, an AI engineer–artist personal brand. The IMAGE is the subject of the slide (not a flat background).`,
		`Hero subject: ${roleSubject(slide.role)}. Render it as ${medium}.`,
		mode ? `Style mode "${mode.name}" (${mode.id}): ${mode.description}` : "",
		theme
			? `Let the subject evoke this idea (visual metaphor only, no literal text): ${theme}`
			: "",
		`Composition: the hero subject dominates ~two-thirds of the frame; keep a CLEAN, low-detail, lower-contrast band across the ${bandSide} ~third of the canvas as quiet negative space for a text overlay. Bold, scroll-stopping, high craft; print-artifact lab-zine aesthetic.`,
		`Color palette (use only these): ${paletteLine(bundle)}.${
			dark
				? ""
				: ` Always-on risograph grain + ink-bleed on the ${RETRO_WHITE_HEX} paper ground (never flat white).`
		}`,
		constraints,
	].filter((p) => p.length > 0);

	let prompt = parts.join("\n\n").trim();
	if (prompt.length > MAX_COVER_PROMPT_CHARS) {
		const budget = MAX_COVER_PROMPT_CHARS - constraints.length - 2;
		const head = prompt.slice(0, Math.max(0, budget));
		const lastStop = Math.max(head.lastIndexOf(". "), head.lastIndexOf("\n"));
		const trimmed = (lastStop > 0 ? head.slice(0, lastStop + 1) : head).trim();
		prompt = `${trimmed}\n\n${constraints}`.slice(0, MAX_COVER_PROMPT_CHARS);
	}
	return prompt;
}
