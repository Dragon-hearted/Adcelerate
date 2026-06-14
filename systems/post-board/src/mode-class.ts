/**
 * Canonical mapping from brand style-mode id → the CSS class implemented in
 * `editor/styles/brand.css`. The class names are abbreviated for 5 of the 7
 * modes, so a naïve `mode-${styleMode}` is wrong — always route through
 * {@link modeClassFor}.
 *
 * Shared source of truth for: seed.ts (slide background cssClass), export.ts
 * (headless render, task #7), and the editor's mode switcher (task #5).
 */

/** style-mode id → brand.css class. */
export const MODE_CLASS: Record<string, string> = {
	"01-chrome-hero": "mode-01-chrome-hero",
	"02-lowpoly-neon-glow": "mode-02-lowpoly",
	"03-ascii-dotmatrix": "mode-03-ascii",
	"05-y2k-chrome": "mode-05-y2k",
	"06-ascii-glow-night": "mode-06-ascii-night",
	"07-chrome-space": "mode-07-chrome-space",
	"08-popart-screenprint": "mode-08-popart",
};

/** Default class when a style-mode id is unknown (light-first feed home turf). */
export const DEFAULT_MODE_CLASS = MODE_CLASS["08-popart-screenprint"];

/**
 * Resolve a style-mode id to its `brand.css` class, falling back to the
 * light-first pop-art class for unknown ids.
 */
export function modeClassFor(styleMode: string | undefined): string {
	if (styleMode && Object.hasOwn(MODE_CLASS, styleMode)) {
		return MODE_CLASS[styleMode];
	}
	return DEFAULT_MODE_CLASS;
}
