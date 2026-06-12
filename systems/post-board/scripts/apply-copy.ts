#!/usr/bin/env bun
/**
 * apply-copy — map an approved {@link CopyDoc} onto an existing PostBoard
 * project's slides and persist it.
 *
 * Used by the `/post-board` skill (generate-post.md Stage 4B) to replace a draft's
 * positioning-derived placeholder copy with the real, approved copy: it loads the
 * CopyDoc JSON, runs `copyDocToSlides()` against the brand bundle + the project's
 * pinned format, swaps in the resulting slides, and saves through the Zod schema.
 *
 * Usage:
 *   bun run scripts/apply-copy.ts --project <id> --copydoc <file> [--style-mode <id>]
 *
 * The CopyDoc file must match the contract in `src/copy-contract.ts`
 * (`parseCopyDoc` validates it; invalid input fails fast with a clear message).
 */

import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import {
	copyDocToSlides,
	getFormatPreset,
	loadBrand,
	loadProject,
	parseCopyDoc,
	saveProject,
} from "../src/index";

const USAGE =
	"usage: bun run scripts/apply-copy.ts --project <id> --copydoc <file> [--style-mode <id>]";

async function main(): Promise<void> {
	const { values } = parseArgs({
		args: process.argv.slice(2),
		options: {
			project: { type: "string" },
			copydoc: { type: "string" },
			"style-mode": { type: "string" },
		},
		strict: true,
		allowPositionals: false,
	});

	if (!values.project || !values.copydoc) {
		console.error(USAGE);
		process.exit(1);
	}

	const copyDoc = parseCopyDoc(JSON.parse(readFileSync(values.copydoc, "utf8")));
	const bundle = loadBrand({ silent: true });
	const project = await loadProject(values.project);
	const format = getFormatPreset(project.format.preset);
	const styleMode = values["style-mode"] ?? project.styleMode;

	project.slides = copyDocToSlides(copyDoc, bundle, format, { styleMode });
	project.updatedAt = new Date().toISOString();
	const path = await saveProject(project);

	console.log(`Applied CopyDoc → ${project.slides.length} slides on "${project.id}"`);
	console.log(path);
}

main().catch((err) => {
	console.error(`apply-copy failed: ${(err as Error).message}`);
	process.exit(1);
});
