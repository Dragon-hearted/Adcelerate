/**
 * Brand asset pipeline — maps the brand's on-disk element sheets and logo
 * variants into palette metadata the editor + `/api/brand` consume, and
 * resolves the `/brand-assets/…` HTTP route back to absolute files for the
 * server to stream.
 *
 * Contract (agreed with builder-server):
 *   getBrandElementAssets(bundle): Array<{ elementId, name, src, usage }>
 *   where `src` is a `/brand-assets/…` route path served by `server.ts`.
 *
 * Route convention:
 *   `/brand-assets/<rel>` maps to
 *   `<root>/client/<slug>/brand-identity/assets/<rel>`.
 * The server should call {@link resolveBrandAssetPath} to turn an incoming
 * request path into a validated absolute file (with traversal guard).
 *
 * Heavy sheets (~18–25 MB) have small `_preview-…` siblings on disk; when one
 * exists we point `src` at the preview so the editor palette stays light, and
 * surface the full-resolution route as `fullSrc` for export-quality use.
 */

import { existsSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, sep } from "node:path";
import type { BrandBundle } from "./brand-loader";
import { DEFAULT_BRAND_SLUG, resolveMonorepoRoot } from "./root";

/** URL prefix under which the server exposes brand assets. */
export const BRAND_ASSET_ROUTE_PREFIX = "/brand-assets";

/** A brand asset (element sheet or logo variant) as palette metadata. */
export interface BrandAsset {
	/** Stable id, e.g. `barcode`, `logo-riso-graphite`. */
	elementId: string;
	/** Human-readable label for the palette. */
	name: string;
	/** `/brand-assets/…` route — display resolution (preview when available). */
	src: string;
	/** `/brand-assets/…` route — full resolution sheet/art. */
	fullSrc: string;
	/** Brand usage rule lifted from `brand.json`. */
	usage: string;
	/** Asset family for editor grouping. */
	kind: "element" | "logo";
}

/** Options shared by the asset helpers. */
export interface BrandAssetOptions {
	/** Monorepo root override (defaults to {@link resolveMonorepoRoot}). */
	root?: string;
	/** Brand slug under `client/` (defaults to `dragonhearted_labs`). */
	brandSlug?: string;
}

/** Absolute path to a brand's `brand-identity/assets/` directory. */
export function brandAssetsDir(root: string, brandSlug: string = DEFAULT_BRAND_SLUG): string {
	return join(root, "client", brandSlug, "brand-identity", "assets");
}

/**
 * Convert an absolute asset path to its `/brand-assets/…` route.
 * Returns `undefined` if the path is not inside the brand assets dir.
 */
export function brandAssetRoute(
	absPath: string,
	root: string,
	brandSlug: string = DEFAULT_BRAND_SLUG,
): string | undefined {
	const assetsDir = brandAssetsDir(root, brandSlug);
	const rel = relative(assetsDir, absPath);
	if (rel.startsWith("..") || isAbsolute(rel)) {
		return undefined;
	}
	// Normalize Windows separators to URL slashes.
	return `${BRAND_ASSET_ROUTE_PREFIX}/${rel.split(sep).join("/")}`;
}

/**
 * Given an absolute sheet path, return the `_preview-<basename>` sibling if it
 * exists on disk, else the original path. Keeps the editor palette light while
 * letting export use the full-resolution sheet.
 */
function preferPreview(absPath: string): string {
	const dir = dirname(absPath);
	const preview = join(dir, `_preview-${basename(absPath)}`);
	return existsSync(preview) ? preview : absPath;
}

/**
 * Resolve an incoming `/brand-assets/…` request path to a validated absolute
 * file path. Guards against `..` traversal and only serves files that exist
 * inside the brand assets dir. Returns `undefined` for anything invalid.
 *
 * The server passes the URL pathname (with or without the leading
 * `/brand-assets` prefix); both forms are accepted.
 */
export function resolveBrandAssetPath(
	requestPath: string,
	options: BrandAssetOptions = {},
): string | undefined {
	const root = options.root ?? resolveMonorepoRoot();
	const assetsDir = brandAssetsDir(root, options.brandSlug);

	let rel = requestPath.split("?")[0] ?? requestPath;
	if (rel.startsWith(BRAND_ASSET_ROUTE_PREFIX)) {
		rel = rel.slice(BRAND_ASSET_ROUTE_PREFIX.length);
	}
	rel = decodeURIComponent(rel).replace(/^\/+/, "");
	if (rel.length === 0) {
		return undefined;
	}

	const abs = join(assetsDir, rel);
	// Traversal guard: resolved path must stay within the assets dir.
	const within = relative(assetsDir, abs);
	if (within.startsWith("..") || isAbsolute(within)) {
		return undefined;
	}
	return existsSync(abs) ? abs : undefined;
}

/**
 * Map the brand's element sheets + logo variants into palette metadata.
 *
 * Includes, in palette order:
 *   - every `bundle.elements[]` that has a resolved `assetSheet`
 *   - the logo riso variants (graphite, electric-blue) — container-free placement
 *   - the primary chrome logo (must sit inside a Graphite container — see usage)
 *
 * Assets whose files are missing on disk are skipped (the loader already
 * dropped unresolved paths), so every returned `src`/`fullSrc` is servable.
 */
export function getBrandElementAssets(
	bundle: BrandBundle,
	options: BrandAssetOptions = {},
): BrandAsset[] {
	const root = options.root ?? resolveMonorepoRoot();
	const slug = options.brandSlug ?? DEFAULT_BRAND_SLUG;
	const assets: BrandAsset[] = [];

	const push = (
		elementId: string,
		name: string,
		absSheet: string,
		usage: string,
		kind: BrandAsset["kind"],
	): void => {
		const fullSrc = brandAssetRoute(absSheet, root, slug);
		const src = brandAssetRoute(preferPreview(absSheet), root, slug);
		if (!fullSrc || !src) {
			return;
		}
		assets.push({ elementId, name, src, fullSrc, usage, kind });
	};

	// 1. Brand element sheets (barcode, starbursts, wireframe-globes, halftone).
	for (const el of bundle.elements) {
		if (el.assetSheet) {
			push(el.id, el.name, el.assetSheet, el.usage, "element");
		}
	}

	// 1b. Transparent per-mark element cutouts (task #2) — the clean, layering-ready
	// versions of the sheets. `elementId` reuses the brand `element_ref` so the
	// renderer's element-kind handling (barcode → CSS bars, others → image) applies.
	for (const family of bundle.cutouts.elements) {
		family.files.forEach((file, i) => {
			push(
				family.elementRef || family.id,
				`${family.name} ${i + 1}`,
				file,
				family.usage,
				"element",
			);
		});
	}

	// 2. Logo variants — riso single-plate art may sit container-free.
	const variants = bundle.logo.variants;
	if (variants.risoGraphite) {
		push(
			"logo-riso-graphite",
			"Logo — Riso Graphite",
			variants.risoGraphite,
			"Single-plate Graphite riso logo; may sit container-free on the light canvas (no Graphite panel required).",
			"logo",
		);
	}
	if (variants.risoElectricBlue) {
		push(
			"logo-riso-electric-blue",
			"Logo — Riso Electric Blue",
			variants.risoElectricBlue,
			"Single-plate Electric Blue riso logo; may sit container-free on the light canvas (no Graphite panel required).",
			"logo",
		);
	}

	// 3. Primary chrome logo — MUST be placed inside a Graphite container panel.
	if (bundle.logo.primary) {
		push(
			"logo-primary",
			"Logo — Chrome (master)",
			bundle.logo.primary,
			`${bundle.logo.rules.container} — never place the chrome PNG directly on the light/textured canvas; wrap in a .logo-container Graphite panel.`,
			"logo",
		);
	}

	return assets;
}
