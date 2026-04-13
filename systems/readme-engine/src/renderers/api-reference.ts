export interface ApiEndpoint {
	method: string;
	path: string;
	description: string;
}

/**
 * Parse Hono-style route definitions from source code.
 * Looks for patterns like app.get("/path", ...) or .post("/path", ...).
 */
export function parseRoutes(sourceCode: string, fileHint?: string): ApiEndpoint[] {
	const endpoints: ApiEndpoint[] = [];
	const routePattern = /\.(get|post|put|patch|delete)\(\s*["'`](\/[^"'`]*)["'`]/gi;

	let match = routePattern.exec(sourceCode);
	while (match !== null) {
		const method = match[1].toUpperCase();
		const path = match[2];

		// Try to extract a description from a preceding comment
		const before = sourceCode.slice(Math.max(0, match.index - 200), match.index);
		const commentMatch = before.match(/\/\/\s*(.+?)\s*$/m) ?? before.match(/\*\s+(.+?)\s*\*\/\s*$/);
		const description = commentMatch?.[1] ?? inferDescription(method, path);

		endpoints.push({ method, path, description });
		match = routePattern.exec(sourceCode);
	}

	return endpoints;
}

/**
 * Infer a description from HTTP method + path when no comment is found.
 */
function inferDescription(method: string, path: string): string {
	const segments = path.split("/").filter(Boolean);
	const resource = segments.find((s) => !s.startsWith(":") && s !== "api") ?? "resource";

	switch (method) {
		case "GET":
			return path.includes(":") ? `Get ${resource} by ID` : `List ${resource}`;
		case "POST":
			return `Create ${resource}`;
		case "PUT":
		case "PATCH":
			return `Update ${resource}`;
		case "DELETE":
			return `Delete ${resource}`;
		default:
			return "";
	}
}

/**
 * Generate an API reference table from parsed endpoints.
 * Matches Pinboard README table format with Method, Endpoint, Description columns.
 */
export function renderApiReference(endpoints: ApiEndpoint[]): string {
	if (endpoints.length === 0) return "";

	const lines: string[] = [
		"| Method | Endpoint | Description |",
		"|--------|----------|-------------|",
	];

	for (const ep of endpoints) {
		lines.push(`| \`${ep.method}\` | \`${ep.path}\` | ${ep.description} |`);
	}

	return lines.join("\n");
}
