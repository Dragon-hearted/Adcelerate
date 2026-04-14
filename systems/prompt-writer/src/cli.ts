#!/usr/bin/env bun
/**
 * PromptWriter CLI — Model registry management.
 *
 * Commands:
 *   list [--type <image|video|voice>]   List all registered models
 *   validate                            Validate registry consistency
 *   add <name> --type <image|video|voice>  Scaffold a new model from template
 */

import { addModel, listModels, validateRegistry } from "./registry";

const args = process.argv.slice(2);
const command = args[0];

function printUsage(): void {
	console.log(`
PromptWriter CLI — Model Registry Management

Usage:
  prompt-writer list [--type <image|video|voice>]
  prompt-writer validate
  prompt-writer add <model-name> --type <image|video|voice>

Commands:
  list       Display all registered models
  validate   Check registry consistency and model file structure
  add        Scaffold a new model file from the schema template
`);
}

function getFlag(flag: string): string | undefined {
	const index = args.indexOf(flag);
	if (index !== -1 && index + 1 < args.length) {
		return args[index + 1];
	}
	return undefined;
}

async function handleList(): Promise<void> {
	const typeFilter = getFlag("--type") as "image" | "video" | "voice" | undefined;

	if (typeFilter && !["image", "video", "voice"].includes(typeFilter)) {
		console.error(`Invalid type filter: ${typeFilter}. Must be image, video, or voice.`);
		process.exit(1);
	}

	const models = await listModels(typeFilter);

	if (models.length === 0) {
		console.log("No models found.");
		return;
	}

	// Group by type
	const grouped = new Map<string, typeof models>();
	for (const model of models) {
		const group = grouped.get(model.type) ?? [];
		group.push(model);
		grouped.set(model.type, group);
	}

	for (const [type, entries] of grouped) {
		console.log(`\n${type.toUpperCase()} MODELS`);
		console.log("-".repeat(60));
		console.log(`${"Model".padEnd(22)} ${"Provider".padEnd(18)} ${"Status".padEnd(14)}`);
		console.log("-".repeat(60));
		for (const entry of entries) {
			console.log(
				`${entry.model.padEnd(22)} ${entry.provider.padEnd(18)} ${entry.status.padEnd(14)}`,
			);
		}
	}

	console.log(`\nTotal: ${models.length} model(s)`);
}

async function handleValidate(): Promise<void> {
	console.log("Validating model registry...\n");

	const result = await validateRegistry();

	if (result.errors.length > 0) {
		console.log("ERRORS:");
		for (const error of result.errors) {
			console.log(`  ✗ ${error}`);
		}
	}

	if (result.warnings.length > 0) {
		console.log("\nWARNINGS:");
		for (const warning of result.warnings) {
			console.log(`  ! ${warning}`);
		}
	}

	if (result.valid && result.warnings.length === 0) {
		console.log("All checks passed.");
	}

	console.log(`\nModels registered: ${result.modelCount}`);
	console.log(`Result: ${result.valid ? "VALID" : "INVALID"}`);

	if (!result.valid) {
		process.exit(1);
	}
}

async function handleAdd(): Promise<void> {
	const name = args[1];
	const type = getFlag("--type") as "image" | "video" | "voice" | undefined;

	if (!name) {
		console.error("Missing model name. Usage: prompt-writer add <name> --type <type>");
		process.exit(1);
	}

	if (!type || !["image", "video", "voice"].includes(type)) {
		console.error("Missing or invalid --type flag. Must be image, video, or voice.");
		process.exit(1);
	}

	try {
		const path = await addModel(name, type);
		console.log(`Model scaffolded: ${path}`);
		console.log(`Registry updated. Run 'just validate' after populating the model file.`);
	} catch (error) {
		console.error(`Failed to add model: ${(error as Error).message}`);
		process.exit(1);
	}
}

// Route command
switch (command) {
	case "list":
		await handleList();
		break;
	case "validate":
		await handleValidate();
		break;
	case "add":
		await handleAdd();
		break;
	case "--help":
	case "-h":
	case undefined:
		printUsage();
		break;
	default:
		console.error(`Unknown command: ${command}`);
		printUsage();
		process.exit(1);
}
