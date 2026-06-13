/**
 * Project seeding — turn a brief + format + style mode into a populated draft
 * {@link Project} with placeholder layers drawn from the brand's positioning
 * banners. The PostBoard skill (task #6) refines this draft; the editor lets the
 * operator edit every layer.
 */

import type { BrandBundle } from "./brand-loader";
import { DEFAULT_FORMAT_ID, type FormatPreset, getFormatPreset } from "./formats";
import { modeClassFor } from "./mode-class";
import type { Project, ProjectFormat, ProjectType, Slide, SlideRole } from "./project";
import { type SlideData, planCarousel, renderSlideLayers, resolveTheme } from "./templates";

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

const pad2 = (n: number): string => String(n).padStart(2, "0");

/**
 * Resolve on-brand placeholder {@link SlideData} (positioning-derived, never
 * lorem) for a seeded slide of `role` plus its semantic id `base`. `index` is the
 * slide's deck position (so repeated `content` roles keep unique ids); `step` is
 * the 1-based count among same-kind teaching slides (for the `big-number` step).
 */
function seedData(
	bundle: BrandBundle,
	role: SlideRole,
	index: number,
	step: number,
): { data: SlideData; base: string } {
	const pos = bundle.positioning;
	switch (role) {
		case "cover":
			return {
				base: "cover",
				data: {
					role: "cover",
					headline: pos.headlinePromise ?? "BUILDING AI SYSTEMS THAT DRIVE REAL RESULTS.",
					sub: pos.proofBanner ?? "BUILT DIFFERENT. BUILT TO WIN.",
				},
			};
		case "stat": {
			const stat = pos.proofStats[0] ?? { value: "+300%", label: "output" };
			return {
				base: `stat-${index}`,
				data: { role: "stat", value: stat.value, label: stat.label.toUpperCase() },
			};
		}
		case "quote":
			return {
				base: `quote-${index}`,
				data: {
					role: "quote",
					quote: "“WE DON’T DEMO. WE SHIP.”",
					attribution: `— ${(bundle.wordmark ?? bundle.brand ?? "DRAGONHEARTED LABS").toUpperCase()}`,
				},
			};
		case "cta":
			return {
				base: "cta",
				data: {
					role: "cta",
					cta: pos.ctaBanner ?? "READY TO BUILD INTELLIGENT SYSTEMS?",
					handle: bundle.wordmark ? `@${bundle.wordmark}` : "@dragonhearted.labs",
				},
			};
		default:
			return {
				base: `content-${index}`,
				data: {
					role: "content",
					headline: "POINT TITLE GOES HERE.",
					body: "Supporting copy — crisp, concrete, zero corporate filler. Edit this in the editor.",
					step: pad2(step),
				},
			};
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
	const theme = resolveTheme(bundle, format);
	// Deterministic variant assignment, seeded off the (stable) project id.
	const plans = planCarousel(roles, id);
	const background = { type: "css", styleMode, cssClass: modeClassFor(styleMode) } as const;

	let contentStep = 0;
	const slides: Slide[] = roles.map((role, index) => {
		if (role === "content") {
			contentStep += 1;
		}
		const { data, base } = seedData(bundle, role, index, contentStep);
		const plan = plans[index];
		return {
			id: `slide-${index + 1}`,
			role,
			background,
			layers: renderSlideLayers({
				data,
				variant: plan.variant,
				decor: plan.decor,
				base,
				slideNo: index + 1,
				total: roles.length,
				format,
				theme,
			}),
		};
	});

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
