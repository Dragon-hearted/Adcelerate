import {
  CANVAS, DARK, ANIM,
  glowFilterDefs, glowFilterId, arrowMarkerDef,
  svgDoc, nodeCard, animatedLine,
} from "./design-tokens";

/**
 * Render a pipeline SVG (800x300).
 * Horizontal flow of stage cards with animated dashed connections and arrows.
 * Staggered fade-in left to right (0.5s intervals), cards float after reveal.
 */
export function renderPipelineSvg(
  systemName: string,
  stages: string[],
  color: string,
): string {
  const w = CANVAS.width;
  const h = 300;

  if (stages.length === 0) {
    return svgDoc(w, h, "", `  <text x="${w / 2}" y="${h / 2}" text-anchor="middle" fill="${DARK.secondary}" font-family="Inter, system-ui, sans-serif" font-size="14">No pipeline stages defined</text>`);
  }

  const usedColors = [color];
  const filterId = glowFilterId(usedColors, color);

  // Layout: cards evenly spaced across canvas
  const cardW = Math.min(130, (w - 60) / stages.length - 20);
  const cardH = 60;
  const totalCardsW = stages.length * cardW + (stages.length - 1) * 40;
  const startX = (w - totalCardsW) / 2;
  const cardY = (h - cardH) / 2;
  const stagger = 0.5;

  const defs = [
    glowFilterDefs(usedColors),
    arrowMarkerDef(color, "pipe-arrow"),
  ].join("\n");

  const elements: string[] = [];

  // Title
  elements.push(`  <text x="${w / 2}" y="36" text-anchor="middle" fill="${DARK.text}" font-family="Inter, system-ui, sans-serif" font-size="16" font-weight="600" opacity="0">
    <animate attributeName="opacity" from="0" to="1" dur="${ANIM.fadeIn.dur}" begin="0s" fill="${ANIM.fadeIn.fill}" />
    ${systemName} Pipeline
  </text>`);

  for (let i = 0; i < stages.length; i++) {
    const x = startX + i * (cardW + 40);
    const delay = (i + 1) * stagger;

    // Connection line to next card
    if (i < stages.length - 1) {
      const lineDelay = delay + stagger * 0.5;
      elements.push(
        animatedLine({
          x1: x + cardW + 4,
          y1: cardY + cardH / 2,
          x2: x + cardW + 36,
          y2: cardY + cardH / 2,
          color,
          markerId: "pipe-arrow",
          delay: lineDelay,
        }),
      );
    }

    // Stage card
    elements.push(
      nodeCard({
        x,
        y: cardY,
        w: cardW,
        h: cardH,
        label: stages[i],
        color,
        filterId,
        delay,
      }),
    );
  }

  return svgDoc(w, h, defs, elements.join("\n"));
}
