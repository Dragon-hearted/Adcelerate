/**
 * Project document — the persisted, versioned source of truth for a PostBoard
 * post/carousel. Defined as a Zod schema (runtime-validated) with inferred TS
 * types, plus disk persistence under `client/<brand>/post-board/<id>/project.json`.
 *
 * Layout model: each slide is a fixed-size stage; layers are absolutely
 * positioned in stage pixels (`x,y,w,h`) with `rotation`, `z` order, optional
 * `locked`. Layers are a discriminated union on `kind` (text | image | element |
 * logo). Backgrounds are a discriminated union on `type` (css | image).
 */

import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { DEFAULT_BRAND_SLUG, projectsRoot, resolveMonorepoRoot } from "./root";

// ─── Layer schemas ───

/** Fields shared by every layer; coordinates are in stage pixels. */
const baseLayerShape = {
	id: z.string().min(1),
	x: z.number(),
	y: z.number(),
	w: z.number(),
	h: z.number(),
	rotation: z.number().default(0),
	z: z.number(),
	locked: z.boolean().optional(),
};

/** Ink-bleed treatment applied to display type (body stays `clean` per brand). */
export const treatmentSchema = z.enum(["clean", "ink-bleed", "glitch"]);
export const textAlignSchema = z.enum(["left", "center", "right", "justify"]);
export const objectFitSchema = z.enum(["cover", "contain", "fill", "none", "scale-down"]);
export const logoVariantSchema = z.enum(["primary", "riso_graphite", "riso_electric_blue"]);

const textLayerSchema = z.object({
	...baseLayerShape,
	kind: z.literal("text"),
	content: z.string(),
	fontFamily: z.string(),
	fontWeight: z.union([z.string(), z.number()]),
	fontSize: z.number().positive(),
	color: z.string(),
	treatment: treatmentSchema,
	align: textAlignSchema,
	lineHeight: z.number().positive(),
	letterSpacing: z.number().optional(),
});

const imageLayerSchema = z.object({
	...baseLayerShape,
	kind: z.literal("image"),
	src: z.string(),
	objectFit: objectFitSchema,
});

const elementLayerSchema = z.object({
	...baseLayerShape,
	kind: z.literal("element"),
	elementId: z.string(),
	src: z.string(),
});

const logoLayerSchema = z.object({
	...baseLayerShape,
	kind: z.literal("logo"),
	variant: logoVariantSchema,
});

/** Geometric primitives a {@link shapeLayerSchema} can draw. */
export const shapeKindSchema = z.enum(["rect"]);

/**
 * A flat geometric fill — the brand's "color-block" device. Used for Neon-Lime
 * marker panels sitting *behind* type (Graphite text on a lime field — lime is a
 * SURFACE, never a text colour on the light canvas) and for thin Electric-Blue /
 * Graphite structural rules. `fill` must be a palette hex.
 */
const shapeLayerSchema = z.object({
	...baseLayerShape,
	kind: z.literal("shape"),
	shape: shapeKindSchema,
	fill: z.string(),
});

/** Discriminated union of all layer kinds. */
export const layerSchema = z.discriminatedUnion("kind", [
	textLayerSchema,
	imageLayerSchema,
	elementLayerSchema,
	logoLayerSchema,
	shapeLayerSchema,
]);

// ─── Background, slide, project schemas ───

const cssBackgroundSchema = z.object({
	type: z.literal("css"),
	styleMode: z.string().optional(),
	cssClass: z.string().optional(),
});

const imageBackgroundSchema = z.object({
	type: z.literal("image"),
	src: z.string(),
	generationId: z.string().optional(),
	prompt: z.string().optional(),
});

/** A slide background is either a CSS riso composition or a generated image. */
export const backgroundSchema = z.discriminatedUnion("type", [
	cssBackgroundSchema,
	imageBackgroundSchema,
]);

export const slideRoleSchema = z.enum(["cover", "content", "stat", "quote", "cta"]);

export const slideSchema = z.object({
	id: z.string().min(1),
	role: slideRoleSchema,
	background: backgroundSchema,
	layers: z.array(layerSchema),
	/**
	 * The intended per-slide hero-image prompt (image-forward carousels). Seeded
	 * slides carry it so the operator can review/edit before running
	 * `generate-heroes`, which prefers it over re-deriving from the slide copy.
	 * Optional — slides without a hero plan simply omit it.
	 */
	heroPrompt: z.string().optional(),
});

export const projectTypeSchema = z.enum(["post", "carousel"]);

export const formatSchema = z.object({
	preset: z.string(),
	width: z.number().int().positive(),
	height: z.number().int().positive(),
});

/** The full, versioned project document. */
export const projectSchema = z.object({
	id: z.string().min(1),
	brand: z.string().min(1),
	type: projectTypeSchema,
	format: formatSchema,
	styleMode: z.string(),
	brief: z.string(),
	createdAt: z.string(),
	updatedAt: z.string(),
	version: z.literal(1),
	slides: z.array(slideSchema),
});

// ─── Inferred types ───

export type Treatment = z.infer<typeof treatmentSchema>;
export type TextAlign = z.infer<typeof textAlignSchema>;
export type ObjectFit = z.infer<typeof objectFitSchema>;
export type LogoVariant = z.infer<typeof logoVariantSchema>;
export type Layer = z.infer<typeof layerSchema>;
export type TextLayer = z.infer<typeof textLayerSchema>;
export type ImageLayer = z.infer<typeof imageLayerSchema>;
export type ElementLayer = z.infer<typeof elementLayerSchema>;
export type LogoLayer = z.infer<typeof logoLayerSchema>;
export type ShapeKind = z.infer<typeof shapeKindSchema>;
export type ShapeLayer = z.infer<typeof shapeLayerSchema>;
export type Background = z.infer<typeof backgroundSchema>;
export type SlideRole = z.infer<typeof slideRoleSchema>;
export type Slide = z.infer<typeof slideSchema>;
export type ProjectType = z.infer<typeof projectTypeSchema>;
export type ProjectFormat = z.infer<typeof formatSchema>;
export type Project = z.infer<typeof projectSchema>;

// ─── Validation helpers ───

/** Validate + normalize an unknown value into a {@link Project} (throws on invalid). */
export function parseProject(value: unknown): Project {
	return projectSchema.parse(value);
}

/** Non-throwing validation; returns the Zod `SafeParseReturnType`. */
export function safeParseProject(value: unknown) {
	return projectSchema.safeParse(value);
}

// ─── Disk persistence ───

/** Options for resolving where projects live on disk. */
export interface ProjectStoreOptions {
	root?: string;
	brandSlug?: string;
}

/** Absolute path to a single project's directory. */
export function projectDir(id: string, options: ProjectStoreOptions = {}): string {
	const root = options.root ?? resolveMonorepoRoot();
	return join(projectsRoot(root, options.brandSlug ?? DEFAULT_BRAND_SLUG), id);
}

/** Absolute path to a single project's `project.json`. */
export function projectFile(id: string, options: ProjectStoreOptions = {}): string {
	return join(projectDir(id, options), "project.json");
}

/**
 * Persist a project to `client/<brand>/post-board/<id>/project.json`.
 *
 * The project is validated before writing. The brand slug defaults to the
 * project's own `brand` field. Write is atomic (tmp file + rename).
 */
export async function saveProject(
	project: Project,
	options: ProjectStoreOptions = {},
): Promise<string> {
	const validated = projectSchema.parse(project);
	const opts: ProjectStoreOptions = { ...options, brandSlug: options.brandSlug ?? validated.brand };
	const dir = projectDir(validated.id, opts);
	await mkdir(dir, { recursive: true });

	const target = join(dir, "project.json");
	const tmp = join(dir, `.project.json.${process.pid}.tmp`);
	const json = `${JSON.stringify(validated, null, 2)}\n`;
	await writeFile(tmp, json, "utf8");
	await rename(tmp, target);
	return target;
}

/**
 * Load + validate a project by id.
 *
 * @throws if the file is missing or fails schema validation.
 */
export async function loadProject(id: string, options: ProjectStoreOptions = {}): Promise<Project> {
	const file = projectFile(id, options);
	const raw = await readFile(file, "utf8");
	return projectSchema.parse(JSON.parse(raw));
}

/**
 * List the ids of all projects for a brand (directories containing a readable,
 * valid `project.json`). Invalid/empty directories are skipped.
 */
export async function listProjects(options: ProjectStoreOptions = {}): Promise<string[]> {
	const root = options.root ?? resolveMonorepoRoot();
	const dir = projectsRoot(root, options.brandSlug ?? DEFAULT_BRAND_SLUG);
	let entries: import("node:fs").Dirent[];
	try {
		entries = await readdir(dir, { withFileTypes: true });
	} catch {
		return [];
	}

	const ids: string[] = [];
	for (const entry of entries) {
		if (!entry.isDirectory()) {
			continue;
		}
		try {
			await readFile(join(dir, entry.name, "project.json"), "utf8");
			ids.push(entry.name);
		} catch {
			// Not a project directory — skip.
		}
	}
	return ids.sort();
}
