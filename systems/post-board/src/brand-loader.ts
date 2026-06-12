/**
 * Brand loader — turns the canonical `client/<brand>/brand-identity/brand.json`
 * into a normalized `BrandBundle` the editor + server consume.
 *
 * Responsibilities:
 *  - Resolve and read `brand.json` (path configurable; default anchored to the
 *    monorepo root, see `root.ts`).
 *  - Normalize palette, typography, style modes, brand elements, logo (+ rules
 *    + variants), background/ink-bleed system, voice, positioning, tagline, and
 *    the flagship hero mode.
 *  - Produce `fontFaceCss`: real `@font-face` rules with the on-disk `.otf`/`.ttf`
 *    files base64-embedded as data URLs, plus a Google-Fonts `@import` fallback
 *    for families not bundled in the repo (Inter).
 *  - Tolerate missing optional asset files: warn and skip, never throw.
 *
 * IMPORTANT: font file paths in `brand.json` are monorepo-root-relative and
 * contain spaces (e.g. "Neue Machina - Free for Personal Use/NeueMachina-Light.otf").
 * They are used verbatim — only joined to the resolved root.
 */

import { existsSync, readFileSync } from "node:fs";
import { extname, isAbsolute, join } from "node:path";
import { DEFAULT_BRAND_SLUG, brandJsonPath, resolveMonorepoRoot } from "./root";

// ─── Normalized bundle types ───

/** A single palette color from `brand.json.colors`. */
export interface PaletteColor {
	token: string;
	name: string;
	hex: string;
	role: string;
	usagePct?: number;
}

/** A normalized font family with its on-disk files and CSS treatment. */
export interface BrandFont {
	family: string;
	role: string;
	weights: string[];
	/** Monorepo-root-relative file paths exactly as given in brand.json (may be empty). */
	files: string[];
	/** CSS `font-family` fallback stack string. */
	fallback: string;
	/** Brand treatment note (e.g. "CLEAN — no bleed"). */
	treatment: string;
	license?: string;
}

/** A creative style mode (e.g. `08-popart-screenprint`). */
export interface StyleMode {
	id: string;
	name: string;
	description: string;
	whenToUse?: string;
	flagship?: boolean;
	darkFirst?: boolean;
	referenceDir?: string;
}

/** A reusable brand element (barcode, starburst, etc.). */
export interface BrandElement {
	id: string;
	name: string;
	usage: string;
	/** Absolute path to the element's asset sheet, when present on disk. */
	assetSheet?: string;
}

/** Logo container/placement rules. */
export interface BrandLogoRules {
	background: string;
	container: string;
	clearSpace: string;
	minWidthPx?: number;
	donts: string[];
}

/** Logo art + variants (absolute paths when present on disk). */
export interface BrandLogo {
	description: string;
	primary?: string;
	identitySheet?: string;
	variants: {
		risoGraphite?: string;
		risoElectricBlue?: string;
		note?: string;
	};
	rules: BrandLogoRules;
}

/** A background texture entry. */
export interface BackgroundTexture {
	id: string;
	name: string;
	usage: string;
}

/** The always-on ink-bleed / riso background system. */
export interface BackgroundSystem {
	rule: string;
	bleed: {
		style: string;
		description: string;
		appliesTo: string[];
	};
	textures: BackgroundTexture[];
	layering: string;
}

/** Brand voice guidance. */
export interface BrandVoice {
	traits: string[];
	description: string;
	doWords: string[];
	dontWords: string[];
}

/** Positioning banners + proof. */
export interface BrandPositioning {
	angle?: string;
	description?: string;
	headlinePromise?: string;
	proofStats: { value: string; label: string }[];
	proofBanner?: string;
	audienceBanner?: string;
	ctaBanner?: string;
	archetype?: { primary: string; secondary: string };
}

/** Tagline + accent treatment. */
export interface BrandTagline {
	text: string;
	accentPhrase?: string;
	accentTreatment?: string;
}

/** Flagship dark-first hero mode spec. */
export interface HeroMode {
	id: string;
	name: string;
	role?: string;
	exemplar?: string;
	canvas?: string;
	subject?: string;
	energy?: string;
	typography?: string;
	restraint?: string;
	whenToUse?: string;
}

/** The fully-normalized brand bundle consumed by the editor + server. */
export interface BrandBundle {
	brand: string;
	wordmark?: string;
	version?: string;
	palette: PaletteColor[];
	fonts: BrandFont[];
	/** `@font-face` (base64-embedded) + Google-Fonts `@import` fallback CSS. */
	fontFaceCss: string;
	styleModes: StyleMode[];
	elements: BrandElement[];
	logo: BrandLogo;
	backgroundSystem: BackgroundSystem;
	voice: BrandVoice;
	positioning: BrandPositioning;
	tagline: BrandTagline;
	heroMode?: HeroMode;
}

/** Options for {@link loadBrand}. */
export interface LoadBrandOptions {
	/** Monorepo root override (defaults to {@link resolveMonorepoRoot}). */
	root?: string;
	/** Brand slug under `client/` (defaults to `dragonhearted_labs`). */
	brandSlug?: string;
	/** Explicit `brand.json` path override (wins over root + slug). */
	brandJsonPath?: string;
	/** Suppress console warnings for missing optional assets. */
	silent?: boolean;
}

// ─── Font CSS generation ───

/** Weight-name → CSS numeric weight. */
const WEIGHT_MAP: Record<string, number> = {
	thin: 100,
	hairline: 100,
	extralight: 200,
	ultralight: 200,
	light: 300,
	regular: 400,
	normal: 400,
	book: 400,
	medium: 500,
	semibold: 600,
	demibold: 600,
	bold: 700,
	extrabold: 800,
	ultrabold: 800,
	black: 900,
	heavy: 900,
};

/** Map a file extension to a CSS `format()` hint + data-URL mime. */
function fontFormat(ext: string): { format: string; mime: string } | undefined {
	switch (ext.toLowerCase()) {
		case ".otf":
			return { format: "opentype", mime: "font/otf" };
		case ".ttf":
			return { format: "truetype", mime: "font/ttf" };
		case ".woff2":
			return { format: "woff2", mime: "font/woff2" };
		case ".woff":
			return { format: "woff", mime: "font/woff" };
		default:
			return undefined;
	}
}

/**
 * Derive `{ weight, italic }` from a font filename's style suffix, e.g.
 * `IBMPlexMono-SemiBoldItalic.ttf` → `{ weight: 600, italic: true }`.
 */
function styleFromFilename(filePath: string): { weight: number; italic: boolean } {
	const base = filePath.replace(/\\/g, "/").split("/").pop() ?? filePath;
	const stem = base.replace(/\.[^.]+$/, "");
	const suffix = stem.includes("-") ? (stem.split("-").pop() ?? "") : stem;
	const italic = /italic/i.test(suffix);
	const weightToken = suffix.replace(/italic/i, "").toLowerCase();
	const weight = WEIGHT_MAP[weightToken] ?? 400;
	return { weight, italic };
}

/**
 * Build `@font-face` rules with on-disk fonts base64-embedded as data URLs.
 * Families with no bundled files contribute a Google-Fonts `@import` instead
 * (Inter). Missing files are warned + skipped.
 */
function buildFontFaceCss(fonts: BrandFont[], root: string, silent: boolean): string {
	const imports: string[] = [];
	const faces: string[] = [];

	for (const font of fonts) {
		if (font.files.length === 0) {
			// Not bundled — fall back to Google Fonts for known OFL families.
			if (/inter/i.test(font.family)) {
				imports.push(
					`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500&display=swap');`,
				);
			}
			continue;
		}

		for (const rel of font.files) {
			const abs = isAbsolute(rel) ? rel : join(root, rel);
			const fmt = fontFormat(extname(rel));
			if (!fmt) {
				if (!silent) {
					console.warn(`[brand-loader] Unsupported font format, skipping: ${rel}`);
				}
				continue;
			}
			if (!existsSync(abs)) {
				if (!silent) {
					console.warn(`[brand-loader] Missing font file, skipping: ${rel}`);
				}
				continue;
			}
			const { weight, italic } = styleFromFilename(rel);
			const base64 = readFileSync(abs).toString("base64");
			faces.push(
				[
					"@font-face {",
					`\tfont-family: "${font.family}";`,
					`\tfont-style: ${italic ? "italic" : "normal"};`,
					`\tfont-weight: ${weight};`,
					"\tfont-display: swap;",
					`\tsrc: url("data:${fmt.mime};base64,${base64}") format("${fmt.format}");`,
					"}",
				].join("\n"),
			);
		}
	}

	// @import rules must precede all other rules.
	return [...new Set(imports), ...faces].join("\n\n");
}

// ─── Asset path resolution ───

/** Resolve a monorepo-root-relative asset path to an absolute path if it exists. */
function resolveAsset(
	rel: string | undefined,
	root: string,
	silent: boolean,
	label: string,
): string | undefined {
	if (!rel) {
		return undefined;
	}
	const abs = isAbsolute(rel) ? rel : join(root, rel);
	if (!existsSync(abs)) {
		if (!silent) {
			console.warn(`[brand-loader] Missing ${label} asset, skipping: ${rel}`);
		}
		return undefined;
	}
	return abs;
}

// ─── Loader ───

/** Read + parse the raw `brand.json` document (untyped). */
export function loadBrandJson(options: LoadBrandOptions = {}): Record<string, unknown> {
	const root = options.root ?? resolveMonorepoRoot();
	const path =
		options.brandJsonPath ?? brandJsonPath(root, options.brandSlug ?? DEFAULT_BRAND_SLUG);
	if (!existsSync(path)) {
		throw new Error(`brand.json not found at: ${path}`);
	}
	return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
}

/**
 * Load + normalize a brand into a {@link BrandBundle}.
 *
 * Missing optional asset files are warned about (unless `silent`) and skipped;
 * a missing `brand.json` itself is a hard error.
 */
export function loadBrand(options: LoadBrandOptions = {}): BrandBundle {
	const root = options.root ?? resolveMonorepoRoot();
	const silent = options.silent ?? false;
	const raw = loadBrandJson({ ...options, root });

	const palette: PaletteColor[] = asArray(raw.colors).map((c) => {
		const o = c as Record<string, unknown>;
		return {
			token: String(o.token ?? ""),
			name: String(o.name ?? ""),
			hex: String(o.hex ?? ""),
			role: String(o.role ?? ""),
			...(typeof o.usage_pct === "number" ? { usagePct: o.usage_pct } : {}),
		};
	});

	const fonts: BrandFont[] = asArray(raw.typography).map((f) => {
		const o = f as Record<string, unknown>;
		return {
			family: String(o.family ?? ""),
			role: String(o.role ?? ""),
			weights: asArray(o.weights).map(String),
			files: asArray(o.files).map(String),
			fallback: String(o.fallback ?? ""),
			treatment: String(o.treatment ?? ""),
			...(typeof o.license === "string" ? { license: o.license } : {}),
		};
	});

	const fontFaceCss = buildFontFaceCss(fonts, root, silent);

	const styleModes: StyleMode[] = asArray(raw.style_modes).map((s) => {
		const o = s as Record<string, unknown>;
		return {
			id: String(o.id ?? ""),
			name: String(o.name ?? ""),
			description: String(o.description ?? ""),
			...(typeof o.when_to_use === "string" ? { whenToUse: o.when_to_use } : {}),
			...(typeof o.flagship === "boolean" ? { flagship: o.flagship } : {}),
			...(typeof o.dark_first === "boolean" ? { darkFirst: o.dark_first } : {}),
			...(typeof o.reference_dir === "string" ? { referenceDir: o.reference_dir } : {}),
		};
	});

	const elements: BrandElement[] = asArray(raw.brand_elements).map((e) => {
		const o = e as Record<string, unknown>;
		const sheet = resolveAsset(
			typeof o.asset_sheet === "string" ? o.asset_sheet : undefined,
			root,
			silent,
			`element "${String(o.id ?? "")}"`,
		);
		return {
			id: String(o.id ?? ""),
			name: String(o.name ?? ""),
			usage: String(o.usage ?? ""),
			...(sheet ? { assetSheet: sheet } : {}),
		};
	});

	const logo = normalizeLogo(raw.logo as Record<string, unknown> | undefined, root, silent);
	const backgroundSystem = normalizeBackgroundSystem(
		raw.background_system as Record<string, unknown> | undefined,
	);
	const voice = normalizeVoice(raw.voice as Record<string, unknown> | undefined);
	const positioning = normalizePositioning(raw.positioning as Record<string, unknown> | undefined);
	const tagline = normalizeTagline(raw.tagline as Record<string, unknown> | undefined);
	const heroMode = normalizeHeroMode(raw.hero_mode as Record<string, unknown> | undefined);

	return {
		brand: String(raw.brand ?? ""),
		...(typeof raw.wordmark === "string" ? { wordmark: raw.wordmark } : {}),
		...(typeof raw.version === "string" ? { version: raw.version } : {}),
		palette,
		fonts,
		fontFaceCss,
		styleModes,
		elements,
		logo,
		backgroundSystem,
		voice,
		positioning,
		tagline,
		...(heroMode ? { heroMode } : {}),
	};
}

// ─── Section normalizers ───

function normalizeLogo(
	raw: Record<string, unknown> | undefined,
	root: string,
	silent: boolean,
): BrandLogo {
	const o = raw ?? {};
	const rules = (o.rules ?? {}) as Record<string, unknown>;
	const variants = (o.variants ?? {}) as Record<string, unknown>;

	const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);
	const primary = resolveAsset(str(o.primary), root, silent, "logo primary");
	const identitySheet = resolveAsset(str(o.identity_sheet), root, silent, "identity sheet");
	const risoGraphite = resolveAsset(
		str(variants.riso_graphite),
		root,
		silent,
		"logo riso-graphite",
	);
	const risoElectricBlue = resolveAsset(
		str(variants.riso_electric_blue),
		root,
		silent,
		"logo riso-electric-blue",
	);

	return {
		description: String(o.description ?? ""),
		...(primary ? { primary } : {}),
		...(identitySheet ? { identitySheet } : {}),
		variants: {
			...(risoGraphite ? { risoGraphite } : {}),
			...(risoElectricBlue ? { risoElectricBlue } : {}),
			...(typeof variants.note === "string" ? { note: variants.note } : {}),
		},
		rules: {
			background: String(rules.background ?? ""),
			container: String(rules.container ?? ""),
			clearSpace: String(rules.clear_space ?? ""),
			...(typeof rules.min_width_px === "number" ? { minWidthPx: rules.min_width_px } : {}),
			donts: asArray(rules.donts).map(String),
		},
	};
}

function normalizeBackgroundSystem(raw: Record<string, unknown> | undefined): BackgroundSystem {
	const o = raw ?? {};
	const bleed = (o.bleed ?? {}) as Record<string, unknown>;
	return {
		rule: String(o.rule ?? ""),
		bleed: {
			style: String(bleed.style ?? ""),
			description: String(bleed.description ?? ""),
			appliesTo: asArray(bleed.applies_to).map(String),
		},
		textures: asArray(o.textures).map((t) => {
			const to = t as Record<string, unknown>;
			return {
				id: String(to.id ?? ""),
				name: String(to.name ?? ""),
				usage: String(to.usage ?? ""),
			};
		}),
		layering: String(o.layering ?? ""),
	};
}

function normalizeVoice(raw: Record<string, unknown> | undefined): BrandVoice {
	const o = raw ?? {};
	return {
		traits: asArray(o.traits).map(String),
		description: String(o.description ?? ""),
		doWords: asArray(o.do_words).map(String),
		dontWords: asArray(o.dont_words).map(String),
	};
}

function normalizePositioning(raw: Record<string, unknown> | undefined): BrandPositioning {
	const o = raw ?? {};
	const archetype = o.archetype as Record<string, unknown> | undefined;
	return {
		...(typeof o.angle === "string" ? { angle: o.angle } : {}),
		...(typeof o.description === "string" ? { description: o.description } : {}),
		...(typeof o.headline_promise === "string" ? { headlinePromise: o.headline_promise } : {}),
		proofStats: asArray(o.proof_stats).map((p) => {
			const po = p as Record<string, unknown>;
			return { value: String(po.value ?? ""), label: String(po.label ?? "") };
		}),
		...(typeof o.proof_banner === "string" ? { proofBanner: o.proof_banner } : {}),
		...(typeof o.audience_banner === "string" ? { audienceBanner: o.audience_banner } : {}),
		...(typeof o.cta_banner === "string" ? { ctaBanner: o.cta_banner } : {}),
		...(archetype
			? {
					archetype: {
						primary: String(archetype.primary ?? ""),
						secondary: String(archetype.secondary ?? ""),
					},
				}
			: {}),
	};
}

function normalizeTagline(raw: Record<string, unknown> | undefined): BrandTagline {
	const o = raw ?? {};
	return {
		text: String(o.text ?? ""),
		...(typeof o.accent_phrase === "string" ? { accentPhrase: o.accent_phrase } : {}),
		...(typeof o.accent_treatment === "string" ? { accentTreatment: o.accent_treatment } : {}),
	};
}

function normalizeHeroMode(raw: Record<string, unknown> | undefined): HeroMode | undefined {
	if (!raw) {
		return undefined;
	}
	return {
		id: String(raw.id ?? ""),
		name: String(raw.name ?? ""),
		...(typeof raw.role === "string" ? { role: raw.role } : {}),
		...(typeof raw.exemplar === "string" ? { exemplar: raw.exemplar } : {}),
		...(typeof raw.canvas === "string" ? { canvas: raw.canvas } : {}),
		...(typeof raw.subject === "string" ? { subject: raw.subject } : {}),
		...(typeof raw.energy === "string" ? { energy: raw.energy } : {}),
		...(typeof raw.typography === "string" ? { typography: raw.typography } : {}),
		...(typeof raw.restraint === "string" ? { restraint: raw.restraint } : {}),
		...(typeof raw.when_to_use === "string" ? { whenToUse: raw.when_to_use } : {}),
	};
}

// ─── Small helpers ───

/** Coerce an unknown value to an array (empty when not an array). */
function asArray(value: unknown): unknown[] {
	return Array.isArray(value) ? value : [];
}
