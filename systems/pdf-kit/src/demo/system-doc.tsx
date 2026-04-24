// system-doc.tsx — Smoke-test document for pdf-kit.
// Default-exports a BrandedDoc element so render.ts can pick it up directly.

import { BrandedDoc } from "../template";

const BODY = `Adcelerate is a modular AI-powered creative production monorepo. \
It comprises specialist systems — image generation, video captioning, storyboarding, \
PDF rendering, and more — each wired to a shared design-system token layer and \
discoverable via systems.yaml.

This smoke-test document verifies that pdf-kit correctly resolves the design-system \
adapter, registers Archivo Black and Inter via Google Fonts URLs, and renders a \
branded A4 cover-plus-content layout to a binary PDF file.

Typography scale used: Archivo Black 28pt (cover title), Inter 700 20pt (section \
headings), Inter 400 10pt (body text), Inter 500 8pt (footer meta). Color palette: \
ink #1A1714 cover background, paper #EEE6D4 page background, oxblood #8B2A1D accent.`;

export default (
	<BrandedDoc
		title="Adcelerate Design System Smoke Test"
		subtitle="pdf-kit · @react-pdf/renderer · April 2026"
		body={BODY}
	/>
);
