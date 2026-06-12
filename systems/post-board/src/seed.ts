/**
 * Project seeding — turn a brief + format + style mode into a populated draft
 * {@link Project} with placeholder layers drawn from the brand's positioning
 * banners. The PostBoard skill (task #6) refines this draft; the editor lets the
 * operator edit every layer.
 */

import type { BrandBundle } from "./brand-loader";
import { DEFAULT_FORMAT_ID, type FormatPreset, getFormatPreset } from "./formats";
import { modeClassFor } from "./mode-class";
import type { Layer, Project, ProjectFormat, ProjectType, Slide, SlideRole } from "./project";

/** Default light-first feed style mode. */
const DEFAULT_STYLE_MODE = "08-popart-screenprint";

export interface SeedInput {
	brief: string;
	type: ProjectType;
	/** Format-preset id, or an explicit `{preset,width,height}` object. */
	format: string | ProjectFormat;
	styleMode?: string;
	/** Explicit project id (otherwise derived from the brief + timestamp). */
	id?: string;
	/** Brand slug stored on the project (defaults to `dragonhearted_labs`). */
	brand?: string;
	/** Millisecond timestamp for ids/createdAt (injectable for determinism). */
	now?: number;
}

/** Kebab-slug the first few words of a brief. */
function slugify(input: string): string {
	const slug = input
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, "")
		.trim()
		.split(/\s+/)
		.slice(0, 5)
		.join("-")
		.replace(/-+/g, "-");
	return slug.length > 0 ? slug : "post";
}

/** Resolve a format input (id or object) into a concrete {@link ProjectFormat}. */
function resolveFormat(format: string | ProjectFormat): ProjectFormat {
	if (typeof format === "string") {
		const preset: FormatPreset = getFormatPreset(format);
		return { preset: preset.id, width: preset.width, height: preset.height };
	}
	return format;
}

interface TextLayerInput {
	id: string;
	content: string;
	family: string;
	weight: string | number;
	size: number;
	color: string;
	treatment: "clean" | "ink-bleed" | "glitch";
	x: number;
	y: number;
	w: number;
	h: number;
	z: number;
	align?: "left" | "center" | "right" | "justify";
	lineHeight?: number;
	letterSpacing?: number;
}

function textLayer(input: TextLayerInput): Layer {
	return {
		id: input.id,
		kind: "text",
		x: input.x,
		y: input.y,
		w: input.w,
		h: input.h,
		rotation: 0,
		z: input.z,
		content: input.content,
		fontFamily: input.family,
		fontWeight: input.weight,
		fontSize: input.size,
		color: input.color,
		treatment: input.treatment,
		align: input.align ?? "left",
		lineHeight: input.lineHeight ?? 1.05,
		...(input.letterSpacing !== undefined ? { letterSpacing: input.letterSpacing } : {}),
	};
}

/** Pick brand colors with safe fallbacks. */
function colorOf(bundle: BrandBundle, token: string, fallback: string): string {
	return bundle.palette.find((c) => c.token === token)?.hex ?? fallback;
}

/** Font family by role with a safe fallback. */
function familyOf(bundle: BrandBundle, role: string, fallback: string): string {
	return bundle.fonts.find((f) => f.role.includes(role))?.family ?? fallback;
}

/** Build the layers for a slide given its role + brand banners. */
function slideLayers(
	bundle: BrandBundle,
	role: SlideRole,
	format: ProjectFormat,
	index: number,
): Layer[] {
	const ink = colorOf(bundle, "ink", "#111318");
	const display = familyOf(bundle, "display", "PP Neue Machina");
	const mono = familyOf(bundle, "tech", "IBM Plex Mono");
	const body = familyOf(bundle, "body", "Inter");
	const margin = Math.round(format.width * 0.07);
	const contentW = format.width - margin * 2;
	const pos = bundle.positioning;
	const tag = `[DRGN.LAB//${String(index + 1).padStart(3, "0")}]`;

	const kicker = textLayer({
		// Include the slide index so repeated roles (e.g. content) get unique ids.
		id: `l-${role}-${index}-kicker`,
		content: tag,
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
		case "cover": {
			return [
				kicker,
				textLayer({
					id: "l-cover-headline",
					content: pos.headlinePromise ?? "BUILDING AI SYSTEMS THAT DRIVE REAL RESULTS.",
					family: display,
					weight: 800,
					size: Math.round(format.width * 0.11),
					color: ink,
					treatment: "ink-bleed",
					x: margin,
					y: Math.round(format.height * 0.32),
					w: contentW,
					h: Math.round(format.height * 0.4),
					z: 3,
					letterSpacing: -2,
				}),
				textLayer({
					id: "l-cover-sub",
					content: pos.proofBanner ?? "BUILT DIFFERENT. BUILT TO WIN.",
					family: mono,
					weight: 500,
					size: Math.round(format.width * 0.03),
					color: ink,
					treatment: "clean",
					x: margin,
					y: Math.round(format.height * 0.8),
					w: contentW,
					h: Math.round(format.height * 0.08),
					z: 2,
				}),
			];
		}
		case "stat": {
			const stat = bundle.positioning.proofStats[0];
			return [
				kicker,
				textLayer({
					id: "l-stat-value",
					content: stat?.value ?? "+300%",
					family: display,
					weight: 800,
					size: Math.round(format.width * 0.22),
					color: colorOf(bundle, "primary", "#0B5FFF"),
					treatment: "ink-bleed",
					x: margin,
					y: Math.round(format.height * 0.34),
					w: contentW,
					h: Math.round(format.height * 0.28),
					z: 3,
				}),
				textLayer({
					id: "l-stat-label",
					content: (stat?.label ?? "output").toUpperCase(),
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
		case "cta": {
			return [
				kicker,
				textLayer({
					id: "l-cta-headline",
					content: pos.ctaBanner ?? "READY TO BUILD INTELLIGENT SYSTEMS?",
					family: display,
					weight: 800,
					size: Math.round(format.width * 0.09),
					color: ink,
					treatment: "ink-bleed",
					x: margin,
					y: Math.round(format.height * 0.34),
					w: contentW,
					h: Math.round(format.height * 0.36),
					z: 3,
					letterSpacing: -1,
				}),
				{
					id: "l-cta-logo",
					kind: "logo",
					x: margin,
					y: Math.round(format.height * 0.82),
					w: Math.round(format.width * 0.28),
					h: Math.round(format.height * 0.08),
					rotation: 0,
					z: 4,
					variant: "riso_graphite",
				},
			];
		}
		default: {
			// content slide
			return [
				kicker,
				textLayer({
					id: `l-content-${index}-headline`,
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
				textLayer({
					id: `l-content-${index}-body`,
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
}

/** The slide roles seeded for each project type. */
function rolesFor(type: ProjectType): SlideRole[] {
	if (type === "post") {
		return ["cover"];
	}
	return ["cover", "content", "content", "content", "cta"];
}

/**
 * Build a populated draft {@link Project} from a seed input. Pure (no I/O):
 * persist with `saveProject`.
 */
export function createSeedProject(bundle: BrandBundle, input: SeedInput): Project {
	const now = input.now ?? Date.now();
	const iso = new Date(now).toISOString();
	const format = resolveFormat(input.format ?? DEFAULT_FORMAT_ID);
	const styleMode = input.styleMode ?? DEFAULT_STYLE_MODE;
	const id = input.id ?? `${slugify(input.brief)}-${now.toString(36)}`;
	const brand = input.brand ?? "dragonhearted_labs";

	const roles = rolesFor(input.type);
	const slides: Slide[] = roles.map((role, index) => ({
		id: `slide-${index + 1}`,
		role,
		background: { type: "css", styleMode, cssClass: modeClassFor(styleMode) },
		layers: slideLayers(bundle, role, format, index),
	}));

	return {
		id,
		brand,
		type: input.type,
		format,
		styleMode,
		brief: input.brief,
		createdAt: iso,
		updatedAt: iso,
		version: 1,
		slides,
	};
}
