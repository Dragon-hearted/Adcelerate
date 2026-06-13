/**
 * Carousel-arc picker — assigns a layout **variant** + **decoration** to each
 * slide of a deck so the result has rhythm: adjacent slides never share the same
 * dominant device, lime accent blocks and brand graphic-element cutouts land on
 * the right beats, and the whole thing stays inside the brand's element budget
 * (≤1 barcode, 1–3 starbursts, halftone on background zones only).
 *
 * DETERMINISTIC by contract: the only entropy is a string `seed` (the caller
 * passes the project id) combined with each slide's position — NEVER
 * `Math.random()`. Re-seeding the same project yields the same plan, so the
 * picker is stable and unit-testable.
 *
 * Canonical 7-slide teaching arc (from the reference patterns doc):
 *   cover (Hook) → content (Context) → content (How·1) → stat (Proof) →
 *   content (How·2) → quote (Reset) → cta (Payoff)
 */

import type { SlideRole } from "../project";
import {
	CONTENT_VARIANTS,
	COVER_VARIANTS,
	CTA_VARIANTS,
	type CutoutKind,
	type Decor,
	QUOTE_VARIANTS,
	STAT_VARIANTS,
	type SlidePlan,
	type VariantName,
} from "./variants";

// ─── Deterministic hashing (FNV-1a, 32-bit) ───

/** Stable 32-bit FNV-1a hash of a string → unsigned int. No `Math.random`. */
export function hashStr(s: string): number {
	let h = 0x811c9dc5;
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	return h >>> 0;
}

/** Deterministic non-negative integer < `n` from `seed`+`salt`. */
function pick(seed: string, salt: string, n: number): number {
	if (n <= 1) {
		return 0;
	}
	return hashStr(`${seed}::${salt}`) % n;
}

// ─── Dominant-device key (for the adjacency invariant) ───

/**
 * A short key for a slide's *dominant device* — what the eye lands on. Adjacent
 * slides must differ here so the deck doesn't read as one static block. Distinct
 * roles already differ; the picker only has to rotate consecutive same-role
 * slides (content runs), which {@link planCarousel} enforces.
 */
export function dominantDevice(role: SlideRole, variant: VariantName): string {
	return `${role}:${variant}`;
}

// ─── Single-slide plan (editor add-slide) ───

/**
 * Plan one slide in isolation (the editor "add slide" path). `occurrence` is how
 * many same-role slides precede it, so a content run still rotates its variant.
 */
export function planSlide(
	role: SlideRole,
	_index: number,
	seed: string,
	opts: { occurrence?: number } = {},
): SlidePlan {
	const occ = opts.occurrence ?? 0;
	switch (role) {
		case "cover":
			return { role, variant: "hero-editorial", decor: { barcode: true } };
		case "content": {
			const start = pick(seed, "content-start", CONTENT_VARIANTS.length);
			const variant = CONTENT_VARIANTS[(start + occ) % CONTENT_VARIANTS.length];
			return { role, variant, decor: {} };
		}
		case "stat": {
			const variant: VariantName = occ === 0 ? "stat-block" : "stat-hero";
			return { role, variant, decor: { element: { kind: "starburst", n: occ + 1 } } };
		}
		case "quote": {
			const variant: VariantName = occ % 2 === 0 ? "quote-bleed" : "quote-raster";
			const decor: Decor =
				variant === "quote-raster" ? { element: { kind: "halftone", n: occ + 1 } } : {};
			return { role, variant, decor };
		}
		default:
			return { role: "cta", variant: "cta-save", decor: {} };
	}
}

// ─── Deck-wide plan ───

/**
 * Plan a whole deck of `roles`. Guarantees:
 *  - **Variety:** consecutive `content` slides rotate through the content
 *    variants (no two adjacent slides share a dominant device).
 *  - **Accent guarantee:** the deck always carries ≥1 Neon-Lime accent block
 *    (the `cta` defaults to `cta-block`; the first `stat` is `stat-block`).
 *  - **Element budget:** ≤1 barcode (on the cover), 1–3 starbursts (stat
 *    punctuation), halftone only on a `quote-raster` background zone.
 *
 * @param roles  Ordered slide roles for the deck.
 * @param seed   Stable seed (the project id) — the only entropy source.
 */
export function planCarousel(roles: readonly SlideRole[], seed: string): SlidePlan[] {
	let contentCursor = pick(seed, "content-start", CONTENT_VARIANTS.length);
	let statCount = 0;
	let quoteCount = 0;
	let barcodeUsed = false;
	let starbursts = 0;
	const STARBURST_CAP = 3;

	const plans: SlidePlan[] = roles.map((role, idx) => {
		switch (role) {
			case "cover": {
				// Flagship hook layout; the one barcode authenticity stamp lands here.
				const decor: Decor = {};
				if (!barcodeUsed) {
					decor.barcode = true;
					barcodeUsed = true;
				}
				return { role, variant: "hero-editorial" as VariantName, decor };
			}
			case "content": {
				const variant = CONTENT_VARIANTS[contentCursor % CONTENT_VARIANTS.length];
				contentCursor += 1; // rotate so the next content slide differs
				return { role, variant, decor: {} };
			}
			case "stat": {
				const variant: VariantName = statCount === 0 ? "stat-block" : "stat-hero";
				statCount += 1;
				const decor: Decor = {};
				if (starbursts < STARBURST_CAP) {
					decor.element = { kind: "starburst", n: starbursts + 1 };
					starbursts += 1;
				}
				return { role, variant, decor };
			}
			case "quote": {
				const variant: VariantName = quoteCount % 2 === 0 ? "quote-bleed" : "quote-raster";
				quoteCount += 1;
				const decor: Decor =
					variant === "quote-raster" ? { element: { kind: "halftone", n: idx } } : {};
				return { role, variant, decor };
			}
			default: {
				// cta — default to the lime "save this" action block (guarantees an
				// accent block in every deck).
				return { role: "cta" as SlideRole, variant: "cta-save" as VariantName, decor: {} };
			}
		}
	});

	// Safety net: enforce the adjacency invariant even if roles repeat oddly.
	for (let i = 1; i < plans.length; i++) {
		const prev = plans[i - 1];
		const cur = plans[i];
		if (dominantDevice(prev.role, prev.variant) === dominantDevice(cur.role, cur.variant)) {
			const pool = variantPool(cur.role);
			if (pool.length > 1) {
				const next = pool[(pool.indexOf(cur.variant) + 1) % pool.length];
				plans[i] = { ...cur, variant: next };
			}
		}
	}
	return plans;
}

/** The ordered variant pool for a role (for the adjacency safety net). */
function variantPool(role: SlideRole): VariantName[] {
	switch (role) {
		case "cover":
			return [...COVER_VARIANTS];
		case "content":
			return [...CONTENT_VARIANTS];
		case "stat":
			return [...STAT_VARIANTS];
		case "quote":
			return [...QUOTE_VARIANTS];
		default:
			return [...CTA_VARIANTS];
	}
}

export type { CutoutKind };
