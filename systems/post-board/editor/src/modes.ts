/**
 * Style-mode id → CSS class mapping.
 *
 * brand.json style_mode ids are verbose (e.g. `08-popart-screenprint`) while the
 * brand.css mode classes are abbreviated (`.mode-08-popart`). This map is the
 * single source of truth that bridges the two; the editor renders + persists the
 * correct `background.cssClass` so the headless export (task #7) styles modes
 * identically.
 */

import type { Project } from "./types";

/** Verbose style-mode id → brand.css mode class. */
export const MODE_CLASS: Record<string, string> = {
	"01-chrome-hero": "mode-01-chrome-hero",
	"02-lowpoly-neon-glow": "mode-02-lowpoly",
	"03-ascii-dotmatrix": "mode-03-ascii",
	"05-y2k-chrome": "mode-05-y2k",
	"06-ascii-glow-night": "mode-06-ascii-night",
	"07-chrome-space": "mode-07-chrome-space",
	"08-popart-screenprint": "mode-08-popart",
};

/** Resolve a style-mode id to its CSS class (falls back to `mode-<id>`). */
export function modeClass(styleModeId: string | undefined): string {
	if (!styleModeId) {
		return "";
	}
	return MODE_CLASS[styleModeId] ?? `mode-${styleModeId}`;
}

/**
 * Rewrite every CSS background's `cssClass` to the canonical class for its
 * style mode, in place. Run once on load so persisted projects carry the class
 * the export pipeline expects.
 */
export function normalizeModeClasses(project: Project): Project {
	for (const slide of project.slides) {
		if (slide.background.type === "css") {
			const mode = slide.background.styleMode ?? project.styleMode;
			slide.background.styleMode = mode;
			slide.background.cssClass = modeClass(mode);
		}
	}
	return project;
}
