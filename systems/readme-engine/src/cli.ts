import { detect, generate, update } from "./index";
import type { ReadmeScope } from "./types";

function parseTarget(target: string): ReadmeScope[] {
	if (target === "root") {
		return [{ type: "root" }];
	}
	if (target === "all") {
		return [{ type: "root" }, { type: "system" }, { type: "app" }];
	}
	if (target.startsWith("system:")) {
		const name = target.slice("system:".length);
		return [{ type: "system", name }];
	}
	if (target.startsWith("app:")) {
		const name = target.slice("app:".length);
		return [{ type: "app", name }];
	}
	console.error(`Unknown target: ${target}`);
	console.error("Valid targets: root, all, system:<name>, app:<name>");
	process.exit(1);
}

function printUsage(): void {
	console.log(`
ReadmeEngine — Automated README generation and maintenance

Usage:
  bun run src/cli.ts <command> --target <target>

Commands:
  generate    Generate README.md files from knowledge sources
  detect      Detect drift between knowledge sources and existing READMEs
  update      Selectively update stale sections in existing READMEs

Targets:
  root            Monorepo root README
  system:<name>   README for a specific system (e.g., system:pinboard)
  app:<name>      README for a specific app (e.g., app:server)
  all             All targets (root + all systems + all apps)

Examples:
  bun run src/cli.ts generate --target root
  bun run src/cli.ts generate --target system:pinboard
  bun run src/cli.ts generate --target all
  bun run src/cli.ts detect --target all
  bun run src/cli.ts update --target system:pinboard
`);
}

async function main(): Promise<void> {
	const args = process.argv.slice(2);

	if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
		printUsage();
		process.exit(0);
	}

	const command = args[0];
	const targetIdx = args.indexOf("--target");

	if (targetIdx === -1 || !args[targetIdx + 1]) {
		console.error("Error: --target flag is required");
		printUsage();
		process.exit(1);
	}

	const target = args[targetIdx + 1];
	const scopes = parseTarget(target);

	switch (command) {
		case "generate":
			for (const scope of scopes) {
				await generate(scope);
			}
			break;
		case "detect":
			for (const scope of scopes) {
				const report = await detect(scope);
				console.log(JSON.stringify(report, null, 2));
			}
			break;
		case "update":
			for (const scope of scopes) {
				await update(scope);
			}
			break;
		default:
			console.error(`Unknown command: ${command}`);
			printUsage();
			process.exit(1);
	}
}

main().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
