import type { GitData } from "../types";

interface GitCommit {
	hash: string;
	message: string;
	date: string;
}

/**
 * Runs git log to collect recent commits globally and per-scope.
 * Uses Bun.spawn for git commands.
 */
export async function collectGit(
	monorepoRoot: string,
	scopePaths: string[] = [],
): Promise<GitData> {
	const result: GitData = {
		recentCommits: [],
		perScopeCommits: {},
	};

	// Global recent commits
	result.recentCommits = await runGitLog(monorepoRoot, 20);

	// Per-scope commits
	for (const scopePath of scopePaths) {
		const commits = await runGitLog(monorepoRoot, 10, scopePath);
		if (commits.length > 0) {
			result.perScopeCommits[scopePath] = commits;
		}
	}

	return result;
}

async function runGitLog(cwd: string, count: number, path?: string): Promise<GitCommit[]> {
	const args = ["log", "--oneline", `-${count}`, "--format=%h|%s|%ai"];

	if (path) {
		args.push("--", path);
	}

	try {
		const proc = Bun.spawn(["git", ...args], {
			cwd,
			stdout: "pipe",
			stderr: "pipe",
		});

		const output = await new Response(proc.stdout).text();
		await proc.exited;

		if (!output.trim()) return [];

		return output
			.trim()
			.split("\n")
			.map((line) => {
				const [hash = "", message = "", date = ""] = line.split("|", 3);
				return { hash, message, date };
			});
	} catch {
		console.warn(`[git-collector] Failed to run git log${path ? ` for ${path}` : ""}`);
		return [];
	}
}
