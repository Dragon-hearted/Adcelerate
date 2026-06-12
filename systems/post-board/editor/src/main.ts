/**
 * PostBoard editor — boot + orchestration.
 *
 * Boot: load the brand bundle (inject its base64 `@font-face` CSS), resolve the
 * project from `?project=<id>` (creating a draft if absent), normalize mode
 * classes, then wire the four panels around a single {@link Store}. Re-renders
 * are driven by `store.subscribe`; text editing and keyboard shortcuts are wired
 * once against persistent containers so re-renders never steal the caret.
 */

import * as api from "./api";
import { renderInspector } from "./inspector";
import { Interactions } from "./interactions";
import { normalizeModeClasses } from "./modes";
import { renderPalette } from "./palette";
import { renderSlides } from "./slides";
import { mountStage } from "./stage";
import { Store } from "./store";
import type { BrandResponse, Project } from "./types";

function $(id: string): HTMLElement {
	const el = document.getElementById(id);
	if (!el) {
		throw new Error(`missing #${id}`);
	}
	return el;
}

function isEditableTarget(el: EventTarget | null): boolean {
	const node = el as HTMLElement | null;
	return Boolean(
		node &&
			(node.isContentEditable ||
				node.tagName === "INPUT" ||
				node.tagName === "SELECT" ||
				node.tagName === "TEXTAREA"),
	);
}

async function boot(): Promise<void> {
	const brand = (await api.getBrand()) as BrandResponse;

	// Inject the canonical base64 @font-face CSS (never hardcode fonts).
	if (brand.fontFaceCss) {
		const style = document.createElement("style");
		style.id = "pb-fontface";
		style.textContent = brand.fontFaceCss;
		document.head.appendChild(style);
	}

	const project = await resolveProject();
	normalizeModeClasses(project);

	const store = new Store(brand, project);
	const interactions = new Interactions(store);

	const slidesPanel = $("slides-panel");
	const stageWrap = $("stage-wrap");
	const inspectorPanel = $("inspector-panel");
	const palettePanel = $("palette-panel");

	let editingLayerId: string | null = null;
	const isEditing = (): boolean => editingLayerId !== null;

	const toast = (msg: string): void => {
		const t = $("toast");
		t.textContent = msg;
		t.classList.add("show");
		window.clearTimeout((t as unknown as { _t?: number })._t);
		(t as unknown as { _t?: number })._t = window.setTimeout(
			() => t.classList.remove("show"),
			3600,
		);
	};

	// ── Render ──
	function renderTopbar(): void {
		const dot = $("dirty-dot");
		if (store.saving) {
			dot.textContent = "● saving…";
			dot.className = "saving";
		} else if (store.lastError) {
			dot.textContent = "● save failed";
			dot.className = "error";
		} else if (store.dirty) {
			dot.textContent = "● unsaved";
			dot.className = "dirty";
		} else {
			dot.textContent = "● saved";
			dot.className = "saved";
		}
		($("fmt-label") as HTMLElement).textContent =
			`${store.project.format.preset} · ${store.project.format.width}×${store.project.format.height}`;
		($("undo-btn") as HTMLButtonElement).disabled = !store.canUndo();
		($("redo-btn") as HTMLButtonElement).disabled = !store.canRedo();
	}

	let currentStage: HTMLElement | null = null;

	function renderStructure(): void {
		renderTopbar();
		if (isEditing()) {
			// Mid text-edit: only refresh status chrome, leave the stage + caret alone.
			return;
		}
		renderSlides(slidesPanel, store);
		const mount = mountStage(
			stageWrap,
			store.brand,
			store.project,
			store.activeSlide(),
			store.selection,
		);
		currentStage = mount.stage;
		interactions.attach(mount.stage);
		renderInspector(inspectorPanel, store);
		renderPalette(palettePanel, store, toast);
	}

	function renderSelection(): void {
		renderTopbar();
		if (isEditing() || !currentStage) {
			return;
		}
		for (const node of currentStage.querySelectorAll<HTMLElement>(".layer")) {
			node.classList.toggle("selected", store.selection.includes(node.dataset.layerId ?? ""));
		}
		interactions.refreshSelection(currentStage);
		renderInspector(inspectorPanel, store);
		renderPalette(palettePanel, store, toast);
	}

	store.subscribe((reason) => {
		if (reason === "status") {
			renderTopbar();
		} else if (reason === "selection") {
			renderSelection();
		} else {
			renderStructure();
		}
	});

	// ── Text editing (delegated, survives re-renders) ──
	stageWrap.addEventListener("dblclick", (e) => {
		const layerEl = (e.target as HTMLElement).closest<HTMLElement>(".layer-text");
		if (!layerEl) {
			return;
		}
		const inner = layerEl.querySelector<HTMLElement>(".pb-text");
		const id = layerEl.dataset.layerId;
		if (!inner || !id || layerEl.classList.contains("locked")) {
			return;
		}
		editingLayerId = id;
		inner.contentEditable = "true";
		layerEl.classList.add("editing");
		inner.focus();
		// Select-all for quick replacement.
		const range = document.createRange();
		range.selectNodeContents(inner);
		const sel = window.getSelection();
		sel?.removeAllRanges();
		sel?.addRange(range);

		const finish = (): void => {
			inner.removeEventListener("blur", finish);
			inner.contentEditable = "false";
			layerEl.classList.remove("editing");
			const content = inner.innerText.replace(/ /g, " ");
			editingLayerId = null;
			store.updateLayer(id, { content });
		};
		inner.addEventListener("blur", finish);
	});

	// ── Keyboard ──
	window.addEventListener("keydown", (e) => {
		const mod = e.metaKey || e.ctrlKey;
		if (mod && e.key.toLowerCase() === "s") {
			e.preventDefault();
			void store.save();
			return;
		}
		if (mod && e.key.toLowerCase() === "z") {
			e.preventDefault();
			if (e.shiftKey) {
				store.redo();
			} else {
				store.undo();
			}
			return;
		}
		if (mod && e.key.toLowerCase() === "d") {
			e.preventDefault();
			store.duplicateSelected();
			return;
		}
		if (isEditing() || isEditableTarget(e.target)) {
			return;
		}
		if (e.key === "Delete" || e.key === "Backspace") {
			e.preventDefault();
			store.deleteSelected();
			return;
		}
		const step = e.shiftKey ? 10 : 1;
		const nudges: Record<string, [number, number]> = {
			ArrowLeft: [-step, 0],
			ArrowRight: [step, 0],
			ArrowUp: [0, -step],
			ArrowDown: [0, step],
		};
		const d = nudges[e.key];
		if (d) {
			e.preventDefault();
			store.nudgeSelected(d[0], d[1]);
		}
	});

	// ── Topbar buttons ──
	($("undo-btn") as HTMLButtonElement).onclick = () => store.undo();
	($("redo-btn") as HTMLButtonElement).onclick = () => store.redo();
	($("save-btn") as HTMLButtonElement).onclick = () => void store.save();
	($("export-btn") as HTMLButtonElement).onclick = async () => {
		toast("Exporting…");
		try {
			const res = await api.exportProject(store.project.id, true);
			const files = Array.isArray(res.files) ? (res.files as string[]) : [];
			toast(files.length ? `Exported ${files.length} file(s).` : "Export complete.");
		} catch (err) {
			const status = err instanceof api.ApiError ? err.status : 0;
			toast(
				status === 501
					? "Export not available yet (pending export pipeline)."
					: `Export failed: ${err instanceof Error ? err.message : String(err)}`,
			);
		}
	};

	// Re-fit the stage on viewport resize.
	let resizeRaf = 0;
	window.addEventListener("resize", () => {
		window.cancelAnimationFrame(resizeRaf);
		resizeRaf = window.requestAnimationFrame(() => {
			if (!isEditing()) {
				renderStructure();
			}
		});
	});

	($("project-title") as HTMLElement).textContent = store.project.id;
	renderStructure();
}

/** Resolve the project from `?project=<id>`, or create/open a sensible default. */
async function resolveProject(): Promise<Project> {
	const params = new URLSearchParams(window.location.search);
	const id = params.get("project");
	if (id) {
		return api.getProject(id);
	}
	// No id: open the most recent project, or seed a starter draft.
	const ids = await api.listProjects();
	if (ids.length > 0) {
		const project = await api.getProject(ids[ids.length - 1]);
		setProjectParam(project.id);
		return project;
	}
	const draft = await api.createProject({
		brief: "Untitled PostBoard draft",
		type: "carousel",
		format: "ig-4x5",
	});
	setProjectParam(draft.id);
	return draft;
}

function setProjectParam(id: string): void {
	const url = new URL(window.location.href);
	url.searchParams.set("project", id);
	window.history.replaceState({}, "", url);
}

boot().catch((err) => {
	const root = document.getElementById("stage-wrap") ?? document.body;
	root.innerHTML = `<pre class="boot-error">PostBoard failed to start:\n${err instanceof Error ? (err.stack ?? err.message) : String(err)}</pre>`;
});
