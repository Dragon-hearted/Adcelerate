import type { DriftReport, DriftStatus, ReadmeScope } from "../types";
import { detectDrift } from "./detector";

/** Run drift detection and format as a DriftReport */
export async function generateReport(scope: ReadmeScope): Promise<DriftReport> {
	const results = await detectDrift(scope);
	const recommendations: string[] = [];

	const staleSections = results.filter((r) => r.status === "stale");
	const unknownSections = results.filter((r) => r.status === "unknown");

	if (staleSections.length > 0) {
		const names = staleSections.map((s) => s.sectionName).join(", ");
		recommendations.push(`Update stale sections: ${names}`);
	}

	if (unknownSections.length > 0) {
		recommendations.push(
			"Run a full generate to establish baseline fingerprints for unknown sections",
		);
	}

	if (staleSections.length === 0 && unknownSections.length === 0) {
		recommendations.push("All sections are current — no updates needed");
	}

	return {
		scope,
		sections: results.map((r) => ({
			name: r.sectionName,
			status: r.status,
			lastChecked: r.lastChecked,
		})),
		recommendations,
	};
}

/** Pretty-print a drift report to console */
export function printReport(report: DriftReport): void {
	const scopeLabel = report.scope.name
		? `${report.scope.type}:${report.scope.name}`
		: report.scope.type;

	const STATUS_ICONS: Record<DriftStatus, string> = {
		current: "\u2705",
		stale: "\u26a0\ufe0f",
		unknown: "\u2753",
	};

	console.log(`\n--- Drift Report: ${scopeLabel} ---\n`);

	for (const section of report.sections) {
		const icon = STATUS_ICONS[section.status];
		const checked =
			section.lastChecked === "never" ? "(no baseline)" : `(checked: ${section.lastChecked})`;
		console.log(`  ${icon} ${section.name}: ${section.status} ${checked}`);
	}

	if (report.recommendations.length > 0) {
		console.log("\nRecommendations:");
		for (const rec of report.recommendations) {
			console.log(`  - ${rec}`);
		}
	}

	console.log("");
}
