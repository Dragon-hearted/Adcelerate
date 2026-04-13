import yaml from "js-yaml";
import type { LibraryData } from "../types";

interface LibraryYaml {
	library?: {
		skills?: Array<{ name: string; description: string }>;
		agents?: Array<{ name: string; description: string }>;
		commands?: Array<{ name: string; description: string }>;
	};
}

/**
 * Reads library.yaml and returns counts + top entries for skills, agents, commands.
 */
export async function collectLibrary(monorepoRoot: string): Promise<LibraryData> {
	const result: LibraryData = {
		skillCount: 0,
		agentCount: 0,
		commandCount: 0,
		topSkills: [],
		topAgents: [],
	};

	try {
		const raw = await Bun.file(`${monorepoRoot}/library.yaml`).text();
		const parsed = yaml.load(raw) as LibraryYaml | null;

		if (!parsed?.library) return result;

		const skills = parsed.library.skills || [];
		const agents = parsed.library.agents || [];
		const commands = parsed.library.commands || [];

		result.skillCount = skills.length;
		result.agentCount = agents.length;
		result.commandCount = commands.length;

		result.topSkills = skills.slice(0, 10).map((s) => ({
			name: s.name,
			description: s.description || "",
		}));

		result.topAgents = agents.slice(0, 10).map((a) => ({
			name: a.name,
			description: a.description || "",
		}));
	} catch {
		console.warn("[library-collector] library.yaml not found");
	}

	return result;
}
