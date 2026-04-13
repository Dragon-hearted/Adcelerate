import yaml from "js-yaml";
import type { SystemData } from "../types";

interface SystemYamlEntry {
	name?: string;
	path?: string;
	status?: string;
	description?: string;
	task_types?: string[];
	knowledge_path?: string;
	input_types?: string[];
	output_types?: string[];
	domain_tags?: string[];
	entry_point?: string;
	stages?: Array<{ name: string; produces?: string }>;
}

/**
 * Reads systems.yaml and per-system knowledge files to build SystemData[].
 */
export async function collectSystems(monorepoRoot: string): Promise<SystemData[]> {
	const systemsPath = `${monorepoRoot}/systems.yaml`;
	const results: SystemData[] = [];

	let raw: string;
	try {
		raw = await Bun.file(systemsPath).text();
	} catch {
		console.warn(`[system-collector] systems.yaml not found at ${systemsPath}`);
		return results;
	}

	const parsed = yaml.load(raw) as Record<string, SystemYamlEntry> | null;
	if (!parsed) return results;

	for (const [id, entry] of Object.entries(parsed)) {
		if (!entry || typeof entry !== "object" || !entry.path) continue;

		const systemPath = `${monorepoRoot}/${entry.path}`;
		const knowledgePath = entry.knowledge_path
			? `${monorepoRoot}/${entry.knowledge_path}`
			: `${systemPath}/knowledge`;

		// Read knowledge summary from index.md
		let knowledgeSummary = "";
		try {
			const indexMd = await Bun.file(`${knowledgePath}/index.md`).text();
			// Extract summary section
			const summaryMatch = indexMd.match(/## Summary\n([\s\S]*?)(?=\n## |\n---|\n$)/);
			knowledgeSummary = summaryMatch ? summaryMatch[1].trim() : indexMd.slice(0, 500).trim();
		} catch {
			// Try domain.md as fallback
			try {
				const domainMd = await Bun.file(`${knowledgePath}/domain.md`).text();
				knowledgeSummary = domainMd.slice(0, 500).trim();
			} catch {
				// No knowledge files available
			}
		}

		// Read package.json
		let packageJson: Record<string, unknown> | null = null;
		try {
			packageJson = await Bun.file(`${systemPath}/package.json`).json();
		} catch {
			// No package.json
		}

		const stages = (entry.stages || []).map((s) => s.name);

		results.push({
			name: entry.name || id,
			description: entry.description || "",
			path: entry.path,
			status: entry.status || "unknown",
			stages,
			dependencies: [],
			taskTypes: entry.task_types || [],
			inputTypes: entry.input_types || [],
			outputTypes: entry.output_types || [],
			domainTags: entry.domain_tags || [],
			entryPoint: entry.entry_point || "",
			knowledgeSummary,
			packageJson,
		});
	}

	return results;
}
