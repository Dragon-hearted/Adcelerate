/**
 * PromptWriter — Centralized AI Prompt Engineering Knowledge System
 *
 * System entry point. Exports metadata and registry operations.
 */

export const metadata = {
	name: "prompt-writer",
	displayName: "PromptWriter",
	version: "0.1.0",
	description:
		"Centralized prompt engineering knowledge system with per-model guides, visual direction references, and a model registry for AI image, video, and voice generation",
} as const;

export { readRegistry, validateRegistry, listModels, addModel } from "./registry";
