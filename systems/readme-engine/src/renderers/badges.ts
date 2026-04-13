import type { SystemData } from "../types";

interface BadgeConfig {
	label: string;
	color: string;
	logo: string;
	logoColor?: string;
}

const KNOWN_BADGES: Record<string, BadgeConfig> = {
	typescript: {
		label: "TypeScript",
		color: "3178C6",
		logo: "typescript",
		logoColor: "white",
	},
	bun: {
		label: "Bun",
		color: "f9f1e1",
		logo: "bun",
		logoColor: "000",
	},
	react: {
		label: "React",
		color: "61DAFB",
		logo: "react",
		logoColor: "000",
	},
	hono: {
		label: "Hono",
		color: "E36002",
		logo: "hono",
		logoColor: "white",
	},
	"better-sqlite3": {
		label: "SQLite",
		color: "003B57",
		logo: "sqlite",
		logoColor: "white",
	},
	sqlite3: {
		label: "SQLite",
		color: "003B57",
		logo: "sqlite",
		logoColor: "white",
	},
	tailwindcss: {
		label: "Tailwind CSS",
		color: "06B6D4",
		logo: "tailwindcss",
		logoColor: "white",
	},
	remotion: {
		label: "Remotion",
		color: "0B84F3",
		logo: "remotion",
		logoColor: "white",
	},
	vite: {
		label: "Vite",
		color: "646CFF",
		logo: "vite",
		logoColor: "white",
	},
	playwright: {
		label: "Playwright",
		color: "2EAD33",
		logo: "playwright",
		logoColor: "white",
	},
};

const STATUS_COLORS: Record<string, string> = {
	active: "brightgreen",
	beta: "yellow",
	alpha: "orange",
	planned: "lightgrey",
	deprecated: "red",
};

function shieldsUrl(
	label: string,
	message: string,
	color: string,
	logo?: string,
	logoColor?: string,
): string {
	const encodedLabel = encodeURIComponent(label);
	const encodedMessage = encodeURIComponent(message);
	let url = `https://img.shields.io/badge/${encodedLabel}-${encodedMessage}-${color}`;
	if (logo) {
		url += `?logo=${logo}`;
		if (logoColor) url += `&logoColor=${logoColor}`;
	}
	return url;
}

function badgeMarkdown(alt: string, url: string, link?: string): string {
	const img = `![${alt}](${url})`;
	return link ? `[${img}](${link})` : img;
}

function detectVersion(packageJson: Record<string, unknown>, pkg: string): string | null {
	const deps = packageJson.dependencies as Record<string, string> | undefined;
	const devDeps = packageJson.devDependencies as Record<string, string> | undefined;
	const version = deps?.[pkg] ?? devDeps?.[pkg];
	if (!version) return null;
	return version.replace(/[\^~>=<]/g, "").split(".")[0];
}

/**
 * Generate shields.io badge markdown from package.json dependencies and system status.
 * Returns centered badge row matching Pinboard README style.
 */
export function renderBadges(system: SystemData): string {
	const badges: string[] = [];

	// Status badge
	const statusColor = STATUS_COLORS[system.status.toLowerCase()] ?? "lightgrey";
	badges.push(badgeMarkdown("Status", shieldsUrl("Status", system.status, statusColor)));

	if (!system.packageJson) {
		return wrapCentered(badges);
	}

	const pkg = system.packageJson;

	// TypeScript version badge
	const tsVersion = detectVersion(pkg, "typescript");
	if (tsVersion) {
		const cfg = KNOWN_BADGES.typescript;
		badges.push(
			badgeMarkdown(
				cfg.label,
				shieldsUrl(cfg.label, tsVersion, cfg.color, cfg.logo, cfg.logoColor),
				"https://www.typescriptlang.org/",
			),
		);
	}

	// Other known badges
	for (const [pkgName, cfg] of Object.entries(KNOWN_BADGES)) {
		if (pkgName === "typescript") continue;
		const version = detectVersion(pkg, pkgName);
		if (version) {
			badges.push(
				badgeMarkdown(
					cfg.label,
					shieldsUrl(cfg.label, version, cfg.color, cfg.logo, cfg.logoColor),
				),
			);
		}
	}

	// Bun badge — check runtime/engine fields or if bun-types is a devDep
	if (!badges.some((b) => b.includes("Bun"))) {
		const devDeps = pkg.devDependencies as Record<string, string> | undefined;
		if (devDeps?.["@types/bun"] || devDeps?.["bun-types"]) {
			const cfg = KNOWN_BADGES.bun;
			badges.push(
				badgeMarkdown(
					cfg.label,
					shieldsUrl(cfg.label, "Runtime", cfg.color, cfg.logo, cfg.logoColor),
					"https://bun.sh/",
				),
			);
		}
	}

	return wrapCentered(badges);
}

function wrapCentered(badges: string[]): string {
	if (badges.length === 0) return "";
	return `<div align="center">\n\n${badges.join("\n")}\n\n</div>`;
}
