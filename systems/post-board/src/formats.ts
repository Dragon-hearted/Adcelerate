/**
 * Format presets — the fixed slide canvas sizes PostBoard supports in v1.
 *
 * Every project pins a preset (by id) plus explicit width/height into its
 * `format` field, so the editor stage and the headless export both render at the
 * exact post-ready pixel dimensions.
 */

/** A named, fixed-pixel slide canvas. */
export interface FormatPreset {
	/** Stable identifier persisted in `project.format.preset`. */
	id: string;
	/** Human-facing label for the editor UI. */
	label: string;
	/** Canvas width in pixels. */
	width: number;
	/** Canvas height in pixels. */
	height: number;
}

/** All v1 format presets, keyed by id. */
export const FORMAT_PRESETS = {
	"ig-4x5": { id: "ig-4x5", label: "Instagram 4:5 (Portrait)", width: 1080, height: 1350 },
	"ig-1x1": { id: "ig-1x1", label: "Instagram 1:1 (Square)", width: 1080, height: 1080 },
	"story-9x16": { id: "story-9x16", label: "Story / Reel 9:16", width: 1080, height: 1920 },
	"linkedin-4x5": {
		id: "linkedin-4x5",
		label: "LinkedIn 4:5 (Portrait)",
		width: 1080,
		height: 1350,
	},
} as const satisfies Record<string, FormatPreset>;

/** Union of valid format-preset ids. */
export type FormatId = keyof typeof FORMAT_PRESETS;

/** Ordered list of presets for menus/iteration. */
export const FORMAT_PRESET_LIST: readonly FormatPreset[] = Object.values(FORMAT_PRESETS);

/** Default preset used when a brief does not specify one. */
export const DEFAULT_FORMAT_ID: FormatId = "ig-4x5";

/** Type guard for a format-preset id. */
export function isFormatId(value: string): value is FormatId {
	return Object.hasOwn(FORMAT_PRESETS, value);
}

/**
 * Look up a preset by id.
 *
 * @throws if `id` is not a known preset.
 */
export function getFormatPreset(id: string): FormatPreset {
	if (!isFormatId(id)) {
		throw new Error(
			`Unknown format preset: "${id}". Valid ids: ${Object.keys(FORMAT_PRESETS).join(", ")}`,
		);
	}
	return FORMAT_PRESETS[id];
}
