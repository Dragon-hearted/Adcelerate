export { generate } from "./generate";
export { update } from "./update";

// Re-export detect from drift module
import { generateReport, printReport } from "./drift";
import type { DriftReport, ReadmeScope } from "./types";

/**
 * Detect drift between knowledge sources and existing READMEs.
 * Compares stored fingerprints against current state.
 */
export async function detect(scope: ReadmeScope): Promise<DriftReport> {
	const report = await generateReport(scope);
	printReport(report);
	return report;
}
