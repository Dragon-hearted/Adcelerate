import {
	type TechStackData,
	type TocEntry,
	type TreeEntry,
	dependencyGraph,
	detectTechStack,
	pathsToTree,
	platformOverview,
	renderBadges,
	renderChangelog,
	renderProjectStructure,
	renderTechStack,
	renderToc,
} from "../renderers";
import type {
	CodeData,
	GitData,
	GraphData,
	LibraryData,
	ReadmeSection,
	SystemData,
} from "../types";
import { centeredHero, svgHero, contributing, footer, license } from "./shared-sections";

interface RootTemplateData {
	systems: SystemData[];
	graph: GraphData;
	library: LibraryData;
	git: GitData;
	code: CodeData;
}

/** Build the root monorepo README from collected data */
export function rootReadme(data: RootTemplateData): ReadmeSection[] {
	const sections: ReadmeSection[] = [];
	let order = 0;

	// --- Hero ---
	const heroBadges = [
		"[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)",
		"[![Bun](https://img.shields.io/badge/Bun-Runtime-f9f1e1?logo=bun&logoColor=000)](https://bun.sh/)",
		"[![License: MIT](https://img.shields.io/badge/License-MIT-e07a5f.svg)](LICENSE)",
	].join("\n");

	sections.push({
		name: "hero",
		order: order++,
		content: svgHero("Adcelerate", "AI-Powered Marketing & Media Platform", heroBadges),
	});

	// --- Overview ---
	sections.push({
		name: "overview",
		order: order++,
		content:
			"Adcelerate is a monorepo powering an AI-driven marketing and media platform. It houses multiple systems — from image generation studios to video pipelines — along with a rich library of skills, agents, and commands orchestrated through Claude Code.",
	});

	// --- TOC ---
	const tocEntries: TocEntry[] = [
		{ emoji: "📦", title: "Systems" },
		{ emoji: "🏗", title: "Architecture" },
		{ emoji: "🛠", title: "Tech Stack" },
		{ emoji: "📚", title: "Library" },
		{ emoji: "🚀", title: "Getting Started" },
		{ emoji: "📂", title: "Project Structure" },
		{ emoji: "📝", title: "Recent Changes" },
		{ emoji: "🤝", title: "Contributing" },
		{ emoji: "📄", title: "License" },
	];

	sections.push({
		name: "toc",
		order: order++,
		content: `## 📑 Table of Contents\n\n${renderToc(tocEntries)}`,
	});

	// --- Systems Directory ---
	if (data.systems.length > 0) {
		const tableRows = data.systems.map((sys) => {
			const statusBadge = `![${sys.status}](https://img.shields.io/badge/Status-${encodeURIComponent(sys.status)}-${sys.status === "active" ? "brightgreen" : "lightgrey"})`;
			return `| [**${sys.name}**](${sys.path}) | ${sys.description || "—"} | ${statusBadge} |`;
		});

		sections.push({
			name: "systems",
			order: order++,
			content: [
				"## 📦 Systems",
				"",
				"| System | Description | Status |",
				"|--------|-------------|--------|",
				...tableRows,
			].join("\n"),
		});
	}

	// --- Architecture (dependency graph) ---
	if (Object.keys(data.graph.systems).length > 0) {
		const depGraph = dependencyGraph(data.graph);
		const platOverview = platformOverview(data.systems);

		const archContent = ["## 🏗 Architecture", "", "![Platform Overview](images/platform-overview.svg)", "", "### Dependency Topology", "", depGraph];

		if (platOverview) {
			archContent.push("", "### Platform Overview", "", platOverview);
		}

		sections.push({
			name: "architecture",
			order: order++,
			content: archContent.join("\n"),
		});
	}

	// --- Tech Stack (aggregated) ---
	const aggregatedStack = aggregateTechStack(data.systems);
	if (aggregatedStack.frontend.length > 0 || aggregatedStack.backend.length > 0) {
		sections.push({
			name: "tech-stack",
			order: order++,
			content: `## 🛠 Tech Stack\n\n${renderTechStack(aggregatedStack)}`,
		});
	}

	// --- Library catalog ---
	if (data.library.skillCount > 0 || data.library.agentCount > 0) {
		const libLines = [
			"## 📚 Library",
			"",
			"| Category | Count |",
			"|----------|-------|",
			`| Skills | ${data.library.skillCount} |`,
			`| Agents | ${data.library.agentCount} |`,
			`| Commands | ${data.library.commandCount} |`,
		];

		if (data.library.topSkills.length > 0) {
			libLines.push(
				"",
				"### Top Skills",
				"",
				"| Skill | Description |",
				"|-------|-------------|",
				...data.library.topSkills.map((s) => `| **${s.name}** | ${s.description} |`),
			);
		}

		if (data.library.topAgents.length > 0) {
			libLines.push(
				"",
				"### Top Agents",
				"",
				"| Agent | Description |",
				"|-------|-------------|",
				...data.library.topAgents.map((a) => `| **${a.name}** | ${a.description} |`),
			);
		}

		sections.push({
			name: "library",
			order: order++,
			content: libLines.join("\n"),
		});
	}

	// --- Getting Started ---
	sections.push({
		name: "getting-started",
		order: order++,
		content: [
			"## 🚀 Getting Started",
			"",
			"### Prerequisites",
			"",
			"- [**Bun**](https://bun.sh/) v1.0+ — `curl -fsSL https://bun.sh/install | bash`",
			"- [**just**](https://github.com/casey/just) — command runner",
			"",
			"### Install",
			"",
			"```bash",
			"# Clone the repository",
			"git clone --recursive https://github.com/adcelerate/adcelerate.git",
			"cd adcelerate",
			"",
			"# Run setup",
			"just install",
			"```",
		].join("\n"),
	});

	// --- Project Structure ---
	const rootTree: TreeEntry[] = [
		{
			name: "systems/",
			description: "Independent processing systems",
			children: data.systems.map((s) => ({
				name: `${s.name}/`,
				description: extractShortDesc(s.description),
			})),
		},
		{ name: "apps/", description: "Deployable applications" },
		{ name: "knowledge/", description: "Shared knowledge base" },
		{ name: "scripts/", description: "Automation scripts" },
		{ name: "docs/", description: "Documentation" },
		{ name: "justfile", description: "Command runner recipes" },
		{ name: "systems.yaml", description: "System registry" },
		{ name: "library.yaml", description: "Skills & agents catalog" },
	];

	sections.push({
		name: "project-structure",
		order: order++,
		content: `## 📂 Project Structure\n\n${renderProjectStructure("adcelerate", rootTree)}`,
	});

	// --- Recent Changes ---
	const changelogContent = renderChangelog(data.git);
	if (changelogContent) {
		sections.push({
			name: "recent-changes",
			order: order++,
			content: `## 📝 Recent Changes\n\n${changelogContent}`,
		});
	}

	// --- Contributing ---
	sections.push({
		name: "contributing",
		order: order++,
		content: contributing(),
	});

	// --- License ---
	sections.push({
		name: "license",
		order: order++,
		content: license(),
	});

	// --- Footer ---
	sections.push({
		name: "footer",
		order: order++,
		content: footer("🧡 **using Bun, TypeScript, and Claude Code**"),
	});

	return sections;
}

/** Aggregate tech stacks from all systems that have a package.json */
function aggregateTechStack(systems: SystemData[]): TechStackData {
	// Deduplicate by base technology name (without version)
	const seenBase = new Set<string>();
	const frontend: TechStackData["frontend"] = [];
	const backend: TechStackData["backend"] = [];

	for (const sys of systems) {
		if (!sys.packageJson) continue;
		const stack = detectTechStack(sys.packageJson);

		for (const entry of stack.frontend) {
			const baseName = entry.technology.replace(/\s+\d+.*$/, "");
			if (!seenBase.has(baseName)) {
				seenBase.add(baseName);
				frontend.push(entry);
			}
		}

		for (const entry of stack.backend) {
			const baseName = entry.technology.replace(/\s+\d+.*$/, "");
			if (!seenBase.has(baseName)) {
				seenBase.add(baseName);
				backend.push(entry);
			}
		}
	}

	return { frontend, backend };
}

/** Extract a short description, handling domain names like fal.ai */
function extractShortDesc(text: string): string | undefined {
	// Split on period followed by space, not on domain-like patterns
	const match = text.match(/^(.+?(?<!\w\.\w)(?<![A-Z]))\.\s/);
	const result = match ? match[1] : text;
	// Truncate if too long for tree display
	return result.length > 80 ? `${result.slice(0, 77)}...` : result || undefined;
}
