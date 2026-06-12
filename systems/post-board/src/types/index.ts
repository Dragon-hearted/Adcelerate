/**
 * Shared type + schema barrel for PostBoard.
 *
 * Re-exports the normalized brand bundle types, the format presets, and the
 * project document schema/types so consumers (server, editor build, CLI, tests)
 * can import from a single entry point.
 */

export type {
	BackgroundSystem,
	BackgroundTexture,
	BrandBundle,
	BrandElement,
	BrandFont,
	BrandLogo,
	BrandLogoRules,
	BrandPositioning,
	BrandTagline,
	BrandVoice,
	HeroMode,
	LoadBrandOptions,
	PaletteColor,
	StyleMode,
} from "../brand-loader";
export { loadBrand, loadBrandJson } from "../brand-loader";

export type { FormatId, FormatPreset } from "../formats";
export {
	DEFAULT_FORMAT_ID,
	FORMAT_PRESET_LIST,
	FORMAT_PRESETS,
	getFormatPreset,
	isFormatId,
} from "../formats";

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
	ProjectStoreOptions,
	ProjectType,
	Slide,
	SlideRole,
	TextAlign,
	TextLayer,
	Treatment,
} from "../project";
export {
	backgroundSchema,
	layerSchema,
	listProjects,
	loadProject,
	parseProject,
	projectDir,
	projectFile,
	projectSchema,
	safeParseProject,
	saveProject,
	slideSchema,
} from "../project";

export {
	brandJsonPath,
	DEFAULT_BRAND_SLUG,
	projectsRoot,
	resolveMonorepoRoot,
} from "../root";
