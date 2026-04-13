import { resolve } from "node:path";
import { detectDrift } from "./drift/detector";
import { generate } from "./generate";
import type { ReadmeScope, RenderedReadme } from "./types";

/** Resolve monorepo root — readme-engine lives at systems/readme-engine */
function resolveRoot(): string {
	return resolve(import.meta.dir, "../../..");
}

/** Get the README path for a given scope */
function readmePath(monorepoRoot: string, scope: ReadmeScope): string {
	switch (scope.type) {
		case "root":
			return resolve(monorepoRoot, "README.md");
		case "system":
			return resolve(monorepoRoot, "systems", scope.name ?? "", "README.md");
		case "app":
			return resolve(monorepoRoot, "apps", scope.name ?? "", "README.md");
	}
}

/** Check if a README exists at the target path */
async function readmeExists(path: string): Promise<boolean> {
	try {
		const file = Bun.file(path);
		return await file.exists();
	} catch {
		return false;
	}
}

/**
 * Selective update: detect drift, then re-generate only if stale sections exist.
 * Falls back to full generation if no README exists yet.
 */
export async function update(scope: ReadmeScope): Promise<RenderedReadme> {
	const monorepoRoot = resolveRoot();
	const targetPath = readmePath(monorepoRoot, scope);
	const scopeLabel = scope.name ? `${scope.type}:${scope.name}` : scope.type;

	console.log(`[update] Checking drift for ${scopeLabel}...`);

	// If no existing README, fall back to full generation
	const exists = await readmeExists(targetPath);
	if (!exists) {
		console.log(`[update] No existing README at ${targetPath} — falling back to full generation`);
		return generate(scope);
	}

	// Run drift detection
	const driftResults = await detectDrift(scope);
	const staleSections = driftResults.filter((r) => r.status === "stale");
	const unknownSections = driftResults.filter((r) => r.status === "unknown");

	if (staleSections.length === 0 && unknownSections.length === 0) {
		console.log("[update] All sections are current — no update needed");

		const existingContent = await Bun.file(targetPath).text();
		return {
			scope,
			sections: [],
			fullContent: existingContent,
			generatedAt: new Date().toISOString(),
		};
	}

	const staleNames = [
		...staleSections.map((s) => s.sectionName),
		...unknownSections.map((s) => s.sectionName),
	];
	console.log(`[update] Stale sections: ${staleNames.join(", ")}`);
	console.log("[update] Re-generating full README...");

	// For now, re-generate the full README when any section is stale.
	// A more granular merge would parse the existing README by section markers,
	// re-render only stale sections, and splice them back in. Full re-generation
	// is simpler and produces consistent output.
	return generate(scope);
}
