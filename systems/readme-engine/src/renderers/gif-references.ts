import { Glob } from "bun";

/**
 * Scan for demo GIFs at a target path and generate centered img tags.
 * If no demo/ directory or GIFs found, returns an HTML comment placeholder.
 */
export async function renderGifReferences(targetPath: string): Promise<string> {
	const demoPath = `${targetPath}/demo`;
	const demoDir = Bun.file(`${demoPath}/.`);

	// Check if demo directory exists by trying to find GIFs
	const gifs: string[] = [];
	try {
		const glob = new Glob("**/*.gif");
		for await (const file of glob.scan({ cwd: demoPath })) {
			gifs.push(file);
		}
	} catch {
		// demo directory doesn't exist or isn't readable
	}

	if (gifs.length === 0) {
		return "<!-- Demo GIFs: Add a demo/ directory with .gif files to auto-populate this section -->";
	}

	// Sort for consistent output
	gifs.sort();

	const lines: string[] = ['<div align="center">', ""];

	for (const gif of gifs) {
		const name = gif
			.replace(/\.gif$/i, "")
			.replace(/[_-]/g, " ")
			.replace(/\d+\s*/g, "")
			.trim();
		const alt = name || "Demo";
		const relativePath = `./demo/${gif}`;

		lines.push(`<img src="${relativePath}" alt="${alt}" width="720" />`);
		lines.push("");
	}

	lines.push("</div>");

	return lines.join("\n");
}
