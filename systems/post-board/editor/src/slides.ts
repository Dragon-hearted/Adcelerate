/**
 * Left panel: project-level switches (format preset, style mode), the slide
 * thumbnail strip (live mini-renders, click to activate, drag to reorder, delete)
 * and the add-slide role picker.
 */

import { FORMAT_PRESET_LIST } from "../../src/formats";
import { SLIDE_ROLES, VARIANTS_BY_ROLE } from "../../src/templates";
import { renderThumb } from "./stage";
import type { Store } from "./store";
import type { SlideRole } from "./types";

const THUMB_W = 132;

let dragFrom: number | null = null;

export function renderSlides(panel: HTMLElement, store: Store): void {
	panel.innerHTML = "";

	// ── Project switches ──
	const proj = document.createElement("div");
	proj.className = "sl-project";

	const fmtSel = document.createElement("select");
	fmtSel.className = "sl-select";
	for (const p of FORMAT_PRESET_LIST) {
		const opt = document.createElement("option");
		opt.value = p.id;
		opt.textContent = p.label;
		if (p.id === store.project.format.preset) opt.selected = true;
		fmtSel.append(opt);
	}
	fmtSel.onchange = () => store.setFormat(fmtSel.value);

	const activeBg = store.activeSlide().background;
	const activeMode =
		activeBg.type === "css"
			? (activeBg.styleMode ?? store.project.styleMode)
			: store.project.styleMode;
	const modeSel = document.createElement("select");
	modeSel.className = "sl-select";
	for (const m of store.brand.styleModes) {
		const opt = document.createElement("option");
		opt.value = m.id;
		opt.textContent = m.name;
		if (m.id === activeMode) {
			opt.selected = true;
		}
		modeSel.append(opt);
	}
	modeSel.onchange = () => store.setSlideStyleMode(modeSel.value);

	proj.append(labelled("Format", fmtSel), labelled("Style mode (slide)", modeSel));
	panel.append(proj);

	// ── Thumbnails ──
	const list = document.createElement("div");
	list.className = "sl-list";
	store.project.slides.forEach((slide, i) => {
		const item = document.createElement("div");
		item.className = "sl-item";
		if (i === store.activeSlideIndex) item.classList.add("active");
		item.draggable = true;

		item.ondragstart = () => {
			dragFrom = i;
			item.classList.add("dragging");
		};
		item.ondragend = () => {
			dragFrom = null;
			item.classList.remove("dragging");
		};
		item.ondragover = (e) => {
			e.preventDefault();
			item.classList.add("drop-target");
		};
		item.ondragleave = () => item.classList.remove("drop-target");
		item.ondrop = (e) => {
			e.preventDefault();
			item.classList.remove("drop-target");
			if (dragFrom !== null && dragFrom !== i) {
				store.moveSlide(dragFrom, i);
			}
		};

		const idx = document.createElement("div");
		idx.className = "sl-meta";
		idx.innerHTML = `<span class="sl-num">${String(i + 1).padStart(2, "0")}</span><span class="sl-role">${slide.role}</span>`;

		const thumbBox = document.createElement("div");
		thumbBox.className = "sl-thumb";
		renderThumb(thumbBox, store.brand, store.project, slide, THUMB_W);
		thumbBox.onclick = () => store.setActiveSlide(i);

		const del = document.createElement("button");
		del.type = "button";
		del.className = "sl-del";
		del.textContent = "✕";
		del.title = "Delete slide";
		del.disabled = store.project.slides.length <= 1;
		del.onclick = (e) => {
			e.stopPropagation();
			store.deleteSlide(i);
		};

		item.append(idx, thumbBox, del);
		list.append(item);
	});
	panel.append(list);

	// ── Add slide (role + layout variant) ──
	const add = document.createElement("div");
	add.className = "sl-add";
	const roleSel = document.createElement("select");
	roleSel.className = "sl-select";
	for (const role of SLIDE_ROLES) {
		const opt = document.createElement("option");
		opt.value = role;
		opt.textContent = role;
		roleSel.append(opt);
	}

	// Layout-variant picker — repopulates when the role changes. The empty
	// option lets the deterministic arc picker choose a fitting variant.
	const variantSel = document.createElement("select");
	variantSel.className = "sl-select";
	const fillVariants = (role: SlideRole): void => {
		variantSel.innerHTML = "";
		const auto = document.createElement("option");
		auto.value = "";
		auto.textContent = "auto (picker)";
		variantSel.append(auto);
		for (const v of VARIANTS_BY_ROLE[role] ?? []) {
			const opt = document.createElement("option");
			opt.value = v;
			opt.textContent = v;
			variantSel.append(opt);
		}
	};
	fillVariants(roleSel.value as SlideRole);
	roleSel.onchange = () => fillVariants(roleSel.value as SlideRole);

	const addBtn = document.createElement("button");
	addBtn.type = "button";
	addBtn.className = "sl-add-btn";
	addBtn.textContent = "+ Add slide";
	addBtn.onclick = () => store.addSlide(roleSel.value as SlideRole, variantSel.value || undefined);
	add.append(roleSel, variantSel, addBtn);
	panel.append(add);
}

function labelled(label: string, control: HTMLElement): HTMLElement {
	const wrap = document.createElement("label");
	wrap.className = "sl-field";
	const span = document.createElement("span");
	span.textContent = label;
	wrap.append(span, control);
	return wrap;
}
