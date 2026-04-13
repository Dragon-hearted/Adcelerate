import { resolve } from "node:path";
import {
	collectApps,
	collectCode,
	collectGit,
	collectGraph,
	collectLibrary,
	collectSystems,
} from "./collectors";
import { fingerprintKey, generateFingerprints, loadFingerprints, saveFingerprints } from "./drift";
import { appReadme } from "./templates/app-readme";
import { rootReadme } from "./templates/root-readme";
import { systemReadme } from "./templates/system-readme";
import type { ReadmeScope, ReadmeSection, RenderedReadme } from "./types";

/** Resolve monorepo root — readme-engine lives at systems/readme-engine */
function resolveRoot(): string {
	return resolve(import.meta.dir, "../../..");
}

/** Assemble sections into a full README string with --- separators */
function assembleSections(sections: ReadmeSection[]): string {
	return sections
		.sort((a, b) => a.order - b.order)
		.map((s) => s.content)
		.join("\n\n---\n\n");
}

/** Write README content to the target path */
async function writeReadme(path: string, content: string): Promise<void> {
	await Bun.write(path, `${content}\n`);
	console.log(`[generate] Wrote ${path}`);
}

/** Generate README for root scope */
async function generateRoot(monorepoRoot: string): Promise<RenderedReadme> {
	console.log("[generate] Collecting data for root README...");

	const [systems, graph, library, git, code] = await Promise.all([
		collectSystems(monorepoRoot),
		collectGraph(monorepoRoot),
		collectLibrary(monorepoRoot),
		collectGit(monorepoRoot),
		collectCode(monorepoRoot),
	]);

	console.log(`[generate] Collected: ${systems.length} systems, ${library.skillCount} skills`);

	const sections = rootReadme({ systems, graph, library, git, code });
	const fullContent = assembleSections(sections);

	const outputPath = resolve(monorepoRoot, "README.md");
	await writeReadme(outputPath, fullContent);

	return {
		scope: { type: "root" },
		sections,
		fullContent,
		generatedAt: new Date().toISOString(),
	};
}

/** Generate README for a specific system */
async function generateSystem(monorepoRoot: string, name: string): Promise<RenderedReadme> {
	console.log(`[generate] Collecting data for system: ${name}...`);

	const systems = await collectSystems(monorepoRoot);
	const system = systems.find(
		(s) => s.name.toLowerCase() === name.toLowerCase() || s.path.endsWith(`/${name}`),
	);

	if (!system) {
		console.error(`[generate] System not found: ${name}`);
		console.error(`[generate] Available systems: ${systems.map((s) => s.name).join(", ")}`);
		return {
			scope: { type: "system", name },
			sections: [],
			fullContent: "",
			generatedAt: new Date().toISOString(),
		};
	}

	const systemPath = `${monorepoRoot}/${system.path}`;

	const [graph, git, code] = await Promise.all([
		collectGraph(monorepoRoot),
		collectGit(monorepoRoot, [system.path]),
		collectCode(monorepoRoot),
	]);

	const sections = await systemReadme({
		system,
		graph,
		git,
		code,
		monorepoRoot,
	});

	const fullContent = assembleSections(sections);
	const outputPath = resolve(systemPath, "README.md");
	await writeReadme(outputPath, fullContent);

	return {
		scope: { type: "system", name },
		sections,
		fullContent,
		generatedAt: new Date().toISOString(),
	};
}

/** Generate README for a specific app */
async function generateApp(monorepoRoot: string, name: string): Promise<RenderedReadme> {
	console.log(`[generate] Collecting data for app: ${name}...`);

	const apps = await collectApps(monorepoRoot);
	const app = apps.find((a) => a.name === name || a.path.endsWith(`/${name}`));

	if (!app) {
		console.error(`[generate] App not found: ${name}`);
		console.error(`[generate] Available apps: ${apps.map((a) => a.name).join(", ")}`);
		return {
			scope: { type: "app", name },
			sections: [],
			fullContent: "",
			generatedAt: new Date().toISOString(),
		};
	}

	const code = await collectCode(monorepoRoot);
	const sections = appReadme({ app, code });
	const fullContent = assembleSections(sections);

	const outputPath = resolve(monorepoRoot, app.path, "README.md");
	await writeReadme(outputPath, fullContent);

	return {
		scope: { type: "app", name },
		sections,
		fullContent,
		generatedAt: new Date().toISOString(),
	};
}

/** Generate all READMEs (root + all systems + all apps) */
async function generateAll(monorepoRoot: string): Promise<RenderedReadme[]> {
	const results: RenderedReadme[] = [];

	// Root
	results.push(await generateRoot(monorepoRoot));

	// All systems
	const systems = await collectSystems(monorepoRoot);
	for (const sys of systems) {
		const name = sys.path.split("/").pop() || sys.name;
		results.push(await generateSystem(monorepoRoot, name));
	}

	// All apps
	const apps = await collectApps(monorepoRoot);
	for (const app of apps) {
		const name = app.path.split("/").pop() || app.name;
		results.push(await generateApp(monorepoRoot, name));
	}

	return results;
}

/** Main generate entry point */
export async function generate(scope: ReadmeScope): Promise<RenderedReadme> {
	const monorepoRoot = resolveRoot();
	console.log(
		`[generate] Scope: ${scope.type}${scope.name ? `:${scope.name}` : ""} | Root: ${monorepoRoot}`,
	);

	let result: RenderedReadme;

	switch (scope.type) {
		case "root":
			result = await generateRoot(monorepoRoot);
			break;
		case "system":
			if (!scope.name) {
				// Generate all systems
				const systems = await collectSystems(monorepoRoot);
				let lastResult: RenderedReadme | null = null;
				for (const sys of systems) {
					const name = sys.path.split("/").pop() || sys.name;
					lastResult = await generateSystem(monorepoRoot, name);
				}
				result = lastResult ?? {
					scope,
					sections: [],
					fullContent: "",
					generatedAt: new Date().toISOString(),
				};
			} else {
				result = await generateSystem(monorepoRoot, scope.name);
			}
			break;
		case "app":
			if (!scope.name) {
				const apps = await collectApps(monorepoRoot);
				let lastResult: RenderedReadme | null = null;
				for (const app of apps) {
					const name = app.path.split("/").pop() || app.name;
					lastResult = await generateApp(monorepoRoot, name);
				}
				result = lastResult ?? {
					scope,
					sections: [],
					fullContent: "",
					generatedAt: new Date().toISOString(),
				};
			} else {
				result = await generateApp(monorepoRoot, scope.name);
			}
			break;
		default:
			throw new Error(`Unknown scope type: ${scope.type}`);
	}

	// Save fingerprints after successful generation
	await saveGenerationFingerprints(scope);

	console.log(
		`[generate] Done. ${result.sections.length} sections, ${result.fullContent.length} chars`,
	);
	return result;
}

/** Save fingerprints after generating so drift detection has a baseline */
async function saveGenerationFingerprints(scope: ReadmeScope): Promise<void> {
	try {
		const fingerprints = await generateFingerprints(scope);
		const store = await loadFingerprints();

		for (const fp of fingerprints) {
			const key = fingerprintKey(scope, fp.sectionName);
			store[key] = fp;
		}

		await saveFingerprints(store);
		console.log(`[generate] Saved ${fingerprints.length} fingerprints for drift tracking`);
	} catch (err) {
		console.warn("[generate] Failed to save fingerprints:", err);
	}
}
