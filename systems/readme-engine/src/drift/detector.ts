import type { DriftStatus, ReadmeScope, SectionFingerprint } from "../types";
import { fingerprintKey, generateFingerprints, loadFingerprints } from "./fingerprint";

export interface DriftResult {
	sectionName: string;
	status: DriftStatus;
	storedHash: string | null;
	currentHash: string;
	sourceFiles: string[];
	lastChecked: string;
}

/** Compare stored fingerprints against current knowledge source state */
export async function detectDrift(scope: ReadmeScope): Promise<DriftResult[]> {
	const store = await loadFingerprints();
	const currentFingerprints = await generateFingerprints(scope);
	const results: DriftResult[] = [];

	for (const current of currentFingerprints) {
		const key = fingerprintKey(scope, current.sectionName);
		const stored: SectionFingerprint | undefined = store[key] as SectionFingerprint | undefined;

		let status: DriftStatus;
		let storedHash: string | null = null;

		if (!stored) {
			status = "unknown";
		} else {
			storedHash = stored.hash;
			status = stored.hash === current.hash ? "current" : "stale";
		}

		results.push({
			sectionName: current.sectionName,
			status,
			storedHash,
			currentHash: current.hash,
			sourceFiles: current.sourceFiles,
			lastChecked: stored?.timestamp ?? "never",
		});
	}

	return results;
}
