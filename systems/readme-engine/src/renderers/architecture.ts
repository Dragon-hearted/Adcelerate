export interface ArchBox {
	label: string;
	children?: ArchBox[];
}

export interface ArchLayer {
	label: string;
	boxes: ArchBox[];
}

export interface ArchDiagram {
	title: string;
	layers: ArchLayer[];
	connections?: Array<{ from: string; to: string; label?: string }>;
}

/**
 * Draw a horizontal box with box-drawing characters.
 * Uses ┌─┐│└─┘ for borders.
 */
function drawBox(label: string, width: number): string[] {
	const inner = width - 2;
	const padded = label.length > inner ? label.slice(0, inner) : label;
	const leftPad = Math.floor((inner - padded.length) / 2);
	const rightPad = inner - padded.length - leftPad;

	return [
		`┌${"─".repeat(inner)}┐`,
		`│${" ".repeat(leftPad)}${padded}${" ".repeat(rightPad)}│`,
		`└${"─".repeat(inner)}┘`,
	];
}

/**
 * Draw multiple boxes side by side within a container.
 */
function drawBoxRow(boxes: ArchBox[], boxWidth: number, indent: string): string[] {
	if (boxes.length === 0) return [];

	const rendered = boxes.map((b) => drawBox(b.label, boxWidth));
	const height = rendered[0].length;
	const lines: string[] = [];

	for (let row = 0; row < height; row++) {
		const segments = rendered.map((r) => r[row]);
		lines.push(`${indent}${segments.join("   ")}`);
	}

	return lines;
}

/**
 * Generate an ASCII architecture diagram using box-drawing characters,
 * matching the visual style of Pinboard's README.
 */
export function renderArchitecture(diagram: ArchDiagram): string {
	const lines: string[] = [];
	const totalWidth = 68;
	const indent = "│  ";

	// Outer container top
	lines.push(`┌${"─".repeat(totalWidth)}┐`);

	// Title
	const titlePad = Math.floor((totalWidth - diagram.title.length) / 2);
	lines.push(
		`│${" ".repeat(titlePad)}${diagram.title}${" ".repeat(totalWidth - titlePad - diagram.title.length)}│`,
	);
	lines.push(`│${" ".repeat(totalWidth)}│`);

	for (const layer of diagram.layers) {
		// Layer label
		if (layer.label) {
			const layerPad = Math.floor((totalWidth - layer.label.length - 4) / 2);
			lines.push(
				`│${" ".repeat(layerPad)}  ${layer.label}${" ".repeat(totalWidth - layerPad - layer.label.length - 2)}│`,
			);
		}

		// Draw boxes
		if (layer.boxes.length > 0) {
			const availableWidth = totalWidth - 6; // margins
			const boxWidth = Math.min(Math.floor(availableWidth / layer.boxes.length) - 2, 20);
			const boxLines = drawBoxRow(layer.boxes, boxWidth, indent);
			for (const bl of boxLines) {
				const padRight = totalWidth - bl.length - 1;
				lines.push(`${bl}${padRight > 0 ? " ".repeat(padRight) : ""}│`);
			}
		}

		lines.push(`│${" ".repeat(totalWidth)}│`);
	}

	// Connection annotations
	if (diagram.connections && diagram.connections.length > 0) {
		lines.push(`│${" ".repeat(totalWidth)}│`);
		for (const conn of diagram.connections) {
			const arrow = conn.label
				? `  ${conn.from} ──▶ ${conn.to} (${conn.label})`
				: `  ${conn.from} ──▶ ${conn.to}`;
			const connPad = totalWidth - arrow.length;
			lines.push(`│${arrow}${connPad > 0 ? " ".repeat(connPad) : ""}│`);
		}
	}

	// Outer container bottom
	lines.push(`└${"─".repeat(totalWidth)}┘`);

	return `\`\`\`\n${lines.join("\n")}\n\`\`\``;
}
