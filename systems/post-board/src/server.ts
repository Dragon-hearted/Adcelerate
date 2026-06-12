/**
 * PostBoard HTTP server (Hono).
 *
 * `createApp()` returns a Hono app for both tests (`app.request(...)`) and the
 * `serve` CLI entry. Routes:
 *   - GET  /api/brand            → BrandBundle + fontFaceCss
 *   - GET  /api/projects         → project ids
 *   - POST /api/projects         → seed a new draft project
 *   - GET  /api/projects/:id     → project document
 *   - PUT  /api/projects/:id     → Zod-validate + persist
 *   - POST /api/generate         → cover-background via ImageEngine (502 on failure)
 *   - POST /api/export           → export pipeline (501 until task #7)
 *   - POST /api/upload           → multipart image into the project's assets/
 *   - GET  /editor[/*]           → editor SPA (dist or source; placeholder until task #5)
 *   - GET  /assets/:id/*         → a project's saved assets
 *   - GET  /brand-assets/*       → brand identity assets
 *   - GET  /fonts/*              → brand font files
 *
 * Binds 127.0.0.1; default port 4300 (env `POST_BOARD_PORT`).
 */

import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join, normalize } from "node:path";
import { Hono } from "hono";
import { type BrandAsset, getBrandElementAssets, resolveBrandAssetPath } from "./brand-assets";
import type { BrandBundle } from "./brand-loader";
import { loadBrand } from "./brand-loader";
import { generateCoverBackground } from "./cover";
import { ExportNotImplementedError, exportProject, renderExportViewHtml } from "./export";
import {
	type ProjectStoreOptions,
	listProjects,
	loadProject,
	projectDir,
	projectSchema,
	saveProject,
} from "./project";
import { resolveMonorepoRoot } from "./root";
import { createSeedProject } from "./seed";

const DEFAULT_BRAND_SLUG = "dragonhearted_labs";

export interface AppOptions {
	/** Brand bundle load options (root, slug, brandJsonPath). */
	brand?: Parameters<typeof loadBrand>[0];
	/** Project store options (root, brandSlug). */
	store?: ProjectStoreOptions;
}

/** Resolve a request path under a base dir, guarding against traversal. */
function safeJoin(baseDir: string, rel: string): string | undefined {
	const cleaned = normalize(rel).replace(/^(\.\.(\/|\\|$))+/, "");
	const abs = join(baseDir, cleaned);
	if (!abs.startsWith(baseDir)) {
		return undefined;
	}
	return abs;
}

/** Serve a file from disk (404 when missing); content-type inferred by Bun. */
function serveFile(absPath: string | undefined): Response {
	if (!absPath || !existsSync(absPath)) {
		return new Response("Not found", { status: 404 });
	}
	return new Response(Bun.file(absPath));
}

/** Minimal placeholder editor shell until the SPA (task #5) is built. */
function placeholderEditorHtml(): string {
	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>PostBoard Editor</title>
<style>
	body { font-family: "IBM Plex Mono", monospace; background: #F4F6F8; color: #111318; margin: 0; padding: 48px; }
	code { background: #111318; color: #F4F6F8; padding: 2px 6px; }
</style>
</head>
<body>
	<h1>PostBoard</h1>
	<p>Editor SPA pending (task #5). API is live:</p>
	<ul>
		<li><code>GET /api/brand</code></li>
		<li><code>GET /api/projects</code></li>
		<li><code>GET /api/projects/:id</code></li>
	</ul>
</body>
</html>`;
}

export function createApp(options: AppOptions = {}): Hono {
	const app = new Hono();
	const brandOpts = options.brand ?? {};
	const store = options.store ?? {};
	const brandSlug = brandOpts.brandSlug ?? store.brandSlug ?? DEFAULT_BRAND_SLUG;
	// Brand assets resolve from the real monorepo; projects persist under `store`
	// (which may point elsewhere, e.g. a temp dir in tests).
	const brandRoot = brandOpts.root ?? resolveMonorepoRoot();

	// Brand bundle is immutable for the process lifetime — load once.
	let brandCache: BrandBundle | undefined;
	const getBrand = (): BrandBundle => {
		if (!brandCache) {
			brandCache = loadBrand({ root: brandRoot, brandSlug, silent: true, ...brandOpts });
		}
		return brandCache;
	};

	const brandIdentityDir = join(brandRoot, "client", brandSlug, "brand-identity");

	// Element/logo palette metadata derived once from the cached bundle.
	let elementAssetsCache: BrandAsset[] | undefined;
	const getElementAssets = (): BrandAsset[] => {
		if (!elementAssetsCache) {
			elementAssetsCache = getBrandElementAssets(getBrand(), { root: brandRoot, brandSlug });
		}
		return elementAssetsCache;
	};

	// ─── Brand ───
	// Bundle (palette, fonts, fontFaceCss, style modes, …) + draggable element/logo
	// palette assets for the editor.
	app.get("/api/brand", (c) => c.json({ ...getBrand(), elementAssets: getElementAssets() }));

	// ─── Projects ───
	app.get("/api/projects", async (c) => {
		const ids = await listProjects(store);
		return c.json({ projects: ids });
	});

	app.post("/api/projects", async (c) => {
		const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
		const brief = typeof body.brief === "string" ? body.brief : "";
		if (!brief.trim()) {
			return c.json({ error: "brief is required" }, 400);
		}
		const type = body.type === "post" ? "post" : "carousel";
		const format = (body.format ?? "ig-4x5") as
			| string
			| { preset: string; width: number; height: number };
		const styleMode = typeof body.styleMode === "string" ? body.styleMode : undefined;
		try {
			const project = createSeedProject(getBrand(), {
				brief,
				type,
				format,
				...(styleMode ? { styleMode } : {}),
				brand: brandSlug,
			});
			await saveProject(project, store);
			return c.json(project, 201);
		} catch (err) {
			return c.json({ error: (err as Error).message }, 400);
		}
	});

	app.get("/api/projects/:id", async (c) => {
		try {
			const project = await loadProject(c.req.param("id"), store);
			return c.json(project);
		} catch {
			return c.json({ error: "project not found" }, 404);
		}
	});

	app.put("/api/projects/:id", async (c) => {
		const id = c.req.param("id");
		const raw = await c.req.json().catch(() => null);
		if (raw === null) {
			return c.json({ error: "invalid JSON body" }, 400);
		}
		const parsed = projectSchema.safeParse(raw);
		if (!parsed.success) {
			return c.json({ error: "invalid project", issues: parsed.error.issues }, 400);
		}
		if (parsed.data.id !== id) {
			return c.json({ error: `body id "${parsed.data.id}" does not match path id "${id}"` }, 400);
		}
		await saveProject(parsed.data, store);
		return c.json(parsed.data);
	});

	// ─── Cover/background generation ───
	app.post("/api/generate", async (c) => {
		const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
		const projectId = typeof body.projectId === "string" ? body.projectId : "";
		if (!projectId) {
			return c.json({ error: "projectId is required" }, 400);
		}
		try {
			const result = await generateCoverBackground({
				projectId,
				...(typeof body.slideId === "string" ? { slideId: body.slideId } : {}),
				...(typeof body.promptOverride === "string" ? { promptOverride: body.promptOverride } : {}),
				store,
				bundle: getBrand(),
			});
			return c.json({ src: result.src, generationId: result.generationId });
		} catch (err) {
			return c.json(
				{
					error: `cover generation failed: ${(err as Error).message}`,
					hint: "Is ImageEngine running on :3002? The CSS background path still works.",
				},
				502,
			);
		}
	});

	// ─── Export ───
	app.post("/api/export", async (c) => {
		const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
		const projectId = typeof body.projectId === "string" ? body.projectId : "";
		if (!projectId) {
			return c.json({ error: "projectId is required" }, 400);
		}
		try {
			const result = await exportProject(projectId, { ...store, pdf: body.pdf === true });
			return c.json(result);
		} catch (err) {
			if (err instanceof ExportNotImplementedError) {
				return c.json({ error: err.message }, 501);
			}
			return c.json({ error: `export failed: ${(err as Error).message}` }, 500);
		}
	});

	// ─── Upload ───
	app.post("/api/upload", async (c) => {
		const form = await c.req.formData().catch(() => null);
		if (!form) {
			return c.json({ error: "expected multipart/form-data" }, 400);
		}
		const projectId = String(form.get("projectId") ?? c.req.query("projectId") ?? "");
		const file = form.get("file");
		if (!projectId) {
			return c.json({ error: "projectId is required" }, 400);
		}
		if (!(file instanceof File)) {
			return c.json({ error: "file field is required" }, 400);
		}
		const safeName = (file.name || "upload.png").replace(/[^a-zA-Z0-9._-]/g, "_");
		const fileName = `up-${Date.now().toString(36)}-${safeName}`;
		const assetsDir = join(projectDir(projectId, store), "assets");
		await mkdir(assetsDir, { recursive: true });
		await writeFile(join(assetsDir, fileName), Buffer.from(await file.arrayBuffer()));
		return c.json({ src: `/assets/${projectId}/${fileName}` });
	});

	// ─── Static: editor SPA ───
	const editorDistDir = join(import.meta.dir, "..", "editor", "dist");
	const editorSrcDir = join(import.meta.dir, "..", "editor");
	const serveEditor = (rel: string): Response => {
		const wanted = rel === "" || rel === "/" ? "index.html" : rel.replace(/^\//, "");
		for (const base of [editorDistDir, editorSrcDir]) {
			const abs = safeJoin(base, wanted);
			if (abs && existsSync(abs)) {
				return new Response(Bun.file(abs));
			}
		}
		if (wanted === "index.html") {
			return new Response(placeholderEditorHtml(), {
				headers: { "Content-Type": "text/html; charset=utf-8" },
			});
		}
		return new Response("Not found", { status: 404 });
	};
	app.get("/editor", () => serveEditor("index.html"));
	app.get("/editor/*", (c) => serveEditor(c.req.path.replace(/^\/editor/, "")));

	// ─── Export-view (headless render target) ───
	// Chrome-free shell rendering ONLY the requested slide's `.slide-stage` at
	// exact format dimensions, with brand @font-face + riso filter defs present.
	// Consumed by the Playwright driver in `export.ts`.
	app.get("/export-view/:projectId/:slideId", (c) => {
		const html = renderExportViewHtml({
			fontFaceCss: getBrand().fontFaceCss,
			projectId: c.req.param("projectId"),
			slideId: c.req.param("slideId"),
		});
		return c.html(html);
	});

	// ─── Static: project assets ───
	app.get("/assets/:id/*", (c) => {
		const id = c.req.param("id");
		const rel = c.req.path.replace(new RegExp(`^/assets/${id}`), "");
		const base = join(projectDir(id, store), "assets");
		return serveFile(safeJoin(base, rel));
	});

	// ─── Static: brand assets + fonts ───
	app.get("/brand-assets/*", (c) => {
		return serveFile(resolveBrandAssetPath(c.req.path, { root: brandRoot, brandSlug }));
	});
	app.get("/fonts/*", (c) => {
		const rel = c.req.path.replace(/^\/fonts/, "");
		return serveFile(safeJoin(join(brandIdentityDir, "fonts"), rel));
	});

	// ─── Root ───
	app.get("/", (c) => c.redirect("/editor"));

	return app;
}

/** Resolve the bind port (env `POST_BOARD_PORT` → arg → 4300). */
export function resolvePort(explicit?: number): number {
	return explicit ?? (Number(process.env.POST_BOARD_PORT) || 4300);
}

/** Start the server with Bun.serve, bound to 127.0.0.1. */
export function serve(options: AppOptions & { port?: number } = {}): { port: number; url: string } {
	const app = createApp(options);
	const port = resolvePort(options.port);
	Bun.serve({ port, hostname: "127.0.0.1", fetch: app.fetch });
	const url = `http://127.0.0.1:${port}`;
	return { port, url };
}
