export interface TocEntry {
	emoji: string;
	title: string;
	anchor?: string;
}

/**
 * Generate GitHub-compatible anchor from a title string.
 * Lowercase, replace spaces with hyphens, strip non-alphanumeric (except hyphens),
 * and strip emoji for anchor but keep in display.
 */
function toAnchor(title: string): string {
	return title
		.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "")
		.trim()
		.toLowerCase()
		.replace(/[^\w\s-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");
}

/**
 * Generate a table of contents from section headers.
 * Produces a GitHub-compatible markdown list with anchor links.
 */
export function renderToc(entries: TocEntry[]): string {
	if (entries.length === 0) return "";

	const lines = entries.map((entry) => {
		const anchor = entry.anchor ?? toAnchor(entry.title);
		const display = entry.emoji ? `${entry.emoji} ${entry.title}` : entry.title;
		return `- [${display}](#${anchor})`;
	});

	return lines.join("\n");
}
