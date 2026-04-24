#!/usr/bin/env bun
// render.ts — CLI entry for pdf-kit.
// Usage: bun run src/render.ts <input-tsx-path> <output-pdf-path>
// The input module must have a default export that is a valid React-PDF element.

import { renderToFile } from "@react-pdf/renderer";
import { createElement } from "react";

const [, , input, output] = process.argv;

if (!input || !output) {
	console.error("usage: bun run src/render.ts <tsx-input> <pdf-output>");
	console.error("  example: bun run src/render.ts src/demo/system-doc.tsx out/sample.pdf");
	process.exit(1);
}

// Resolve input relative to cwd (supports both relative and absolute paths)
const resolvedInput = input.startsWith("/") ? input : `${process.cwd()}/${input}`;

const mod = await import(resolvedInput);

// Support: default export as element OR as a component function
let element = mod.default;
if (!element) {
	console.error(`No default export found in: ${input}`);
	process.exit(1);
}

// If it's a function/class component rather than a pre-constructed element, call createElement
if (typeof element === "function") {
	element = createElement(element, {});
}

// Ensure out/ directory exists
const { mkdirSync } = await import("node:fs");
const outDir = output.split("/").slice(0, -1).join("/");
if (outDir) {
	mkdirSync(outDir, { recursive: true });
}

await renderToFile(element, output);
console.log(`wrote ${output}`);
