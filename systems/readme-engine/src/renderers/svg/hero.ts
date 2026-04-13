import {
  CANVAS, DARK, FONTS, ANIM, COLORS,
  domainTagToColor, glowFilterDefs, glowFilterId,
  svgDoc, titleText, accentLine, escXml,
} from "./design-tokens";

/**
 * Render a hero banner SVG (800x200).
 * Centered title with glow, decorative accent line, subtitle.
 * Staggered fade-in: title 0s, line 0.3s, subtitle 0.6s, breathing glow after 3s.
 */
export function renderHeroSvg(
  name: string,
  tagline: string,
  color: string,
  tags?: string[],
): string {
  const w = CANVAS.width;
  const h = 200;
  const cx = w / 2;
  const accentColor = tags?.length ? domainTagToColor(tags) : color;
  const usedColors = [color, accentColor];

  const defs = [
    glowFilterDefs(usedColors),
    // Breathing glow filter for title post-reveal
    `    <filter id="breathe-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
      <feFlood flood-color="${color}" flood-opacity="0.25" result="color" />
      <feComposite in="color" in2="blur" operator="in" result="glow" />
      <feMerge>
        <feMergeNode in="glow" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>`,
  ].join("\n");

  const titleFilterId = glowFilterId(usedColors, color);

  // Tag pills below subtitle
  let tagPills = "";
  if (tags?.length) {
    const pillY = 160;
    const pillH = 20;
    const pillPad = 10;
    const gap = 8;
    // Estimate total width for centering
    const pillWidths = tags.map((t) => t.length * 7.5 + pillPad * 2);
    const totalWidth = pillWidths.reduce((a, b) => a + b, 0) + (tags.length - 1) * gap;
    let px = cx - totalWidth / 2;

    tagPills = tags
      .map((tag, i) => {
        const pw = pillWidths[i];
        const tagColor = domainTagToColor([tag]);
        const pill = `  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" dur="${ANIM.fadeIn.dur}" begin="${0.8 + i * 0.15}s" fill="${ANIM.fadeIn.fill}" />
    <rect x="${px}" y="${pillY}" width="${pw}" height="${pillH}" rx="10" fill="${tagColor}18" stroke="${tagColor}" stroke-width="1" />
    <text x="${px + pw / 2}" y="${pillY + pillH / 2 + 4}" text-anchor="middle" fill="${tagColor}" font-family="${FONTS.body}" font-size="10" font-weight="500">${escXml(tag)}</text>
  </g>`;
        px += pw + gap;
        return pill;
      })
      .join("\n");
  }

  const body = [
    // Title with glow
    titleText({ x: cx, y: 72, text: name, size: 32, color: DARK.text, filterId: titleFilterId, delay: 0 }),
    // Decorative accent line
    accentLine({ cx, y: 96, width: 120, color: accentColor, delay: ANIM.staggerStep }),
    // Subtitle
    `  <g opacity="0">
    <animate attributeName="opacity" from="0" to="1" dur="${ANIM.fadeIn.dur}" begin="${ANIM.staggerStep * 2}s" fill="${ANIM.fadeIn.fill}" />
    <text x="${cx}" y="${130}" text-anchor="middle" fill="${DARK.secondary}" font-family="${FONTS.body}" font-size="15">${escXml(tagline)}</text>
  </g>`,
    tagPills,
  ]
    .filter(Boolean)
    .join("\n");

  return svgDoc(w, h, defs, body);
}
