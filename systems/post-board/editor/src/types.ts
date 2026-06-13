/**
 * Shared editor types. Model types are re-exported (type-only) from the server
 * modules so the editor and server never drift; `import type` is erased by the
 * bundler, so no Node code is pulled into the browser build.
 */

import type { BrandAsset } from "../../src/brand-assets";
import type { BrandBundle } from "../../src/brand-loader";

export type {
	Background,
	ElementLayer,
	ImageLayer,
	Layer,
	LogoLayer,
	LogoVariant,
	ObjectFit,
	Project,
	ProjectFormat,
	ShapeKind,
	ShapeLayer,
	Slide,
	SlideRole,
	TextAlign,
	TextLayer,
	Treatment,
} from "../../src/project";
export type {
	BrandBundle,
	BrandElement,
	BrandFont,
	PaletteColor,
	StyleMode,
} from "../../src/brand-loader";
export type { BrandAsset } from "../../src/brand-assets";

/** Response shape of `GET /api/brand` — the bundle plus the draggable palette. */
export interface BrandResponse extends BrandBundle {
	elementAssets: BrandAsset[];
}
