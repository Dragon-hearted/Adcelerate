import { afterAll, describe, expect, mock, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Mock the ImageEngine client BEFORE importing the server (which pulls in
// cover.ts → image-client.ts). `genMode` toggles the success/failure path.
let genMode: "ok" | "fail" = "ok";
mock.module("./image-client", () => ({
	BASE_URL: "http://localhost:3002",
	generateSingle: async () => {
		if (genMode === "fail") {
			throw new Error("fetch failed: ECONNREFUSED 127.0.0.1:3002");
		}
		return {
			id: "gen-test-001",
			imageUrl: "http://localhost:3002/img.png",
			model: "gpt-image-2",
			prompt: "p",
			tokenUsage: { promptTokens: 0, candidateTokens: 0, totalTokens: 0 },
			createdAt: "2026-06-12T00:00:00.000Z",
		};
	},
	getImage: async () => Buffer.from([0x89, 0x50, 0x4e, 0x47]),
	getImageAsReference: async () => ({ data: "", mimeType: "image/png" }),
	getBudgetStatus: async () => ({
		tokenCeiling: 0,
		tokensSpent: 0,
		tokensRemaining: 0,
		percentUsed: 0,
		isActive: false,
	}),
	generateBatch: async () => ({ results: {}, totalTokens: 0 }),
	getGallery: async () => [],
}));

const { createApp } = await import("./server");

const tmpRoot = mkdtempSync(join(tmpdir(), "post-board-server-"));
const app = createApp({ store: { root: tmpRoot, brandSlug: "dragonhearted_labs" } });

afterAll(() => {
	rmSync(tmpRoot, { recursive: true, force: true });
});

async function postJson(path: string, body: unknown) {
	return app.request(path, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

describe("server /api/brand", () => {
	test("returns the brand bundle + fontFaceCss", async () => {
		const res = await app.request("/api/brand");
		expect(res.status).toBe(200);
		const brand = (await res.json()) as {
			brand: string;
			fontFaceCss: string;
			palette: unknown[];
			elementAssets: { src: string; kind: string }[];
		};
		expect(brand.brand).toBe("Dragonhearted Labs");
		expect(brand.fontFaceCss).toContain("@font-face");
		expect(brand.palette.length).toBeGreaterThanOrEqual(6);
		expect(brand.elementAssets.length).toBeGreaterThan(0);
		expect(brand.elementAssets[0].src).toContain("/brand-assets/");
	});
});

describe("server /api/projects round-trip", () => {
	let id = "";

	test("POST seeds a new carousel project", async () => {
		const res = await postJson("/api/projects", {
			brief: "Build-in-public AI systems carousel.",
			type: "carousel",
			format: "ig-4x5",
		});
		expect(res.status).toBe(201);
		const project = (await res.json()) as {
			id: string;
			slides: unknown[];
			format: { preset: string };
		};
		expect(project.id.length).toBeGreaterThan(0);
		expect(project.slides.length).toBe(5);
		expect(project.format.preset).toBe("ig-4x5");
		id = project.id;
	});

	test("GET lists the created project", async () => {
		const res = await app.request("/api/projects");
		const body = (await res.json()) as { projects: string[] };
		expect(body.projects).toContain(id);
	});

	test("GET :id returns the project", async () => {
		const res = await app.request(`/api/projects/${id}`);
		expect(res.status).toBe(200);
		const project = (await res.json()) as { id: string };
		expect(project.id).toBe(id);
	});

	test("PUT :id validates + persists an edit", async () => {
		const current = (await (await app.request(`/api/projects/${id}`)).json()) as Record<
			string,
			unknown
		>;
		const edited = { ...current, brief: "EDITED brief." };
		const put = await app.request(`/api/projects/${id}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(edited),
		});
		expect(put.status).toBe(200);
		const reloaded = (await (await app.request(`/api/projects/${id}`)).json()) as { brief: string };
		expect(reloaded.brief).toBe("EDITED brief.");
	});

	test("PUT rejects an invalid project body", async () => {
		const res = await app.request(`/api/projects/${id}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id, nonsense: true }),
		});
		expect(res.status).toBe(400);
	});

	test("GET missing project → 404", async () => {
		const res = await app.request("/api/projects/does-not-exist");
		expect(res.status).toBe(404);
	});
});

describe("server /api/generate", () => {
	let id = "";

	test("succeeds with a mocked ImageEngine and swaps the cover to an image bg", async () => {
		genMode = "ok";
		const created = (await (
			await postJson("/api/projects", { brief: "Cover gen test.", type: "post", format: "ig-1x1" })
		).json()) as { id: string };
		id = created.id;

		const res = await postJson("/api/generate", { projectId: id });
		expect(res.status).toBe(200);
		const body = (await res.json()) as { src: string; generationId: string };
		expect(body.generationId).toBe("gen-test-001");
		expect(body.src).toContain(`/assets/${id}/bg-`);

		const project = (await (await app.request(`/api/projects/${id}`)).json()) as {
			slides: { background: { type: string; src?: string } }[];
		};
		expect(project.slides[0].background.type).toBe("image");
		expect(project.slides[0].background.src).toBe(body.src);
	});

	test("returns 502 when ImageEngine is down", async () => {
		genMode = "fail";
		const res = await postJson("/api/generate", { projectId: id });
		expect(res.status).toBe(502);
		const body = (await res.json()) as { error: string };
		expect(body.error.toLowerCase()).toContain("cover generation failed");
		genMode = "ok";
	});

	test("400 when projectId is missing", async () => {
		const res = await postJson("/api/generate", {});
		expect(res.status).toBe(400);
	});
});

describe("server /api/export", () => {
	// The real headless render is covered by the export pipeline's own tests
	// (task #7); here we only assert the server-level validation path, which is
	// deterministic and doesn't boot a browser.
	test("400 when projectId is missing", async () => {
		const res = await postJson("/api/export", {});
		expect(res.status).toBe(400);
	});
});

describe("server static editor", () => {
	test("GET /editor serves an HTML shell (200)", async () => {
		const res = await app.request("/editor");
		expect(res.status).toBe(200);
		expect(res.headers.get("content-type") ?? "").toContain("text/html");
	});
});
