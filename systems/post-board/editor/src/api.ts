/**
 * Typed fetch wrappers for the PostBoard REST API. All paths are origin-relative
 * so the editor works wherever the Hono server is bound.
 */

import type { BrandResponse, Project } from "./types";

/** Error carrying the HTTP status + parsed body for callers to branch on. */
export class ApiError extends Error {
	constructor(
		message: string,
		readonly status: number,
		readonly body: unknown,
	) {
		super(message);
		this.name = "ApiError";
	}
}

async function parse(res: Response): Promise<unknown> {
	const text = await res.text();
	if (!text) {
		return undefined;
	}
	try {
		return JSON.parse(text);
	} catch {
		return text;
	}
}

async function request(input: string, init?: RequestInit): Promise<unknown> {
	const res = await fetch(input, init);
	const body = await parse(res);
	if (!res.ok) {
		const msg =
			body && typeof body === "object" && "error" in body
				? String((body as { error: unknown }).error)
				: `${res.status} ${res.statusText}`;
		throw new ApiError(msg, res.status, body);
	}
	return body;
}

/** GET /api/brand → brand bundle + element/logo palette. */
export async function getBrand(): Promise<BrandResponse> {
	return (await request("/api/brand")) as BrandResponse;
}

/** GET /api/projects → known project ids. */
export async function listProjects(): Promise<string[]> {
	const body = (await request("/api/projects")) as { projects?: string[] };
	return body.projects ?? [];
}

/** GET /api/projects/:id → the project document. */
export async function getProject(id: string): Promise<Project> {
	return (await request(`/api/projects/${encodeURIComponent(id)}`)) as Project;
}

/** POST /api/projects → seed a new draft project. */
export async function createProject(input: {
	brief: string;
	type?: "post" | "carousel";
	format?: string;
	styleMode?: string;
}): Promise<Project> {
	return (await request("/api/projects", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(input),
	})) as Project;
}

/** PUT /api/projects/:id → validate + persist the full project. */
export async function saveProject(project: Project): Promise<Project> {
	return (await request(`/api/projects/${encodeURIComponent(project.id)}`, {
		method: "PUT",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(project),
	})) as Project;
}

/** Result of a successful cover-background generation. */
export interface GenerateResult {
	src: string;
	generationId?: string;
}

/** POST /api/generate → swap a slide background to a Higgsfield-generated image. */
export async function generateBackground(input: {
	projectId: string;
	slideId?: string;
	promptOverride?: string;
}): Promise<GenerateResult> {
	return (await request("/api/generate", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(input),
	})) as GenerateResult;
}

/** One slide's outcome from a hero-generation run. */
export interface HeroSlideResult {
	slideId: string;
	role: string;
	src?: string;
	generationId?: string;
	error?: string;
}

/** Result of POST /api/generate-heroes. */
export interface GenerateHeroesResult {
	generated: HeroSlideResult[];
	failed: HeroSlideResult[];
	totalTokens: number;
}

/**
 * POST /api/generate-heroes → generate NanoBanana hero image(s). Pass `slideIds`
 * to scope to specific slides (e.g. the active slide). `autoFallback` opts in to
 * a provider switch if NanoBanana is down (default: surface the error).
 */
export async function generateHeroes(input: {
	projectId: string;
	slideIds?: string[];
	autoFallback?: boolean;
}): Promise<GenerateHeroesResult> {
	return (await request("/api/generate-heroes", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(input),
	})) as GenerateHeroesResult;
}

/** POST /api/upload (multipart) → store an image in the project's assets dir. */
export async function uploadImage(projectId: string, file: File): Promise<{ src: string }> {
	const form = new FormData();
	form.append("projectId", projectId);
	form.append("file", file);
	return (await request("/api/upload", { method: "POST", body: form })) as { src: string };
}

/** POST /api/export → render PNGs (+PDF). Returns whatever the server reports. */
export async function exportProject(
	projectId: string,
	pdf = true,
): Promise<Record<string, unknown>> {
	return (await request("/api/export", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ projectId, pdf }),
	})) as Record<string, unknown>;
}
