import type { AppData } from "../types";

/**
 * Reads each app's package.json under apps/ and scans structure.
 * Returns AppData[] for all discovered apps.
 */
export async function collectApps(monorepoRoot: string): Promise<AppData[]> {
	const results: AppData[] = [];
	const appsDir = `${monorepoRoot}/apps`;

	let appDirs: string[];
	try {
		const proc = Bun.spawn(["ls", appsDir], {
			stdout: "pipe",
			stderr: "pipe",
		});
		const output = await new Response(proc.stdout).text();
		await proc.exited;
		appDirs = output.trim().split("\n").filter(Boolean);
	} catch {
		console.warn("[app-collector] apps/ directory not found");
		return results;
	}

	for (const appName of appDirs) {
		const appPath = `${appsDir}/${appName}`;

		// Check if it's a directory
		try {
			const checkProc = Bun.spawn(["test", "-d", appPath], {
				stdout: "pipe",
				stderr: "pipe",
			});
			await checkProc.exited;
			if (checkProc.exitCode !== 0) continue;
		} catch {
			continue;
		}

		// Read package.json
		let packageJson: Record<string, unknown> | null = null;
		try {
			packageJson = await Bun.file(`${appPath}/package.json`).json();
		} catch {
			// No package.json
		}

		// Build source tree
		let sourceTree = "";
		try {
			const tree = await buildAppTree(appPath, appName, 0, 2);
			sourceTree = tree.join("\n");
		} catch {
			// Can't read app directory
		}

		results.push({
			name: (packageJson?.name as string) || appName,
			path: `apps/${appName}`,
			packageJson,
			sourceTree,
		});
	}

	return results;
}

async function buildAppTree(
	dirPath: string,
	prefix: string,
	depth: number,
	maxDepth: number,
): Promise<string[]> {
	if (depth >= maxDepth) return [];

	const indent = "  ".repeat(depth);
	const lines: string[] = [`${indent}${prefix}/`];

	let entries: string[];
	try {
		const proc = Bun.spawn(["ls", dirPath], {
			stdout: "pipe",
			stderr: "pipe",
		});
		const output = await new Response(proc.stdout).text();
		await proc.exited;
		entries = output.trim().split("\n").filter(Boolean);
	} catch {
		return lines;
	}

	// Skip noise directories
	const skip = new Set(["node_modules", ".git", "dist", "build", ".next", "bun.lock", "logs"]);

	for (const entry of entries.sort()) {
		if (skip.has(entry)) continue;

		const fullPath = `${dirPath}/${entry}`;
		try {
			const checkProc = Bun.spawn(["test", "-d", fullPath], {
				stdout: "pipe",
				stderr: "pipe",
			});
			await checkProc.exited;

			if (checkProc.exitCode === 0) {
				const subLines = await buildAppTree(fullPath, entry, depth + 1, maxDepth);
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
