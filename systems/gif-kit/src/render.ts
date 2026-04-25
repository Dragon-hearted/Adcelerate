#!/usr/bin/env bun
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";

const entry = path.resolve("src/index.ts");
const out = path.resolve("out/brand-intro.gif");

// Ensure out/ directory exists
await Bun.write(out, "");

console.log("Bundling...");
const bundled = await bundle({ entryPoint: entry });

console.log("Selecting composition...");
const composition = await selectComposition({ serveUrl: bundled, id: "BrandIntro" });

console.log("Rendering GIF...");
await renderMedia({
  composition,
  serveUrl: bundled,
  codec: "gif",
  outputLocation: out,
});

console.log(`wrote ${out}`);
