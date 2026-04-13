export interface TechEntry {
	technology: string;
	purpose: string;
}

export interface TechStackData {
	frontend: TechEntry[];
	backend: TechEntry[];
}

/**
 * Render a markdown table from an array of tech entries.
 */
function renderTable(entries: TechEntry[]): string {
	if (entries.length === 0) return "";

	const lines: string[] = ["| Technology | Purpose |", "|------------|---------|"];

	for (const entry of entries) {
		lines.push(`| **${entry.technology}** | ${entry.purpose} |`);
	}

	return lines.join("\n");
}

const KNOWN_TECH: Record<string, { category: "frontend" | "backend"; purpose: string }> = {
	react: { category: "frontend", purpose: "UI framework" },
	"react-dom": { category: "frontend", purpose: "React DOM renderer" },
	vue: { category: "frontend", purpose: "UI framework" },
	vite: { category: "frontend", purpose: "Build tool & dev server" },
	tailwindcss: { category: "frontend", purpose: "Utility-first styling" },
	remotion: { category: "frontend", purpose: "Programmatic video rendering" },
	"@remotion/cli": { category: "frontend", purpose: "Remotion CLI" },
	hono: { category: "backend", purpose: "Lightweight web framework" },
	express: { category: "backend", purpose: "Web framework" },
	"better-sqlite3": { category: "backend", purpose: "SQLite database" },
	sqlite3: { category: "backend", purpose: "SQLite database" },
	playwright: { category: "backend", purpose: "Browser automation & testing" },
	"js-yaml": { category: "backend", purpose: "YAML parsing" },
	zod: { category: "backend", purpose: "Schema validation" },
};

/**
 * Auto-detect tech stack from package.json dependencies and return categorized tables.
 */
export function detectTechStack(packageJson: Record<string, unknown>): TechStackData {
	const deps = packageJson.dependencies as Record<string, string> | undefined;
	const devDeps = packageJson.devDependencies as Record<string, string> | undefined;
	const allDeps = { ...deps, ...devDeps };

	const frontend: TechEntry[] = [];
	const backend: TechEntry[] = [];

	// TypeScript is always backend/shared
	if (allDeps.typescript) {
		const version = allDeps.typescript
			.replace(/[\^~>=<]/g, "")
			.split(".")
			.slice(0, 2)
			.join(".");
		backend.push({ technology: `TypeScript ${version}`, purpose: "Type safety" });
	}

	// Bun detection
	if (allDeps["@types/bun"] || allDeps["bun-types"]) {
		backend.push({ technology: "Bun", purpose: "JavaScript runtime & package manager" });
	}

	for (const [pkg, version] of Object.entries(allDeps)) {
		const known = KNOWN_TECH[pkg];
		if (!known) continue;

		const cleanVersion = version.replace(/[\^~>=<]/g, "").split(".")[0];
		const entry: TechEntry = {
			technology: `${pkg === "tailwindcss" ? "Tailwind CSS" : pkg.charAt(0).toUpperCase() + pkg.slice(1)} ${cleanVersion}`,
			purpose: known.purpose,
		};

		if (known.category === "frontend") {
			frontend.push(entry);
		} else {
			backend.push(entry);
		}
	}

	return { frontend, backend };
}

/**
 * Generate tech stack tables from package.json analysis.
 * Produces separate Frontend and Backend tables matching Pinboard README style.
 */
export function renderTechStack(data: TechStackData): string {
	const sections: string[] = [];

	if (data.frontend.length > 0) {
		sections.push(`### Frontend\n\n${renderTable(data.frontend)}`);
	}

	if (data.backend.length > 0) {
		sections.push(`### Backend\n\n${renderTable(data.backend)}`);
	}

	return sections.join("\n\n");
}
