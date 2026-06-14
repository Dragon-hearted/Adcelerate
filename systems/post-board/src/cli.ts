#!/usr/bin/env bun
/**
 * PostBoard CLI.
 *
 * Commands:
 *   new            --brief <file|string> --type <post|carousel> --format <preset> [--style-mode <id>]
 *   serve          [--port <n>]
 *   generate-cover --project <id> [--slide <id>]
 *   export         --project <id> [--pdf]
 */

import { existsSync, readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { loadBrand } from "./brand-loader";
import { generateCoverBackground } from "./cover";
import { exportProject } from "./export";
import { isFormatId } from "./formats";
import { generateHeroBackgrounds } from "./heroes";
import { saveProject } from "./project";
import { createSeedProject } from "./seed";
import { serve } from "./server";

const USAGE = `PostBoard — brand-aware social post & carousel studio

USAGE
  bun run src/cli.ts <command> [flags]

COMMANDS
  new              Seed a new draft project from a brief
  serve            Start the editor + API server
  generate-cover   Generate a Higgsfield/ImageEngine background for a slide
  generate-heroes  Generate a hero image for EVERY slide (image-forward carousel)
  export           Render slides to PNGs (+ optional PDF)

FLAGS
  new:
    --brief <file|string>   Brief text, or a path to a brief file   (required)
    --type  <post|carousel> Project type                            (default: carousel)
    --format <preset>       ig-4x5 | ig-1x1 | story-9x16 | linkedin-4x5 (default: ig-4x5)
    --style-mode <id>       Brand style-mode id                     (default: 08-popart-screenprint)
  serve:
    --port <n>              Bind port (default: env POST_BOARD_PORT or 4300)
  generate-cover:
    --project <id>          Project id                              (required)
    --slide <id>            Target slide id                         (default: cover)
  generate-heroes:
    --project <id>          Project id                              (required)
    --slide <id>            Restrict to one slide (repeatable)      (default: all)
    --allow-fallback        Approve a provider switch if NanoBanana is down
  export:
    --project <id>          Project id                              (required)
    --pdf                   Also assemble carousel.pdf

EXAMPLES
  bun run src/cli.ts new --brief tests/fixtures/sample-brief.txt --type carousel --format ig-4x5
  bun run src/cli.ts serve --port 4300
  bun run src/cli.ts generate-cover --project my-post-abc
  bun run src/cli.ts generate-heroes --project my-post-abc
  bun run src/cli.ts export --project my-post-abc --pdf
`;

function fail(message: string): never {
	console.error(`Error: ${message}\n`);
	console.error(USAGE);
	process.exit(1);
}

/** Read a brief from a file path if it exists, otherwise treat it as literal text. */
function resolveBrief(value: string): string {
	if (existsSync(value)) {
		return readFileSync(value, "utf8").trim();
	}
	return value;
}

async function cmdNew(argv: string[]): Promise<void> {
	const { values } = parseArgs({
		args: argv,
		options: {
			brief: { type: "string" },
			type: { type: "string", default: "carousel" },
			format: { type: "string", default: "ig-4x5" },
			"style-mode": { type: "string" },
		},
		strict: true,
		allowPositionals: false,
	});

	if (!values.brief) {
		fail("`new` requires --brief <file|string>");
	}
	const type = values.type === "post" ? "post" : "carousel";
	if (values.format && !isFormatId(values.format)) {
		fail(`unknown --format "${values.format}"`);
	}

	const bundle = loadBrand({ silent: true });
	const project = createSeedProject(bundle, {
		brief: resolveBrief(values.brief),
		type,
		format: values.format ?? "ig-4x5",
		...(values["style-mode"] ? { styleMode: values["style-mode"] } : {}),
	});
	const path = await saveProject(project);
	console.log(`Created project "${project.id}" (${type}, ${project.format.preset})`);
	console.log(path);
}

function cmdServe(argv: string[]): void {
	const { values } = parseArgs({
		args: argv,
		options: { port: { type: "string" } },
		strict: true,
		allowPositionals: false,
	});
	const port = values.port ? Number(values.port) : undefined;
	const { url } = serve(port !== undefined ? { port } : {});
	console.log(`PostBoard server listening on ${url}`);
	console.log(`  editor: ${url}/editor`);
	console.log(`  brand:  ${url}/api/brand`);
}

async function cmdGenerateCover(argv: string[]): Promise<void> {
	const { values } = parseArgs({
		args: argv,
		options: { project: { type: "string" }, slide: { type: "string" } },
		strict: true,
		allowPositionals: false,
	});
	if (!values.project) {
		fail("`generate-cover` requires --project <id>");
	}
	try {
		const result = await generateCoverBackground({
			projectId: values.project,
			...(values.slide ? { slideId: values.slide } : {}),
		});
		console.log(`Background generated: ${result.src}`);
		console.log(`  gallery id: ${result.generationId}`);
		console.log(`  saved:      ${result.localPath}`);
	} catch (err) {
		// Runtime failure — surface an actionable message, NOT the USAGE block.
		const msg = (err as Error).message;
		const isConn =
			/unable to connect|econnrefused|connection refused|fetch failed|failed to connect|timed out/i.test(
				msg,
			);
		if (isConn) {
			console.error(
				"ImageEngine (:3002) unreachable — start it with `just sub systems/image-engine start` (from the monorepo root), or keep the CSS cover.",
			);
		} else {
			console.error(`Error: cover generation failed: ${msg}`);
		}
		process.exit(1);
	}
}

async function cmdGenerateHeroes(argv: string[]): Promise<void> {
	const { values } = parseArgs({
		args: argv,
		options: {
			project: { type: "string" },
			slide: { type: "string", multiple: true },
			"allow-fallback": { type: "boolean", default: false },
		},
		strict: true,
		allowPositionals: false,
	});
	if (!values.project) {
		fail("`generate-heroes` requires --project <id>");
	}
	try {
		const result = await generateHeroBackgrounds({
			projectId: values.project,
			...(values.slide && values.slide.length > 0 ? { slideIds: values.slide } : {}),
			...(values["allow-fallback"] === true ? { autoFallback: true } : {}),
		});
		console.log(
			`Hero generation: ${result.generated.length} generated, ${result.failed.length} failed (${result.totalTokens} tokens).`,
		);
		for (const g of result.generated) {
			console.log(`  ✓ ${g.slideId} (${g.role}) → ${g.src}`);
		}
		for (const f of result.failed) {
			console.log(`  ✗ ${f.slideId} (${f.role}) — kept CSS background: ${f.error}`);
		}
		if (result.generated.length === 0) {
			process.exit(1);
		}
	} catch (err) {
		const msg = (err as Error).message;
		const isConn =
			/unable to connect|econnrefused|connection refused|fetch failed|failed to connect|timed out/i.test(
				msg,
			);
		if (isConn) {
			console.error(
				"ImageEngine (:3002) unreachable — start it with `just sub systems/image-engine start` (from the monorepo root), or keep the CSS backgrounds.",
			);
		} else {
			console.error(`Error: hero generation failed: ${msg}`);
		}
		process.exit(1);
	}
}

async function cmdExport(argv: string[]): Promise<void> {
	const { values } = parseArgs({
		args: argv,
		options: { project: { type: "string" }, pdf: { type: "boolean", default: false } },
		strict: true,
		allowPositionals: false,
	});
	if (!values.project) {
		fail("`export` requires --project <id>");
	}
	try {
		const result = await exportProject(values.project, { pdf: values.pdf === true });
		console.log(`Exported ${result.pngs.length} slide(s):`);
		for (const png of result.pngs) {
			console.log(`  ${png}`);
		}
		if (result.pdf) {
			console.log(`  ${result.pdf}`);
		}
	} catch (err) {
		fail((err as Error).message);
	}
}

async function main(): Promise<void> {
	const [command, ...rest] = process.argv.slice(2);
	switch (command) {
		case "new":
			await cmdNew(rest);
			break;
		case "serve":
			cmdServe(rest);
			break;
		case "generate-cover":
			await cmdGenerateCover(rest);
			break;
		case "generate-heroes":
			await cmdGenerateHeroes(rest);
			break;
		case "export":
			await cmdExport(rest);
			break;
		case undefined:
		case "-h":
		case "--help":
		case "help":
			console.log(USAGE);
			break;
		default:
			fail(`unknown command "${command}"`);
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
