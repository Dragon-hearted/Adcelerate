import { readdir, stat } from "node:fs/promises";
import { relative, resolve } from "node:path";
import type { ReadmeScope, SectionFingerprint } from "../types";

const PROJECT_ROOT = resolve(import.meta.dir, "../../../..");
const FINGERPRINT_PATH = resolve(import.meta.dir, "../../.fingerprints.json");

/** Knowledge source files that feed README generation, grouped by section */
const KNOWLEDGE_SOURCES: Record<string, string[]> = {
	overview: ["systems.yaml", "library.yaml"],
	architecture: ["knowledge/graph.yaml", "systems.yaml"],
	systems: ["systems.yaml"],
	library: ["library.yaml"],
	graph: ["knowledge/graph.yaml"],
};

/** Stored fingerprint map: key = "scope:section", value = SectionFingerprint */
export type FingerprintStore = Record<string, SectionFingerprint>;

/** Hash file contents using Bun's native CryptoHasher */
async function hashFile(path: string): Promise<string> {
	try {
		const file = Bun.file(path);
		const content = await file.arrayBuffer();
		const hasher = new Bun.CryptoHasher("sha256");
		hasher.update(new Uint8Array(content));
		return hasher.digest("hex");
	} catch {
		return "missing";
	}
}

/** Hash a string directly */
function hashString(content: string): string {
	const hasher = new Bun.CryptoHasher("sha256");
	hasher.update(content);
	return hasher.digest("hex");
}

/** Resolve knowledge source paths relative to project root */
function resolveSourcePaths(patterns: string[]): string[] {
	return patterns.map((p) => resolve(PROJECT_ROOT, p));
}

/** Discover per-system knowledge files */
async function discoverSystemKnowledge(): Promise<string[]> {
	const systemsDir = resolve(PROJECT_ROOT, "systems");
	const paths: string[] = [];
	try {
		const entries = await readdir(systemsDir, { withFileTypes: true });
		for (const entry of entries) {
			if (entry.isDirectory()) {
				const knowledgeDir = resolve(systemsDir, entry.name, "knowledge");
				try {
					const knowledgeFiles = await readdir(knowledgeDir);
					for (const kf of knowledgeFiles) {
						paths.push(resolve(knowledgeDir, kf));
					}
				} catch {
					// No knowledge dir for this system
				}
				// Also check package.json
				const pkgPath = resolve(systemsDir, entry.name, "package.json");
				try {
					await stat(pkgPath);
					paths.push(pkgPath);
				} catch {
					// No package.json
				}
			}
		}
	} catch {
		// systems/ dir doesn't exist
	}
	return paths;
}

/** Discover app package.json files */
async function discoverAppPackages(): Promise<string[]> {
	const appsDir = resolve(PROJECT_ROOT, "apps");
	const paths: string[] = [];
	try {
		const entries = await readdir(appsDir, { withFileTypes: true });
		for (const entry of entries) {
			if (entry.isDirectory()) {
				const pkgPath = resolve(appsDir, entry.name, "package.json");
				try {
					await stat(pkgPath);
					paths.push(pkgPath);
				} catch {
					// No package.json
				}
			}
		}
	} catch {
		// apps/ dir doesn't exist
	}
	return paths;
}

/** Get all source files relevant to a scope */
async function getSourceFilesForScope(scope: ReadmeScope): Promise<Record<string, string[]>> {
	const sections: Record<string, string[]> = {};

	if (scope.type === "root") {
		// Root README uses all knowledge sources
		for (const [section, patterns] of Object.entries(KNOWLEDGE_SOURCES)) {
			sections[section] = resolveSourcePaths(patterns);
		}
		// Add per-system knowledge and package.json files
		const systemFiles = await discoverSystemKnowledge();
		const appFiles = await discoverAppPackages();
		sections.systems = [...(sections.systems || []), ...systemFiles];
		sections.apps = appFiles;
	} else if (scope.type === "system" && scope.name) {
		const systemDir = resolve(PROJECT_ROOT, "systems", scope.name);
		const knowledgeDir = resolve(systemDir, "knowledge");
		const knowledgeFiles: string[] = [];
		try {
			const entries = await readdir(knowledgeDir);
			for (const kf of entries) {
				knowledgeFiles.push(resolve(knowledgeDir, kf));
			}
		} catch {
			// No knowledge dir
		}
		const pkgPath = resolve(systemDir, "package.json");
		sections.knowledge = knowledgeFiles;
		sections.config = [pkgPath, resolve(PROJECT_ROOT, "systems.yaml")];
		sections.graph = resolveSourcePaths(["knowledge/graph.yaml"]);
	} else if (scope.type === "app" && scope.name) {
		const appDir = resolve(PROJECT_ROOT, "apps", scope.name);
		sections.config = [resolve(appDir, "package.json")];
		sections.graph = resolveSourcePaths(["knowledge/graph.yaml"]);
	}

	return sections;
}

/** Generate fingerprints for all sections relevant to a scope */
export async function generateFingerprints(scope: ReadmeScope): Promise<SectionFingerprint[]> {
	const sectionSources = await getSourceFilesForScope(scope);
	const fingerprints: SectionFingerprint[] = [];

	for (const [sectionName, files] of Object.entries(sectionSources)) {
		// Hash each file, then combine hashes into a composite hash
		const fileHashes: string[] = [];
		for (const filePath of files) {
			const h = await hashFile(filePath);
			fileHashes.push(h);
		}

		const compositeHash = hashString(fileHashes.sort().join(":"));
		const relFiles = files.map((f) => relative(PROJECT_ROOT, f));

		fingerprints.push({
			sectionName,
			hash: compositeHash,
			sourceFiles: relFiles,
			timestamp: new Date().toISOString(),
		});
	}

	return fingerprints;
}

/** Load stored fingerprints from disk */
export async function loadFingerprints(): Promise<FingerprintStore> {
	try {
		const file = Bun.file(FINGERPRINT_PATH);
		const text = await file.text();
		return JSON.parse(text) as FingerprintStore;
	} catch {
		return {};
	}
}

/** Save fingerprints to disk */
export async function saveFingerprints(store: FingerprintStore): Promise<void> {
	await Bun.write(FINGERPRINT_PATH, JSON.stringify(store, null, 2));
}

/** Build the storage key for a scope+section combo */
export function fingerprintKey(scope: ReadmeScope, section: string): string {
	const scopeId = scope.name ? `${scope.type}:${scope.name}` : scope.type;
	return `${scopeId}/${section}`;
}
