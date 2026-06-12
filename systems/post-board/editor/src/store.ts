/**
 * Central editor store: holds the loaded brand + project, the active-slide and
 * selection cursors, the undo/redo snapshot stacks, and the debounced autosave.
 * Panels subscribe to `emit()` and re-render from this single source of truth.
 */

import { getFormatPreset } from "../../src/formats";
import { layoutForRole } from "../../src/templates";
import * as api from "./api";
import { modeClass } from "./modes";
import type {
	BrandResponse,
	Layer,
	LogoVariant,
	ObjectFit,
	Project,
	Slide,
	SlideRole,
	TextAlign,
	Treatment,
} from "./types";

/** Why the store changed — lets subscribers do the minimal re-render. */
export type EmitReason = "structure" | "selection" | "status";
type Listener = (reason: EmitReason) => void;

const AUTOSAVE_MS = 800;
const HISTORY_LIMIT = 40;

/**
 * A shallow patch applied to a layer (kind is never changed). Explicit union of
 * every editable field across layer kinds — a `Partial<Omit<Layer, "kind">>`
 * collapses the discriminated union to only its shared keys.
 */
export interface LayerPatch {
	x?: number;
	y?: number;
	w?: number;
	h?: number;
	rotation?: number;
	z?: number;
	locked?: boolean;
	// text
	content?: string;
	fontFamily?: string;
	fontWeight?: string | number;
	fontSize?: number;
	color?: string;
	treatment?: Treatment;
	align?: TextAlign;
	lineHeight?: number;
	letterSpacing?: number;
	// image
	src?: string;
	objectFit?: ObjectFit;
	// element
	elementId?: string;
	// logo
	variant?: LogoVariant;
}

export class Store {
	activeSlideIndex = 0;
	selection: string[] = [];
	dirty = false;
	saving = false;
	lastError: string | null = null;
	lastSavedAt: number | null = null;

	private undoStack: string[] = [];
	private redoStack: string[] = [];
	private listeners = new Set<Listener>();
	private saveTimer: ReturnType<typeof setTimeout> | null = null;

	constructor(
		readonly brand: BrandResponse,
		public project: Project,
	) {}

	// ─── Subscription ───

	subscribe(fn: Listener): () => void {
		this.listeners.add(fn);
		return () => {
			this.listeners.delete(fn);
		};
	}

	emit(reason: EmitReason = "structure"): void {
		for (const fn of this.listeners) {
			fn(reason);
		}
	}

	// ─── Cursors ───

	activeSlide(): Slide {
		return this.project.slides[this.activeSlideIndex] ?? this.project.slides[0];
	}

	selectedLayers(): Layer[] {
		const slide = this.activeSlide();
		return slide.layers.filter((l) => this.selection.includes(l.id));
	}

	setActiveSlide(index: number): void {
		this.activeSlideIndex = Math.max(0, Math.min(index, this.project.slides.length - 1));
		this.selection = [];
		this.emit();
	}

	setSelection(ids: string[]): void {
		this.selection = ids;
		this.emit("selection");
	}

	// ─── History ───

	private snapshot(): void {
		this.undoStack.push(JSON.stringify(this.project));
		if (this.undoStack.length > HISTORY_LIMIT) {
			this.undoStack.shift();
		}
		this.redoStack = [];
	}

	canUndo(): boolean {
		return this.undoStack.length > 0;
	}

	canRedo(): boolean {
		return this.redoStack.length > 0;
	}

	undo(): void {
		const prev = this.undoStack.pop();
		if (!prev) {
			return;
		}
		this.redoStack.push(JSON.stringify(this.project));
		this.project = JSON.parse(prev) as Project;
		this.clampCursors();
		this.afterMutation(false);
	}

	redo(): void {
		const next = this.redoStack.pop();
		if (!next) {
			return;
		}
		this.undoStack.push(JSON.stringify(this.project));
		this.project = JSON.parse(next) as Project;
		this.clampCursors();
		this.afterMutation(false);
	}

	private clampCursors(): void {
		if (this.activeSlideIndex >= this.project.slides.length) {
			this.activeSlideIndex = this.project.slides.length - 1;
		}
		const ids = new Set(this.activeSlide().layers.map((l) => l.id));
		this.selection = this.selection.filter((id) => ids.has(id));
	}

	// ─── Mutation core ───

	/**
	 * Mutate the project via `fn`, snapshot history, mark dirty, schedule
	 * autosave, and re-render. Pass `snapshot:false` for cheap live updates that
	 * already snapshotted (e.g. drag commit reuses the pre-drag snapshot).
	 */
	mutate(fn: (project: Project) => void, snapshot = true): void {
		if (snapshot) {
			this.snapshot();
		}
		fn(this.project);
		this.afterMutation(true);
	}

	private afterMutation(touch: boolean): void {
		if (touch) {
			this.project.updatedAt = new Date().toISOString();
		}
		this.dirty = true;
		this.scheduleSave();
		this.emit();
	}

	// ─── Layer ops ───

	updateLayer(layerId: string, patch: LayerPatch, snapshot = true): void {
		this.mutate((p) => {
			const slide = p.slides[this.activeSlideIndex];
			const idx = slide.layers.findIndex((l) => l.id === layerId);
			if (idx >= 0) {
				slide.layers[idx] = { ...slide.layers[idx], ...patch } as Layer;
			}
		}, snapshot);
	}

	addLayer(layer: Layer): void {
		this.mutate((p) => {
			p.slides[this.activeSlideIndex].layers.push(layer);
		});
		this.selection = [layer.id];
		this.emit("selection");
	}

	deleteSelected(): void {
		if (this.selection.length === 0) {
			return;
		}
		const sel = new Set(this.selection);
		this.mutate((p) => {
			const slide = p.slides[this.activeSlideIndex];
			slide.layers = slide.layers.filter((l) => !sel.has(l.id) || l.locked);
		});
		this.selection = [];
		this.emit("selection");
	}

	duplicateSelected(): void {
		const slide = this.activeSlide();
		const dupes: Layer[] = [];
		this.mutate((p) => {
			const s = p.slides[this.activeSlideIndex];
			const maxZ = Math.max(0, ...s.layers.map((l) => l.z));
			for (const l of slide.layers) {
				if (this.selection.includes(l.id)) {
					const copy = {
						...JSON.parse(JSON.stringify(l)),
						id: `${l.id}-copy-${Math.floor(Math.random() * 1e6).toString(36)}`,
						x: l.x + 24,
						y: l.y + 24,
						z: maxZ + 1 + dupes.length,
					} as Layer;
					dupes.push(copy);
					s.layers.push(copy);
				}
			}
		});
		this.selection = dupes.map((d) => d.id);
		this.emit("selection");
	}

	bringForward(): void {
		this.reorderZ(1);
	}

	sendBackward(): void {
		this.reorderZ(-1);
	}

	/** Move every selected (unlocked) layer by `dx,dy` stage pixels. */
	nudgeSelected(dx: number, dy: number): void {
		if (this.selection.length === 0) {
			return;
		}
		this.mutate((p) => {
			for (const l of p.slides[this.activeSlideIndex].layers) {
				if (this.selection.includes(l.id) && !l.locked) {
					l.x += dx;
					l.y += dy;
				}
			}
		});
	}

	private reorderZ(dir: 1 | -1): void {
		this.mutate((p) => {
			const layers = p.slides[this.activeSlideIndex].layers;
			for (const l of layers) {
				if (this.selection.includes(l.id)) {
					l.z += dir;
				}
			}
		});
	}

	// ─── Slide ops ───

	addSlide(role: SlideRole): void {
		const preset = getFormatPreset(this.project.format.preset);
		const layers = layoutForRole(role, preset, this.brand);
		const slide: Slide = {
			id: `slide-${Math.floor(Math.random() * 1e9).toString(36)}`,
			role,
			background: {
				type: "css",
				styleMode: this.project.styleMode,
				cssClass: modeClass(this.project.styleMode),
			},
			layers,
		};
		this.mutate((p) => {
			p.slides.splice(this.activeSlideIndex + 1, 0, slide);
		});
		this.setActiveSlide(this.activeSlideIndex + 1);
	}

	deleteSlide(index: number): void {
		if (this.project.slides.length <= 1) {
			return;
		}
		this.mutate((p) => {
			p.slides.splice(index, 1);
		});
		this.setActiveSlide(Math.min(this.activeSlideIndex, this.project.slides.length - 1));
	}

	moveSlide(from: number, to: number): void {
		if (from === to || to < 0 || to >= this.project.slides.length) {
			return;
		}
		this.mutate((p) => {
			const [s] = p.slides.splice(from, 1);
			p.slides.splice(to, 0, s);
		});
		this.setActiveSlide(to);
	}

	setSlideStyleMode(styleMode: string): void {
		this.mutate((p) => {
			const slide = p.slides[this.activeSlideIndex];
			if (slide.background.type === "css") {
				slide.background.styleMode = styleMode;
				slide.background.cssClass = modeClass(styleMode);
			}
		});
	}

	/** Switch the slide background between CSS riso and a generated/uploaded image. */
	setSlideBackgroundImage(src: string, generationId?: string): void {
		this.mutate((p) => {
			const slide = p.slides[this.activeSlideIndex];
			slide.background = {
				type: "image",
				src,
				...(generationId ? { generationId } : {}),
			};
		});
	}

	setSlideBackgroundCss(): void {
		this.mutate((p) => {
			const slide = p.slides[this.activeSlideIndex];
			slide.background = {
				type: "css",
				styleMode: p.styleMode,
				cssClass: modeClass(p.styleMode),
			};
		});
	}

	// ─── Project ops ───

	/** Re-pin the format preset and rescale every layer to the new canvas. */
	setFormat(presetId: string): void {
		const preset = getFormatPreset(presetId);
		const sx = preset.width / this.project.format.width;
		const sy = preset.height / this.project.format.height;
		this.mutate((p) => {
			p.format = { preset: preset.id, width: preset.width, height: preset.height };
			for (const slide of p.slides) {
				for (const l of slide.layers) {
					l.x = Math.round(l.x * sx);
					l.y = Math.round(l.y * sy);
					l.w = Math.round(l.w * sx);
					l.h = Math.round(l.h * sy);
					if (l.kind === "text") {
						l.fontSize = Math.max(8, Math.round(l.fontSize * sx));
					}
				}
			}
		});
	}

	// ─── Persistence ───

	scheduleSave(): void {
		if (this.saveTimer) {
			clearTimeout(this.saveTimer);
		}
		this.saveTimer = setTimeout(() => {
			void this.save();
		}, AUTOSAVE_MS);
	}

	async save(): Promise<void> {
		if (this.saving) {
			// Re-arm; a later change will flush after the in-flight save.
			this.scheduleSave();
			return;
		}
		if (this.saveTimer) {
			clearTimeout(this.saveTimer);
			this.saveTimer = null;
		}
		this.saving = true;
		this.lastError = null;
		this.emit("status");
		try {
			const saved = await api.saveProject(this.project);
			this.project = saved;
			this.dirty = false;
			this.lastSavedAt = Date.now();
		} catch (err) {
			this.lastError = err instanceof Error ? err.message : String(err);
		} finally {
			this.saving = false;
			this.emit("status");
		}
	}
}
