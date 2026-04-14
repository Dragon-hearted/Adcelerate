/**
 * Model registry operations — read, validate, list, and add models.
 */

import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

const KNOWLEDGE_DIR = resolve(import.meta.dir, "../knowledge/models");
const REGISTRY_PATH = join(KNOWLEDGE_DIR, "_registry.md");
const SCHEMA_PATH = join(KNOWLEDGE_DIR, "_schema.md");

export interface ModelEntry {
	model: string;
	provider: string;
	status: string;
	type: "image" | "video" | "voice";
	file: string;
}

export interface ValidationResult {
	valid: boolean;
	errors: string[];
	warnings: string[];
	modelCount: number;
}

/**
 * Parse the _registry.md markdown tables into structured model entries.
 */
export async function readRegistry(): Promise<ModelEntry[]> {
	const content = await Bun.file(REGISTRY_PATH).text();
	const entries: ModelEntry[] = [];

	let currentType: "image" | "video" | "voice" | null = null;

	for (const line of content.split("\n")) {
		// Detect section headers
		if (line.startsWith("## Image Models")) {
			currentType = "image";
			continue;
		}
		if (line.startsWith("## Video Models")) {
			currentType = "video";
			continue;
		}
		if (line.startsWith("## Voice Models")) {
			currentType = "voice";
			continue;
		}
		if (line.startsWith("## Summary") || line.startsWith("## Adding")) {
			currentType = null;
			continue;
		}

		// Parse table rows (skip header and separator rows)
		if (!currentType) continue;
		if (!line.startsWith("|")) continue;
		if (line.includes("---")) continue;
		if (line.includes("Model") && line.includes("Provider")) continue;

		const cells = line
			.split("|")
			.map((c) => c.trim())
			.filter(Boolean);

		if (cells.length >= 4) {
			entries.push({
				model: cells[0],
				provider: cells[1],
				status: cells[2],
				type: currentType,
				file: cells[3],
			});
		}
	}

	return entries;
}

/**
 * Validate registry consistency: every entry points to a file, every file has an entry.
 */
export async function validateRegistry(): Promise<ValidationResult> {
	const entries = await readRegistry();
	const errors: string[] = [];
	const warnings: string[] = [];

	// Check that every registry entry has a corresponding file
	for (const entry of entries) {
		const filePath = join(KNOWLEDGE_DIR, entry.file);
		if (!existsSync(filePath)) {
			errors.push(`Registry entry "${entry.model}" points to missing file: ${entry.file}`);
			continue;
		}

		// Check that the file has required frontmatter fields
		const content = await Bun.file(filePath).text();
		const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
		if (!frontmatterMatch) {
			errors.push(`Model file ${entry.file} is missing YAML frontmatter`);
			continue;
		}

		const frontmatter = frontmatterMatch[1];
		const requiredFields = ["model", "type", "provider", "status", "lastUpdated"];
		for (const field of requiredFields) {
			if (!frontmatter.includes(`${field}:`)) {
				errors.push(`Model file ${entry.file} is missing frontmatter field: ${field}`);
			}
		}

		// Check required sections
		const requiredSections = [
			"## Overview",
			"## Access",
			"## Constraints",
			"## Prompt Structure",
			"## Best Practices",
			"## Worked Examples",
			"## Failure Modes",
		];
		for (const section of requiredSections) {
			if (!content.includes(section)) {
				warnings.push(`Model file ${entry.file} is missing section: ${section}`);
			}
		}
	}

	// Check for orphan files (files without registry entries)
	const registeredFiles = new Set(entries.map((e) => e.file));
	for (const type of ["image", "video", "voice"] as const) {
		const typeDir = join(KNOWLEDGE_DIR, type);
		if (!existsSync(typeDir)) continue;

		const glob = new Bun.Glob("*.md");
		for await (const file of glob.scan({ cwd: typeDir })) {
			const relativePath = `${type}/${file}`;
			if (!registeredFiles.has(relativePath)) {
				warnings.push(`Orphan file without registry entry: ${relativePath}`);
			}
		}
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings,
		modelCount: entries.length,
	};
}

/**
 * List all registered models, optionally filtered by type.
 */
export async function listModels(typeFilter?: "image" | "video" | "voice"): Promise<ModelEntry[]> {
	const entries = await readRegistry();
	if (typeFilter) {
		return entries.filter((e) => e.type === typeFilter);
	}
	return entries;
}

/**
 * Add a new model by scaffolding from _schema.md template.
 */
export async function addModel(name: string, type: "image" | "video" | "voice"): Promise<string> {
	// Read schema template
	const schema = await Bun.file(SCHEMA_PATH).text();

	// Generate filename from name
	const filename = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`;
	const targetDir = join(KNOWLEDGE_DIR, type);
	const targetPath = join(targetDir, filename);

	if (existsSync(targetPath)) {
		throw new Error(`Model file already exists: ${type}/${filename}`);
	}

	// Replace placeholders in schema
	const today = new Date().toISOString().split("T")[0];
	const content = schema
		.replace("[model-name]", name)
		.replace("[image|video|voice]", type)
		.replace("[company-name]", "[TODO]")
		.replace('"production|experimental|deprecated"', '"experimental"')
		.replace("[YYYY-MM-DD]", today)
		.replace("[who]", "prompt-writer-cli")
		.replace("[Model Name]", name);

	// Write the file
	await Bun.write(targetPath, content);

	// Append to registry
	const registryContent = await Bun.file(REGISTRY_PATH).text();
	const sectionHeader =
		type === "image" ? "## Image Models" : type === "video" ? "## Video Models" : "## Voice Models";

	const relativePath = `${type}/${filename}`;
	const newRow = `| ${name} | [TODO] | experimental | ${relativePath} |`;

	// Find the section and append before the next section or end
	const lines = registryContent.split("\n");
	const sectionIndex = lines.findIndex((l) => l.startsWith(sectionHeader));
	if (sectionIndex === -1) {
		throw new Error(`Could not find section "${sectionHeader}" in _registry.md`);
	}

	// Find the last table row in this section
	let insertIndex = sectionIndex + 1;
	for (let i = sectionIndex + 1; i < lines.length; i++) {
		if (lines[i].startsWith("|") && !lines[i].includes("---") && !lines[i].includes("Model")) {
			insertIndex = i + 1;
		} else if (lines[i].startsWith("##") || (lines[i] === "" && i > insertIndex)) {
			break;
		}
	}

	lines.splice(insertIndex, 0, newRow);
	await Bun.write(REGISTRY_PATH, lines.join("\n"));

	return relativePath;
}
