/**
 * Reusable README sections shared across all template scopes.
 * Produces HTML/markdown matching Pinboard visual quality.
 */

/** Centered hero header with h1, tagline, and badge row */
export function centeredHero(name: string, tagline: string, badges: string): string {
	const lines: string[] = ['<div align="center">', ""];
	lines.push(`# ${name}`);
	lines.push("");
	lines.push(`### ${tagline}`);
	lines.push("");

	if (badges) {
		lines.push(badges);
		lines.push("");
	}

	lines.push("</div>");
	return lines.join("\n");
}

/** Centered footer with "Built with" line */
export function footer(builtWith: string): string {
	const lines: string[] = ['<div align="center">', "", `**Built with** ${builtWith}`, "", "</div>"];
	return lines.join("\n");
}

/** Standard contributing section */
export function contributing(): string {
	return `## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. Fork the repository
2. Create a feature branch: \`git checkout -b feat/my-feature\`
3. Make your changes and ensure tests pass
4. Commit your changes and open a pull request`;
}

/** MIT license section */
export function license(): string {
	return `## 📄 License

This project is licensed under the [MIT License](LICENSE).`;
}
