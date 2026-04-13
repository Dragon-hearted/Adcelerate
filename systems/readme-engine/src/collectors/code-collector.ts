import yaml from "js-yaml";
import type { CodeData } from "../types";

interface SystemYamlEntry {
	path?: string;
	entry_point?: string;
}

/**
 * Scans each system's src/ directory and builds directory trees + entry points.
 * Returns CodeData with discovered entry points, source tree, and directories.
 */
export async function collectCode(monorepoRoot: string): Promise<CodeData> {
	const result: CodeData = {
		entryPoints: [],
		sourceTree: "",
		directories: [],
	};

	// Get entry points from systems.yaml
	try {
		const raw = await Bun.file(`${monorepoRoot}/systems.yaml`).text();
		const parsed = yaml.load(raw) as Record<string, SystemYamlEntry> | null;

		if (parsed) {
			for (const entry of Object.values(parsed)) {
				if (entry?.entry_point) {
					result.entryPoints.push(entry.entry_point);
				}
			}
		}
	} catch {
		console.warn("[code-collector] systems.yaml not found");
	}

	// Scan systems/*/src/ directories
	const systemsDir = `${monorepoRoot}/systems`;
	try {
		const treeLines: string[] = [];
		const dirs = await readDir(systemsDir);

		for (const systemName of dirs.sort()) {
			const srcPath = `${systemsDir}/${systemName}/src`;
			try {
				const tree = await buildTree(srcPath, systemName, 0, 3);
				treeLines.push(...tree);
				result.directories.push(`systems/${systemName}/src`);
			} catch {
				// System has no src/ directory
			}
		}

		result.sourceTree = treeLines.join("\n");
	} catch {
		console.warn("[code-collector] systems/ directory not found");
	}

	return result;
}

async function readDir(path: string): Promise<string[]> {
	const proc = Bun.spawn(["ls", path], {
		stdout: "pipe",
		stderr: "pipe",
	});
	const output = await new Response(proc.stdout).text();
	await proc.exited;
	return output.trim().split("\n").filter(Boolean);
}

async function buildTree(
	dirPath: string,
	prefix: string,
	depth: number,
	maxDepth: number,
): Promise<string[]> {
	if (depth >= maxDepth) return [];

	const indent = "  ".repeat(depth);
	const lines: string[] = [`${indent}${prefix}/`];

	const entries = await readDir(dirPath);
	for (const entry of entries.sort()) {
		const fullPath = `${dirPath}/${entry}`;

		// Check if directory by trying to list it
		try {
			const proc = Bun.spawn(["test", "-d", fullPath], {
				stdout: "pipe",
				stderr: "pipe",
			});
			await proc.exited;

			if (proc.exitCode === 0) {
				const subLines = await buildTree(fullPath, entry, depth + 1, maxDepth);
				lines.push(...subLines);
			} else {
				lines.push(`${indent}  ${entry}`);
			}
		} catch {
			lines.push(`${indent}  ${entry}`);
		}
	}

	return lines;
}
