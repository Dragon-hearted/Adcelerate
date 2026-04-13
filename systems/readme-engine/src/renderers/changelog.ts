import type { GitData } from "../types";

/**
 * Generate a "Recent Changes" section from git history.
 * Formats as a bullet list with commit hash and message, matching conventional style.
 */
export function renderChangelog(gitData: GitData, maxEntries = 10): string {
	const commits = gitData.recentCommits.slice(0, maxEntries);

	if (commits.length === 0) return "";

	const lines = commits.map((commit) => {
		const shortHash = commit.hash.slice(0, 7);
		return `- \`${shortHash}\` ${commit.message}`;
	});

	return lines.join("\n");
}

/**
 * Generate a per-scope changelog section.
 * Used for system-level READMEs showing only commits relevant to that system.
 */
export function renderScopeChangelog(gitData: GitData, scopeName: string, maxEntries = 10): string {
	const commits = gitData.perScopeCommits[scopeName]?.slice(0, maxEntries) ?? [];

	if (commits.length === 0) return "";

	const lines = commits.map((commit) => {
		const shortHash = commit.hash.slice(0, 7);
		return `- \`${shortHash}\` ${commit.message}`;
	});

	return lines.join("\n");
}
