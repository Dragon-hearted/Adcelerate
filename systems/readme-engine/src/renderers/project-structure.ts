export interface TreeEntry {
	name: string;
	description?: string;
	children?: TreeEntry[];
}

/**
 * Render a directory tree view using standard tree-drawing characters.
 * Matches the Pinboard README's project structure format.
 */
export function renderProjectStructure(root: string, entries: TreeEntry[]): string {
	const lines: string[] = [`${root}/`];

	function renderEntries(items: TreeEntry[], prefix: string): void {
		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			const isLast = i === items.length - 1;
			const connector = isLast ? "└── " : "├── ";
			const childPrefix = isLast ? "    " : "│   ";

			const desc = item.description
				? `${" ".repeat(Math.max(1, 24 - item.name.length))}# ${item.description}`
				: "";
			lines.push(`${prefix}${connector}${item.name}${desc}`);

			if (item.children && item.children.length > 0) {
				renderEntries(item.children, `${prefix}${childPrefix}`);
			}
		}
	}

	renderEntries(entries, "");

	return `\`\`\`\n${lines.join("\n")}\n\`\`\``;
}

/**
 * Build a TreeEntry array from a flat list of paths (e.g. from `find` or glob).
 * Paths should be relative to the project root.
 */
export function pathsToTree(paths: string[]): TreeEntry[] {
	const root: TreeEntry[] = [];

	for (const path of paths) {
		const parts = path.split("/").filter(Boolean);
		let current = root;

		for (let i = 0; i < parts.length; i++) {
			const part = parts[i];
			let existing = current.find((e) => e.name === part);
			if (!existing) {
				existing = { name: part };
				if (i < parts.length - 1) {
					existing.children = [];
				}
				current.push(existing);
			}
			if (existing.children) {
				current = existing.children;
			}
		}
	}

	return root;
}
