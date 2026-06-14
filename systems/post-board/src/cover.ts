/**
 * Cover/background generation — shared by the HTTP API (`POST /api/generate`)
 * and the CLI (`generate-cover`). Loads the project, composes the prompt,
 * generates the image through ImageEngine, downloads it into the project's
 * `assets/` dir, updates the target slide's background to the image, and
 * persists the project.
 *
 * On ImageEngine failure this rejects with a clear Error — callers surface a 502
 * and keep the CSS-background path working.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { BrandBundle } from "./brand-loader";
import { loadBrand } from "./brand-loader";
import { buildCoverPrompt } from "./cover-prompt";
import type { AspectRatio } from "./image-client";
import { generateSingle, getImage } from "./image-client";
import {
	type Project,
	type ProjectFormat,
	type ProjectStoreOptions,
	type Slide,
	loadProject,
	projectDir,
	saveProject,
} from "./project";

export interface GenerateCoverInput {
	projectId: string;
	/** Target slide id; defaults to the first `cover` slide (or slide 0). */
	slideId?: string;
	/** Override the composed prompt entirely. */
	promptOverride?: string;
	/** Where projects live on disk. */
	store?: ProjectStoreOptions;
	/** Reuse an already-loaded brand bundle (otherwise loaded fresh). */
	bundle?: BrandBundle;
	/** Millisecond timestamp for the asset filename (injectable for tests). */
	now?: number;
}

export interface GenerateCoverResult {
	/** Server URL path for the saved background (e.g. `/assets/<id>/bg-<ts>.png`). */
	src: string;
	/** ImageEngine gallery id. */
	generationId: string;
	/** Absolute path the image was written to. */
	localPath: string;
	/** The prompt actually used. */
	prompt: string;
}

/** Map a slide's pixel format to the closest ImageEngine aspect ratio. */
export function aspectRatioForFormat(format: ProjectFormat): AspectRatio {
	const ratio = format.width / format.height;
	const candidates: [AspectRatio, number][] = [
		["1:1", 1],
		["4:5", 4 / 5],
		["9:16", 9 / 16],
		["3:4", 3 / 4],
		["16:9", 16 / 9],
		["3:2", 3 / 2],
	];
	let best = candidates[0];
	for (const c of candidates) {
		if (Math.abs(c[1] - ratio) < Math.abs(best[1] - ratio)) {
			best = c;
		}
	}
	return best[0];
}

/** Find the target slide (explicit id → first cover → first slide). */
function pickSlide(project: Project, slideId?: string): Slide {
	if (slideId) {
		const found = project.slides.find((s) => s.id === slideId);
		if (!found) {
			throw new Error(`Slide "${slideId}" not found in project "${project.id}".`);
		}
		return found;
	}
	return project.slides.find((s) => s.role === "cover") ?? project.slides[0];
}

/**
 * Generate a background image for a project slide and persist it.
 * @throws if ImageEngine is unreachable/errors, or the project/slide is missing.
 */
export async function generateCoverBackground(
	input: GenerateCoverInput,
): Promise<GenerateCoverResult> {
	const store = input.store ?? {};
	const bundle = input.bundle ?? loadBrand({ ...store, silent: true });
	const project = await loadProject(input.projectId, store);
	const slide = pickSlide(project, input.slideId);

	const prompt =
		input.promptOverride ??
		buildCoverPrompt(bundle, project, {
			styleMode: slide.background.type === "css" ? slide.background.styleMode : project.styleMode,
			slideRole: slide.role,
		});

	const result = await generateSingle({
		prompt,
		aspectRatio: aspectRatioForFormat(project.format),
		// No `openaiQuality`: the default model (NanoBanana Pro) rejects a
		// `quality` param; it is a gpt_image_2-only knob.
		sceneId: `${project.id}:${slide.id}`,
	});

	const image = await getImage(result.id);
	const now = input.now ?? Date.now();
	const fileName = `bg-${now.toString(36)}.png`;
	const assetsDir = join(projectDir(project.id, store), "assets");
	await mkdir(assetsDir, { recursive: true });
	const localPath = join(assetsDir, fileName);
	await writeFile(localPath, image);

	const src = `/assets/${project.id}/${fileName}`;
	slide.background = {
		type: "image",
		src,
		generationId: result.id,
		prompt,
	};
	project.updatedAt = new Date(now).toISOString();
	await saveProject(project, store);

	return { src, generationId: result.id, localPath, prompt };
}
