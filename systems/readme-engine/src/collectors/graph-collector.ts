import yaml from "js-yaml";
import type { GraphData } from "../types";

interface GraphYaml {
	systems?: Record<
		string,
		{
			depends_on?: Array<{ system: string; type: string }>;
			shared_models?: string[];
			related_systems?: string[];
		}
	>;
	relationships?: Array<{
		from: string;
		to: string;
		type: string;
		description?: string;
	}>;
}

interface GraphReport {
	godNodes: string[];
	communities: Array<{ name: string; members: string[] }>;
}

/**
 * Reads knowledge/graph.yaml and graphify-out/GRAPH_REPORT.md.
 * Returns dependency topology, relationships, communities, and god nodes.
 */
export async function collectGraph(monorepoRoot: string): Promise<GraphData> {
	const result: GraphData = {
		systems: {},
		relationships: [],
		communities: [],
		godNodes: [],
	};

	// Parse graph.yaml
	try {
		const raw = await Bun.file(`${monorepoRoot}/knowledge/graph.yaml`).text();
		const parsed = yaml.load(raw) as GraphYaml | null;

		if (parsed?.systems) {
			for (const [id, entry] of Object.entries(parsed.systems)) {
				result.systems[id] = {
					depends_on: (entry.depends_on || []).map((d) => d.system),
				};
			}
		}

		if (parsed?.relationships) {
			result.relationships = parsed.relationships.map((r) => ({
				from: r.from,
				to: r.to,
				type: r.type,
			}));
		}
	} catch {
		console.warn("[graph-collector] knowledge/graph.yaml not found");
	}

	// Parse GRAPH_REPORT.md for god nodes and communities
	try {
		const report = await Bun.file(`${monorepoRoot}/graphify-out/GRAPH_REPORT.md`).text();
		const reportData = parseGraphReport(report);
		result.godNodes = reportData.godNodes;
		result.communities = reportData.communities;
	} catch {
		console.warn("[graph-collector] GRAPH_REPORT.md not found");
	}

	return result;
}

function parseGraphReport(content: string): GraphReport {
	const godNodes: string[] = [];
	const communities: Array<{ name: string; members: string[] }> = [];

	// Extract god nodes: lines like "1. `ChartRenderer` - 17 edges"
	const godSection = content.match(/## God Nodes.*?\n([\s\S]*?)(?=\n## |\n$)/);
	if (godSection) {
		const nodeMatches = godSection[1].matchAll(/\d+\.\s+`([^`]+)`/g);
		for (const m of nodeMatches) {
			godNodes.push(m[1]);
		}
	}

	// Extract communities: "### Community N - "Name""
	const communityMatches = content.matchAll(
		/### Community \d+ - "([^"]+)"\n(?:Cohesion:.*\n)?Nodes \(\d+\): ([^\n]+)/g,
	);
	for (const m of communityMatches) {
		const name = m[1];
		// Parse node list, handling "(+N more)" suffix
		const memberStr = m[2].replace(/\s*\(\+\d+ more\)\s*$/, "");
		const members = memberStr.split(", ").map((s) => s.trim());
		communities.push({ name, members });
	}

	return { godNodes, communities };
}
