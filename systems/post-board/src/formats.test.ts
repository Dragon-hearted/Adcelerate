import { describe, expect, test } from "bun:test";
import {
	DEFAULT_FORMAT_ID,
	FORMAT_PRESETS,
	FORMAT_PRESET_LIST,
	getFormatPreset,
	isFormatId,
} from "./formats";

describe("format presets", () => {
	test("all four presets exist with correct dimensions", () => {
		expect(FORMAT_PRESETS["ig-4x5"]).toMatchObject({ width: 1080, height: 1350 });
		expect(FORMAT_PRESETS["ig-1x1"]).toMatchObject({ width: 1080, height: 1080 });
		expect(FORMAT_PRESETS["story-9x16"]).toMatchObject({ width: 1080, height: 1920 });
		expect(FORMAT_PRESETS["linkedin-4x5"]).toMatchObject({ width: 1080, height: 1350 });
	});

	test("preset ids are self-consistent", () => {
		for (const preset of FORMAT_PRESET_LIST) {
			expect(getFormatPreset(preset.id)).toEqual(preset);
			expect(isFormatId(preset.id)).toBe(true);
		}
	});

	test("list covers exactly the four v1 presets", () => {
		expect(FORMAT_PRESET_LIST.map((p) => p.id).sort()).toEqual([
			"ig-1x1",
			"ig-4x5",
			"linkedin-4x5",
			"story-9x16",
		]);
	});

	test("default format id is valid", () => {
		expect(isFormatId(DEFAULT_FORMAT_ID)).toBe(true);
	});

	test("unknown id throws / is rejected by guard", () => {
		expect(isFormatId("nope")).toBe(false);
		expect(() => getFormatPreset("nope")).toThrow();
	});
});
