import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ReadmeScope, SvgAsset } from "./types";

function scopeDir(monorepoRoot: string, scope: ReadmeScope): string {
  if (scope.type === "root") return join(monorepoRoot, "images");
  if (scope.type === "system" && scope.name) return join(monorepoRoot, "systems", scope.name, "images");
  if (scope.type === "app" && scope.name) return join(monorepoRoot, "apps", scope.name, "images");
  return join(monorepoRoot, "images");
}

export async function writeSvgAssets(
  monorepoRoot: string,
  scope: ReadmeScope,
  svgs: SvgAsset[],
): Promise<void> {
  const dir = scopeDir(monorepoRoot, scope);
  await mkdir(dir, { recursive: true });

  for (const svg of svgs) {
    const filePath = join(dir, `${svg.name}.svg`);
    await writeFile(filePath, svg.content, "utf-8");
    console.log(`  wrote ${filePath}`);
  }
}
