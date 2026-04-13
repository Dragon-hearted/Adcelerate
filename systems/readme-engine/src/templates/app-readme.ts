import {
	type TocEntry,
	detectTechStack,
	pathsToTree,
	renderProjectStructure,
	renderTechStack,
	renderToc,
} from "../renderers";
import type { AppData, CodeData, ReadmeSection } from "../types";
import { centeredHero, contributing, footer, license } from "./shared-sections";

interface AppTemplateData {
	app: AppData;
	code: CodeData;
}

/** Build a lightweight README for an app */
export function appReadme(data: AppTemplateData): ReadmeSection[] {
	const { app, code } = data;
	const sections: ReadmeSection[] = [];
	let order = 0;

	// --- Hero ---
	const appDescription = (app.packageJson?.description as string) || `${app.name} application`;

	sections.push({
		name: "hero",
		order: order++,
		content: centeredHero(`🚀 ${app.name}`, appDescription, ""),
	});

	// --- TOC ---
	const tocEntries: TocEntry[] = [
		{ emoji: "📖", title: "Overview" },
		{ emoji: "🛠", title: "Tech Stack" },
		{ emoji: "🚀", title: "Getting Started" },
		{ emoji: "💻", title: "Development" },
		{ emoji: "📂", title: "Project Structure" },
		{ emoji: "🤝", title: "Contributing" },
		{ emoji: "📄", title: "License" },
	];

	sections.push({
		name: "toc",
		order: order++,
		content: `## 📑 Table of Contents\n\n${renderToc(tocEntries)}`,
	});

	// --- Overview ---
	sections.push({
		name: "overview",
		order: order++,
		content: `## 📖 Overview\n\n${appDescription}`,
	});

	// --- Tech Stack ---
	if (app.packageJson) {
		const techStack = detectTechStack(app.packageJson);
		const rendered = renderTechStack(techStack);
		if (rendered) {
			sections.push({
				name: "tech-stack",
				order: order++,
				content: `## 🛠 Tech Stack\n\n${rendered}`,
			});
		}
	}

	// --- Getting Started ---
	sections.push({
		name: "getting-started",
		order: order++,
		content: [
			"## 🚀 Getting Started",
			"",
			"```bash",
			`cd ${app.path}`,
			"bun install",
			"bun run dev",
			"```",
		].join("\n"),
	});

	// --- Development ---
	sections.push({
		name: "development",
		order: order++,
		content: [
			"## 💻 Development",
			"",
			"| Command | Description |",
			"|---------|-------------|",
			"| `bun run dev` | Start development server |",
			"| `bun run build` | Build for production |",
			"| `bun test` | Run tests |",
		].join("\n"),
	});

	// --- Project Structure ---
	if (app.sourceTree) {
		const treeEntries = pathsToTree(
			app.sourceTree
				.split("\n")
				.filter(Boolean)
				.map((l) => l.replace(/^\s+/, "")),
		);
		const rendered = renderProjectStructure(app.name, treeEntries);
		sections.push({
			name: "project-structure",
			order: order++,
			content: `## 📂 Project Structure\n\n${rendered}`,
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
		content: footer("🧡 **Adcelerate**"),
	});

	return sections;
}
