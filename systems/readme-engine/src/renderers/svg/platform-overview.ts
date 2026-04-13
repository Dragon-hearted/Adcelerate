import type { SystemData } from "../../types";
import {
  CANVAS, DARK, FONTS, ANIM, COLORS,
  domainTagToColor, glowFilterDefs, glowFilterId, arrowMarkerDef,
  svgDoc, glowRect, nodeCard, animatedLine, escXml,
} from "./design-tokens";

/**
 * Render a platform overview SVG (800x variable height).
 * Central hub node ("Adcelerate") with system nodes arranged in a semicircle.
 * Color-coded by domain tag, animated dash-flow connections.
 */
export function renderPlatformSvg(systems: SystemData[]): string {
  const w = CANVAS.width;
  const cx = w / 2;

  // Adaptive layout based on system count
  const count = systems.length;
  if (count === 0) {
    return svgDoc(w, 200, "", `  <text x="${cx}" y="100" text-anchor="middle" fill="${DARK.secondary}" font-family="${FONTS.body}" font-size="14">No systems registered</text>`);
  }

  const hubRadius = 45;
  const nodeW = 140;
  const nodeH = 56;
  const orbitRadius = Math.max(200, 160 + count * 8);
  const h = orbitRadius * 2 + 120;
  const hubCx = cx;
  const hubCy = h / 2;

  // Collect all colors for filters
  const systemColors = systems.map((s) => domainTagToColor(s.domainTags));
  const allColors = [...new Set([COLORS.indigo, ...systemColors])];

  const defs = [
    glowFilterDefs(allColors),
    arrowMarkerDef(DARK.secondary, "hub-arrow"),
  ].join("\n");

  const elements: string[] = [];

  // Hub node (Adcelerate) - appears first
  const hubFilterId = glowFilterId(allColors, COLORS.indigo);
  elements.push(`  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" dur="0.8s" begin="0s" fill="freeze" />
    ${glowRect({ x: hubCx - hubRadius, y: hubCy - hubRadius, w: hubRadius * 2, h: hubRadius * 2, rx: hubRadius, stroke: COLORS.indigo, fill: `${COLORS.indigo}18`, strokeWidth: 2, filterId: hubFilterId })}
    <text x="${hubCx}" y="${hubCy + 5}" text-anchor="middle" fill="${DARK.text}" font-family="${FONTS.body}" font-size="15" font-weight="700">Adcelerate</text>
  </g>`);

  // Arrange system nodes in a circle
  const angleStep = (2 * Math.PI) / count;
  const startAngle = -Math.PI / 2; // top

  for (let i = 0; i < count; i++) {
    const sys = systems[i];
    const color = systemColors[i];
    const filterId = glowFilterId(allColors, color);
    const angle = startAngle + i * angleStep;
    const nx = hubCx + orbitRadius * Math.cos(angle) - nodeW / 2;
    const ny = hubCy + orbitRadius * Math.sin(angle) - nodeH / 2;
    const nodeCx = nx + nodeW / 2;
    const nodeCy = ny + nodeH / 2;
    const delay = 0.5 + i * ANIM.staggerStep;

    // Connection line from hub edge to node edge
    const lineAngle = Math.atan2(nodeCy - hubCy, nodeCx - hubCx);
    const lineX1 = hubCx + (hubRadius + 4) * Math.cos(lineAngle);
    const lineY1 = hubCy + (hubRadius + 4) * Math.sin(lineAngle);
    const lineX2 = nodeCx - (nodeW / 2 + 4) * Math.cos(lineAngle);
    const lineY2 = nodeCy - (nodeH / 2 + 4) * Math.sin(lineAngle);

    elements.push(
      animatedLine({
        x1: lineX1,
        y1: lineY1,
        x2: lineX2,
        y2: lineY2,
        color,
        markerId: "hub-arrow",
        delay: delay - 0.15,
      }),
    );

    elements.push(
      nodeCard({
        x: nx,
        y: ny,
        w: nodeW,
        h: nodeH,
        label: sys.name,
        description: sys.description,
        color,
        filterId,
        delay,
      }),
    );
  }

  // Systems count badge at bottom
  elements.push(`  <text x="${cx}" y="${h - 20}" text-anchor="middle" fill="${DARK.secondary}" font-family="${FONTS.body}" font-size="11" opacity="0">
    <animate attributeName="opacity" from="0" to="0.7" dur="${ANIM.fadeIn.dur}" begin="${0.5 + count * ANIM.staggerStep + 0.5}s" fill="freeze" />
    ${escXml(`${count} system${count === 1 ? "" : "s"} registered`)}
  </text>`);

  return svgDoc(w, h, defs, elements.join("\n"));
}
