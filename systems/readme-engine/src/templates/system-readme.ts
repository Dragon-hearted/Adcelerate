import {
	type TocEntry,
	detectTechStack,
	parseRoutes,
	pathsToTree,
	renderApiReference,
	renderArchitecture,
	renderBadges,
	renderGifReferences,
	renderProjectStructure,
	renderScopeChangelog,
	renderTechStack,
	renderToc,
} from "../renderers";
import type { CodeData, GitData, GraphData, ReadmeSection, SystemData } from "../types";
import { centeredHero, svgHero, contributing, footer, license } from "./shared-sections";

interface SystemTemplateData {
	system: SystemData;
	graph: GraphData;
	git: GitData;
	code: CodeData;
	monorepoRoot: string;
}

/** Build a per-system README matching Pinboard visual quality */
export async function systemReadme(data: SystemTemplateData): Promise<ReadmeSection[]> {
	const { system, graph, git, code, monorepoRoot } = data;
	const sections: ReadmeSection[] = [];
	let order = 0;

	// Merge sub-package deps for systems with server/client layout
	const mergedPkg = await mergeSubPackages(system, monorepoRoot);

	// --- Hero ---
	const badgeSystem = mergedPkg ? { ...system, packageJson: mergedPkg } : system;
	const badgesRaw = renderBadges(badgeSystem);
	// Strip wrapping <div align="center"> since centeredHero already wraps
	const badges = badgesRaw.replace(/^<div align="center">\n\n/, "").replace(/\n\n<\/div>$/, "");
	const firstSentence = extractFirstSentence(system.description);

	sections.push({
		name: "hero",
		order: order++,
		content: svgHero(system.name, firstSentence, badges),
	});

	// --- Demo GIFs ---
	const systemPath = `${monorepoRoot}/${system.path}`;
	const gifContent = await renderGifReferences(systemPath);
	if (!gifContent.startsWith("<!--")) {
		sections.push({
			name: "demo",
			order: order++,
			content: `## 📽️ Demo\n\n${gifContent}`,
		});
	}

	// --- Build TOC entries based on which sections will exist ---
	const tocEntries: TocEntry[] = [];
	tocEntries.push({ emoji: "✨", title: "Features" });
	tocEntries.push({ emoji: "🏗", title: "Architecture" });
	tocEntries.push({ emoji: "🛠", title: "Tech Stack" });
	tocEntries.push({ emoji: "🚀", title: "Getting Started" });
	tocEntries.push({ emoji: "💻", title: "Development" });

	// Check if API reference will exist
	const hasApi = await detectApiRoutes(systemPath);
	if (hasApi) {
		tocEntries.push({ emoji: "📡", title: "API Reference" });
	}

	tocEntries.push({ emoji: "📂", title: "Project Structure" });
	tocEntries.push({ emoji: "🤝", title: "Contributing" });
	tocEntries.push({ emoji: "📄", title: "License" });

	sections.push({
		name: "toc",
		order: order++,
		content: `## 📑 Table of Contents\n\n${renderToc(tocEntries)}`,
	});

	// --- Features ---
	if (system.taskTypes.length > 0 || system.inputTypes.length > 0) {
		const featureRows: string[] = [];

		for (const task of system.taskTypes) {
			featureRows.push(`| **${task}** | Core task type |`);
		}
		for (const input of system.inputTypes) {
			featureRows.push(`| **${input} Input** | Supported input type |`);
		}
		for (const output of system.outputTypes) {
			featureRows.push(`| **${output} Output** | Supported output type |`);
		}

		if (featureRows.length > 0) {
			sections.push({
				name: "features",
				order: order++,
				content: [
					"## ✨ Features",
					"",
					"| Feature | Description |",
					"|---------|-------------|",
					...featureRows,
				].join("\n"),
			});
		}
	}

	// --- Architecture ---
	if (system.stages.length > 0) {
		const archContent = [
			"## 🏗 Architecture",
			"",
			"![Pipeline](images/pipeline.svg)",
			"",
			`${system.name} processes data through a multi-stage pipeline.`,
		];

		sections.push({
			name: "architecture",
			order: order++,
			content: archContent.join("\n"),
		});
	} else {
		sections.push({
			name: "architecture",
			order: order++,
			content: [
				"## 🏗 Architecture",
				"",
				`${system.name} is a self-contained system within the Adcelerate monorepo.`,
			].join("\n"),
		});
	}

	// --- Tech Stack ---
	const techPkg = mergedPkg ?? system.packageJson;
	if (techPkg) {
		const techStack = detectTechStack(techPkg);
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
			"### Prerequisites",
			"",
			"- [**Bun**](https://bun.sh/) v1.0+ — `curl -fsSL https://bun.sh/install | bash`",
			"",
			"### Install",
			"",
			"```bash",
			`cd ${system.path}`,
			"bun install",
			"```",
			"",
			"### Run",
			"",
			"```bash",
			system.entryPoint ? `bun run ${system.entryPoint}` : "bun run dev",
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
			"| `bun run dev` | Start development mode |",
			"| `bun run build` | Build for production |",
			"| `bun test` | Run tests |",
			"| `bun run lint` | Check code quality |",
		].join("\n"),
	});

	// --- API Reference ---
	if (hasApi) {
		const apiContent = await buildApiReference(systemPath);
		if (apiContent) {
			sections.push({
				name: "api-reference",
				order: order++,
				content: `## 📡 API Reference\n\n${apiContent}`,
			});
		}
	}

	// --- Project Structure ---
	const systemTree = await buildSystemTree(systemPath);
	if (systemTree) {
		sections.push({
			name: "project-structure",
			order: order++,
			content: `## 📂 Project Structure\n\n${systemTree}`,
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
	const techNames = detectMainTechs(mergedPkg ?? system.packageJson);
	sections.push({
		name: "footer",
		order: order++,
		content: footer(`🧡 **using ${techNames}**`),
	});

	return sections;
}

/** Pick an emoji based on domain tags */
function pickEmoji(tags: string[]): string {
	const tagStr = tags.join(" ").toLowerCase();
	if (tagStr.includes("image") || tagStr.includes("visual")) return "🎨";
	if (tagStr.includes("video") || tagStr.includes("media")) return "🎬";
	if (tagStr.includes("caption") || tagStr.includes("subtitle")) return "📝";
	if (tagStr.includes("scrape") || tagStr.includes("crawl")) return "🕸️";
	if (tagStr.includes("docs") || tagStr.includes("readme")) return "📖";
	return "⚡";
}

/** Detect if the system has Hono API routes — search src/ and server/src/ */
async function detectApiRoutes(systemPath: string): Promise<boolean> {
	const searchDirs = [`${systemPath}/src`, `${systemPath}/server/src`];
	for (const dir of searchDirs) {
		try {
			const proc = Bun.spawn(["find", dir, "-name", "*.ts", "-path", "*/routes/*"], {
				stdout: "pipe",
				stderr: "pipe",
			});
			const output = await new Response(proc.stdout).text();
			await proc.exited;
			if (output.trim()) return true;
		} catch {
			// dir doesn't exist
		}
	}
	return false;
}

/** Build API reference by scanning route files in src/ and server/src/ */
async function buildApiReference(systemPath: string): Promise<string | null> {
	const searchDirs = [`${systemPath}/src`, `${systemPath}/server/src`];
	const allEndpoints: ReturnType<typeof parseRoutes> = [];

	for (const dir of searchDirs) {
		try {
			const proc = Bun.spawn(["find", dir, "-name", "*.ts", "-path", "*/routes/*"], {
				stdout: "pipe",
				stderr: "pipe",
			});
			const output = await new Response(proc.stdout).text();
			await proc.exited;

			const files = output.trim().split("\n").filter(Boolean);
			for (const file of files) {
				const content = await Bun.file(file).text();
				const endpoints = parseRoutes(content, file);
				allEndpoints.push(...endpoints);
			}
		} catch {
			// dir doesn't exist
		}
	}

	if (allEndpoints.length === 0) return null;
	return renderApiReference(allEndpoints);
}

/** Extract main technology names for footer */
function detectMainTechs(packageJson: Record<string, unknown> | null): string {
	if (!packageJson) return "Bun and TypeScript";

	const deps = {
		...(packageJson.dependencies as Record<string, string> | undefined),
		...(packageJson.devDependencies as Record<string, string> | undefined),
	};

	const techs: string[] = ["Bun"];
	if (deps.react) techs.push("React");
	if (deps.hono) techs.push("Hono");
	if (deps.remotion || deps["@remotion/cli"]) techs.push("Remotion");
	if (deps.typescript) techs.push("TypeScript");

	if (techs.length === 1) techs.push("TypeScript");
	return techs.join(", ");
}

/** Extract first sentence handling domain names like "fal.ai" */
function extractFirstSentence(text: string): string {
	// Split on period followed by space or end of string, but not on domain-like patterns
	const match = text.match(/^(.+?(?<!\w\.\w)(?<![A-Z]))\.\s/);
	return match ? match[1] : text;
}

/** Merge server/package.json and client/package.json for systems with sub-packages */
async function mergeSubPackages(
	system: SystemData,
	monorepoRoot: string,
): Promise<Record<string, unknown> | null> {
	const systemPath = `${monorepoRoot}/${system.path}`;
	const subDirs = ["server", "client"];
	const mergedDeps: Record<string, string> = {};
	const mergedDevDeps: Record<string, string> = {};
	let found = false;

	for (const sub of subDirs) {
		try {
			const pkg = (await Bun.file(`${systemPath}/${sub}/package.json`).json()) as Record<
				string,
				unknown
			>;
			const deps = pkg.dependencies as Record<string, string> | undefined;
			const devDeps = pkg.devDependencies as Record<string, string> | undefined;
			if (deps) Object.assign(mergedDeps, deps);
			if (devDeps) Object.assign(mergedDevDeps, devDeps);
			found = true;
		} catch {
			// sub-package doesn't exist
		}
	}

	if (!found) return null;

	// Merge with root package.json deps if present
	if (system.packageJson) {
		const rootDeps = system.packageJson.dependencies as Record<string, string> | undefined;
		const rootDevDeps = system.packageJson.devDependencies as Record<string, string> | undefined;
		if (rootDeps) Object.assign(mergedDeps, rootDeps);
		if (rootDevDeps) Object.assign(mergedDevDeps, rootDevDeps);
	}

	return {
		...(system.packageJson || {}),
		dependencies: mergedDeps,
		devDependencies: mergedDevDeps,
	};
}

/** Build a project tree specific to a system directory */
async function buildSystemTree(systemPath: string): Promise<string | null> {
	try {
		// Prefer git ls-files: respects .gitignore, works for both submodules and standalone repos
		const gitProc = Bun.spawn(
			["git", "-C", systemPath, "ls-files", "--", "."],
			{ stdout: "pipe", stderr: "pipe" },
		);
		const gitOutput = await new Response(gitProc.stdout).text();
		const gitExitCode = await gitProc.exited;

		let paths: string[];

		if (gitExitCode === 0 && gitOutput.trim()) {
			// git ls-files succeeded — filter for maxdepth 3 equivalent and unwanted files
			paths = gitOutput
				.trim()
				.split("\n")
				.filter(
					(p) =>
						p &&
						!p.startsWith(".") &&
						p.split("/").length <= 3 &&
						!p.endsWith("/bun.lock") &&
						p !== "bun.lock" &&
						!p.endsWith(".tsbuildinfo"),
				)
				.sort();
		} else {
			// Fallback: git not available or not a repo — use find with manual exclusions
			const findProc = Bun.spawn(
				[
					"find",
					systemPath,
					"-maxdepth",
					"3",
					"-type",
					"f",
					"-not",
					"-path",
					"*/node_modules/*",
					"-not",
					"-path",
					"*/.git/*",
					"-not",
					"-path",
					"*/dist/*",
					"-not",
					"-name",
					"bun.lock",
					"-not",
					"-name",
					".DS_Store",
					"-not",
					"-name",
					"*.tsbuildinfo",
				],
				{ stdout: "pipe", stderr: "pipe" },
			);
			const findOutput = await new Response(findProc.stdout).text();
			await findProc.exited;

			if (!findOutput.trim()) return null;

			paths = findOutput
				.trim()
				.split("\n")
				.map((p) => p.replace(`${systemPath}/`, ""))
				.filter((p) => p && p !== systemPath && !p.startsWith("."))
				.sort();
		}

		if (paths.length === 0) return null;

		const treeEntries = pathsToTree(paths);
		const systemName = systemPath.split("/").pop() || "system";
		return renderProjectStructure(systemName, treeEntries);
	} catch {
		return null;
	}
}
