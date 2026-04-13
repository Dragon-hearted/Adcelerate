import type { GraphData, SystemData } from "../types";

/**
 * Escape special characters in mermaid node labels.
 * Wraps labels containing quotes or parentheses in double quotes,
 * and escapes internal quotes.
 */
function escapeLabel(label: string): string {
	if (/["()[\]{}]/.test(label)) {
		return `"${label.replace(/"/g, "#quot;")}"`;
	}
	return label;
}

/**
 * Sanitize a node ID for mermaid — alphanumeric and underscores only.
 */
function nodeId(name: string): string {
	return name.replace(/[^a-zA-Z0-9_]/g, "_");
}

/**
 * Generate a `graph TD` mermaid diagram showing system dependencies from graph.yaml.
 */
export function dependencyGraph(graphData: GraphData): string {
	const lines: string[] = ["```mermaid", "graph TD"];

	for (const [system, data] of Object.entries(graphData.systems)) {
		const id = nodeId(system);
		lines.push(`    ${id}[${escapeLabel(system)}]`);
		for (const dep of data.depends_on) {
			const depId = nodeId(dep);
			lines.push(`    ${id} --> ${depId}`);
		}
	}

	lines.push("```");
	return lines.join("\n");
}

/**
 * Generate a `flowchart LR` mermaid diagram showing a system's pipeline stages.
 */
export function pipelineFlow(systemName: string, stages: string[]): string {
	if (stages.length === 0) return "";

	const lines: string[] = ["```mermaid", "flowchart LR"];

	for (let i = 0; i < stages.length; i++) {
		const id = nodeId(`${systemName}_stage_${i}`);
		lines.push(`    ${id}[${escapeLabel(stages[i])}]`);
		if (i > 0) {
			const prevId = nodeId(`${systemName}_stage_${i - 1}`);
			lines.push(`    ${prevId} --> ${id}`);
		}
	}

	lines.push("```");
	return lines.join("\n");
}

/**
 * Generate a `graph TB` mermaid diagram showing the platform overview with system layers.
 */
export function platformOverview(systems: SystemData[]): string {
	if (systems.length === 0) return "";

	const lines: string[] = ["```mermaid", "graph TB"];

	// Group by domain tags
	const groups = new Map<string, SystemData[]>();
	for (const sys of systems) {
		const tag = sys.domainTags[0] ?? "core";
		const existing = groups.get(tag) ?? [];
		existing.push(sys);
		groups.set(tag, existing);
	}

	for (const [tag, groupSystems] of groups) {
		const subgraphId = nodeId(tag);
		lines.push(`    subgraph ${subgraphId}[${escapeLabel(tag)}]`);
		for (const sys of groupSystems) {
			lines.push(`        ${nodeId(sys.name)}[${escapeLabel(sys.name)}]`);
		}
		lines.push("    end");
	}

	// Add dependency edges
	for (const sys of systems) {
		const srcId = nodeId(sys.name);
		for (const dep of sys.dependencies) {
			const depId = nodeId(dep);
			lines.push(`    ${srcId} --> ${depId}`);
		}
	}

	lines.push("```");
	return lines.join("\n");
}
