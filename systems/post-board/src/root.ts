/**
 * Monorepo-root resolution.
 *
 * Brand-asset and project paths in PostBoard are anchored to the Adcelerate
 * monorepo root (the directory containing both `client/` and `systems/`).
 * Resolution order:
 *   1. `POST_BOARD_ROOT` env var (explicit override).
 *   2. Walk up from this module's directory until a folder containing both
 *      `client/` and `systems/` is found.
 *   3. Fall back to `process.cwd()`.
 *
 * Walking from `import.meta.dir` (rather than `cwd`) keeps resolution stable no
 * matter where a CLI/server/test process is launched from inside the repo.
 */

import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/** Returns true when `dir` looks like the monorepo root. */
function isMonorepoRoot(dir: string): boolean {
	return existsSync(join(dir, "client")) && existsSync(join(dir, "systems"));
}

/**
 * Resolve the Adcelerate monorepo root as an absolute path.
 *
 * @param start - Optional directory to begin the upward walk from. Defaults to
 *   this module's directory.
 */
export function resolveMonorepoRoot(start?: string): string {
	const envRoot = process.env.POST_BOARD_ROOT;
	if (envRoot && envRoot.length > 0) {
		return resolve(envRoot);
	}

	let dir = resolve(start ?? import.meta.dir);
	for (let i = 0; i < 40; i++) {
		if (isMonorepoRoot(dir)) {
			return dir;
		}
		const parent = dirname(dir);
		if (parent === dir) {
			break;
		}
		dir = parent;
	}

	return process.cwd();
}

/** Default brand slug for the v1 single-client scope. */
export const DEFAULT_BRAND_SLUG = "dragonhearted_labs";

/** Absolute path to a brand's canonical `brand.json`. */
export function brandJsonPath(root: string, brandSlug: string = DEFAULT_BRAND_SLUG): string {
	return join(root, "client", brandSlug, "brand-identity", "brand.json");
}

/** Absolute path to a brand's PostBoard projects directory (`client/<brand>/post-board/`). */
export function projectsRoot(root: string, brandSlug: string = DEFAULT_BRAND_SLUG): string {
	return join(root, "client", brandSlug, "post-board");
}
