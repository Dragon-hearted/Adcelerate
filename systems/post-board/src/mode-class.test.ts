import { describe, expect, test } from "bun:test";
import { DEFAULT_MODE_CLASS, MODE_CLASS, modeClassFor } from "./mode-class";

describe("mode-class mapping", () => {
	test("abbreviated classes match brand.css exactly", () => {
		expect(MODE_CLASS).toEqual({
			"01-chrome-hero": "mode-01-chrome-hero",
			"02-lowpoly-neon-glow": "mode-02-lowpoly",
			"03-ascii-dotmatrix": "mode-03-ascii",
			"05-y2k-chrome": "mode-05-y2k",
			"06-ascii-glow-night": "mode-06-ascii-night",
			"07-chrome-space": "mode-07-chrome-space",
			"08-popart-screenprint": "mode-08-popart",
		});
	});

	test("modeClassFor resolves known ids", () => {
		expect(modeClassFor("02-lowpoly-neon-glow")).toBe("mode-02-lowpoly");
		expect(modeClassFor("08-popart-screenprint")).toBe("mode-08-popart");
	});

	test("modeClassFor falls back for unknown/undefined ids", () => {
		expect(modeClassFor("nope")).toBe(DEFAULT_MODE_CLASS);
		expect(modeClassFor(undefined)).toBe(DEFAULT_MODE_CLASS);
		expect(DEFAULT_MODE_CLASS).toBe("mode-08-popart");
	});
});
