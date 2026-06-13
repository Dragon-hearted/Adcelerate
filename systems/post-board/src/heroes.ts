/**
 * Per-slide hero-image generation — the image-forward carousel path.
 *
 * The operator's creative default: every slide is built around a generated hero
 * image (NanoBanana Pro via Higgsfield — ImageEngine's default, since PostBoard
 * omits `model`), with the brand-locked text rendered on top as editable
 * overlays. Seeding stays fast (CSS-riso backgrounds + reserved hero zones); this
 * is the explicit, possibly-costly step the operator runs to populate them.
 *
 * Uses ImageEngine's **batch** endpoint (`/api/generate/batch`) so all slides
 * generate in parallel. Per-slide failures are graceful: that slide keeps its
 * CSS-riso background (the fallback) and the failure is reported. If ImageEngine
 * itself is unreachable the whole call rejects with a clear error and the project
 * is left untouched.
 *
 * Permission-gated fallback (task #3): requests omit `model` and, by default,
 * omit `autoFallback` — so a NanoBanana-down provider surfaces a clear error
 * rather than silently degrading. The operator opts in via `autoFallback: true`
 * (or `IMAGE_ENGINE_AUTO_FALLBACK=1`) to approve a provider switch.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { BrandBundle } from "./brand-loader";
import { loadBrand } from "./brand-loader";
import { aspectRatioForFormat } from "./cover";
import { buildSlideHeroPrompt } from "./cover-prompt";
import {
	type BatchRequest,
	type GenerationRequest,
	type GenerationResult,
	generateBatch,
	getImage,
} from "./image-client";
import {
	type Project,
	type ProjectStoreOptions,
	type Slide,
	loadProject,
	projectDir,
	saveProject,
} from "./project";

export interface GenerateHeroesInput {
	projectId: string;
	/** Limit to these slide ids (default: every slide in the project). */
	slideIds?: string[];
	/** Where projects live on disk. */
	store?: ProjectStoreOptions;
	/** Reuse an already-loaded brand bundle (otherwise loaded fresh). */
	bundle?: BrandBundle;
	/**
	 * Approve ImageEngine's provider fallback for this run (NanoBanana down →
	 * other provider). Default false = surface a clear error per slide.
	 */
	autoFallback?: boolean;
	/** Millisecond timestamp for asset filenames (injectable for tests). */
	now?: number;
}

/** Outcome for one slide. */
export interface HeroSlideResult {
	slideId: string;
	role: Slide["role"];
	/** Set on success — the served `/assets/...` background path. */
	src?: string;
	/** Set on success — the ImageEngine gallery id. */
	generationId?: string;
	/** Set on failure — the reason this slide kept its CSS background. */
	error?: string;
}

export interface GenerateHeroesResult {
	generated: HeroSlideResult[];
	failed: HeroSlideResult[];
	totalTokens: number;
}

/** The `sceneId` that links a slide to its batch result. */
function sceneIdFor(project: Project, slide: Slide): string {
	return `${project.id}:${slide.id}`;
}

/** Resolve the target slides for a run (explicit ids → those; else all). */
export function targetSlides(project: Project, slideIds?: string[]): Slide[] {
	if (!slideIds || slideIds.length === 0) {
		return project.slides;
	}
	const wanted = new Set(slideIds);
	return project.slides.filter((s) => wanted.has(s.id));
}

/**
 * Assemble the ImageEngine batch request for a project's hero images. Pure (no
 * network/disk) so the prompt composition + budgeting is unit-testable. One
 * item per target slide; `model` is intentionally omitted (NanoBanana default).
 */
export function buildHeroBatchRequest(
	project: Project,
	bundle: BrandBundle,
	opts: { slideIds?: string[]; autoFallback?: boolean } = {},
): BatchRequest {
	const aspectRatio = aspectRatioForFormat(project.format);
	const items: GenerationRequest[] = targetSlides(project, opts.slideIds).map((slide) => ({
		// Prefer the slide's carried (operator-editable) hero prompt; fall back to
		// re-deriving it from the current slide copy.
		prompt: slide.heroPrompt?.trim() || buildSlideHeroPrompt(bundle, project, slide),
		aspectRatio,
		// NOTE: no `openaiQuality` — it's a gpt_image_2-only knob; the default
		// model is NanoBanana Pro, which rejects a `quality` param.
		sceneId: sceneIdFor(project, slide),
		...(opts.autoFallback ? { autoFallback: true } : {}),
	}));
	return { items };
}

/** Type guard: a batch entry that is an error, not a generation result. */
function isError(entry: GenerationResult | { error: string }): entry is { error: string } {
	return typeof (entry as { error?: unknown }).error === "string";
}

/**
 * Generate a hero image for each target slide via ImageEngine's batch endpoint,
 * download the successes into the project's `assets/` dir, set those slides'
 * backgrounds to the generated image, and persist the project once.
 *
 * @throws if ImageEngine is unreachable or the project is missing. Per-slide
 *   generation failures do NOT throw — they are returned in `failed` and the
 *   slide keeps its CSS background.
 */
export async function generateHeroBackgrounds(
	input: GenerateHeroesInput,
): Promise<GenerateHeroesResult> {
	const store = input.store ?? {};
	const bundle = input.bundle ?? loadBrand({ ...store, silent: true });
	const project = await loadProject(input.projectId, store);
	const slides = targetSlides(project, input.slideIds);
	if (slides.length === 0) {
		throw new Error(`No matching slides to generate in project "${input.projectId}".`);
	}

	const batch = buildHeroBatchRequest(project, bundle, {
		...(input.slideIds ? { slideIds: input.slideIds } : {}),
		...(input.autoFallback ? { autoFallback: true } : {}),
	});
	const result = await generateBatch(batch);

	const assetsDir = join(projectDir(project.id, store), "assets");
	await mkdir(assetsDir, { recursive: true });
	const now = input.now ?? Date.now();

	const generated: HeroSlideResult[] = [];
	const failed: HeroSlideResult[] = [];

	for (const slide of slides) {
		const entry = result.results[sceneIdFor(project, slide)];
		if (!entry) {
			failed.push({ slideId: slide.id, role: slide.role, error: "no result returned" });
			continue;
		}
		if (isError(entry)) {
			failed.push({ slideId: slide.id, role: slide.role, error: entry.error });
			continue;
		}
		try {
			const image = await getImage(entry.id);
			const fileName = `hero-${slide.id}-${now.toString(36)}.png`;
			await writeFile(join(assetsDir, fileName), image);
			const src = `/assets/${project.id}/${fileName}`;
			slide.background = { type: "image", src, generationId: entry.id, prompt: entry.prompt };
			generated.push({ slideId: slide.id, role: slide.role, src, generationId: entry.id });
		} catch (err) {
			failed.push({
				slideId: slide.id,
				role: slide.role,
				error: err instanceof Error ? err.message : String(err),
			});
		}
	}

	if (generated.length > 0) {
		project.updatedAt = new Date(now).toISOString();
		await saveProject(project, store);
	}

	return { generated, failed, totalTokens: result.totalTokens };
}
