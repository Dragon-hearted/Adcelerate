import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getFormatPreset } from "./formats";
import {
	type Project,
	listProjects,
	loadProject,
	parseProject,
	projectFile,
	safeParseProject,
	saveProject,
} from "./project";

const tmpRoot = mkdtempSync(join(tmpdir(), "post-board-test-"));
// projectsRoot resolves under <root>/client/<brand>/post-board, and isMonorepoRoot
// is not consulted because we pass `root` explicitly.
const store = { root: tmpRoot, brandSlug: "dragonhearted_labs" } as const;

afterAll(() => {
	rmSync(tmpRoot, { recursive: true, force: true });
});

function sampleProject(id: string): Project {
	const fmt = getFormatPreset("ig-4x5");
	return {
		id,
		brand: "dragonhearted_labs",
		type: "carousel",
		format: { preset: fmt.id, width: fmt.width, height: fmt.height },
		styleMode: "08-popart-screenprint",
		brief: "Launch a build-in-public carousel.",
		createdAt: "2026-06-12T00:00:00.000Z",
		updatedAt: "2026-06-12T00:00:00.000Z",
		version: 1,
		slides: [
			{
				id: "slide-1",
				role: "cover",
				background: { type: "css", styleMode: "08-popart-screenprint", cssClass: "riso" },
				layers: [
					{
						id: "layer-1",
						kind: "text",
						x: 80,
						y: 120,
						w: 920,
						h: 400,
						rotation: 0,
						z: 1,
						content: "BUILD DIFFERENT.",
						fontFamily: "PP Neue Machina",
						fontWeight: 800,
						fontSize: 120,
						color: "#111318",
						treatment: "ink-bleed",
						align: "left",
						lineHeight: 1.05,
						letterSpacing: -2,
					},
					{
						id: "layer-2",
						kind: "logo",
						x: 80,
						y: 1180,
						w: 240,
						h: 80,
						rotation: 0,
						z: 2,
						variant: "riso_graphite",
					},
				],
			},
			{
				id: "slide-2",
				role: "stat",
				background: { type: "image", src: "bg.png", generationId: "gen_123", prompt: "riso field" },
				layers: [
					{
						id: "layer-3",
						kind: "element",
						x: 0,
						y: 0,
						w: 300,
						h: 300,
						rotation: 12,
						z: 1,
						elementId: "starburst",
						src: "starbursts-chrome-sheet.png",
					},
				],
			},
		],
	};
}

describe("project schema", () => {
	test("round-trips save → load with deep equality", async () => {
		const project = sampleProject("roundtrip");
		const written = await saveProject(project, store);
		expect(written).toBe(projectFile("roundtrip", store));

		const loaded = await loadProject("roundtrip", store);
		expect(loaded).toEqual(parseProject(project));
	});

	test("listProjects discovers saved project ids", async () => {
		await saveProject(sampleProject("alpha"), store);
		await saveProject(sampleProject("beta"), store);
		const ids = await listProjects(store);
		expect(ids).toContain("alpha");
		expect(ids).toContain("beta");
	});

	test("rejects an invalid project (bad layer kind)", () => {
		const bad = {
			...sampleProject("bad"),
			slides: [
				{
					id: "s",
					role: "cover",
					background: { type: "css" },
					layers: [{ id: "x", kind: "blob", x: 0, y: 0, w: 1, h: 1, z: 0 }],
				},
			],
		};
		expect(safeParseProject(bad).success).toBe(false);
		expect(() => parseProject(bad)).toThrow();
	});

	test("rejects a project with the wrong version literal", () => {
		const bad = { ...sampleProject("v"), version: 2 };
		expect(safeParseProject(bad).success).toBe(false);
	});

	test("rejects a missing required field", () => {
		const { brief: _brief, ...withoutBrief } = sampleProject("nob");
		expect(safeParseProject(withoutBrief).success).toBe(false);
	});
});
