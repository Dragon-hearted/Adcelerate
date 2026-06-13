/**
 * Asset palette tray: brand elements (click/drag to add an element layer), logo
 * variants, image upload (POST /api/upload → image layer), and the cover-only
 * "Generate background via Higgsfield" action (POST /api/generate → swaps the
 * slide background to image mode; on a 502 it keeps the CSS background and
 * surfaces a toast).
 */

import { newLayerId } from "../../src/templates";
import * as api from "./api";
import type { Store } from "./store";
import type { BrandAsset, Layer, LogoVariant } from "./types";

/** Next z above the active slide's layers. */
function topZ(store: Store): number {
	return Math.max(0, ...store.activeSlide().layers.map((l) => l.z)) + 1;
}

/** Centred geometry for a new layer of the given fractional size. */
function centred(
	store: Store,
	wFrac: number,
	hFrac: number,
): { x: number; y: number; w: number; h: number } {
	const { width, height } = store.project.format;
	const w = Math.round(width * wFrac);
	const h = Math.round(width * hFrac);
	return { x: Math.round((width - w) / 2), y: Math.round((height - h) / 2), w, h };
}

function addElement(store: Store, asset: BrandAsset): void {
	const isBarcode = /barcode/i.test(asset.elementId);
	const box = centred(store, isBarcode ? 0.34 : 0.32, isBarcode ? 0.1 : 0.32);
	const layer: Layer = {
		id: newLayerId("el"),
		kind: "element",
		...box,
		rotation: 0,
		z: topZ(store),
		elementId: asset.elementId,
		src: asset.src,
	};
	store.addLayer(layer);
}

function addLogo(store: Store, variant: LogoVariant): void {
	const { width, height } = store.project.format;
	const w = Math.round(width * 0.26);
	const h = Math.round(height * 0.07);
	const layer: Layer = {
		id: newLayerId("logo"),
		kind: "logo",
		x: Math.round((width - w) / 2),
		y: Math.round((height - h) / 2),
		w,
		h,
		rotation: 0,
		z: topZ(store),
		variant,
	};
	store.addLayer(layer);
}

function addImage(store: Store, src: string): void {
	const box = centred(store, 0.4, 0.4);
	const layer: Layer = {
		id: newLayerId("img"),
		kind: "image",
		...box,
		rotation: 0,
		z: topZ(store),
		src,
		objectFit: "cover",
	};
	store.addLayer(layer);
}

function thumb(asset: BrandAsset, onClick: () => void): HTMLElement {
	const b = document.createElement("button");
	b.type = "button";
	b.className = "pal-thumb";
	b.title = `${asset.name}\n${asset.usage}`;
	if (/barcode/i.test(asset.elementId)) {
		const bar = document.createElement("div");
		bar.className = "element-barcode";
		bar.style.width = "100%";
		bar.style.height = "60%";
		b.appendChild(bar);
	} else {
		const img = document.createElement("img");
		img.src = asset.src;
		img.alt = asset.name;
		img.loading = "lazy";
		b.appendChild(img);
	}
	const cap = document.createElement("span");
	cap.className = "pal-cap";
	cap.textContent = asset.name;
	b.appendChild(cap);
	b.onclick = onClick;
	return b;
}

/** Render the palette tray. `toast` surfaces transient messages from main. */
export function renderPalette(
	panel: HTMLElement,
	store: Store,
	toast: (msg: string) => void,
): void {
	panel.innerHTML = "";

	const elements = store.brand.elementAssets.filter((a) => a.kind === "element");
	const logos = store.brand.elementAssets.filter((a) => a.kind === "logo");

	const elGroup = document.createElement("div");
	elGroup.className = "pal-group";
	elGroup.append(Object.assign(document.createElement("h4"), { textContent: "Elements" }));
	const elGrid = document.createElement("div");
	elGrid.className = "pal-grid";
	for (const a of elements) {
		elGrid.append(thumb(a, () => addElement(store, a)));
	}
	elGroup.append(elGrid);

	const logoGroup = document.createElement("div");
	logoGroup.className = "pal-group";
	logoGroup.append(Object.assign(document.createElement("h4"), { textContent: "Logo" }));
	const logoGrid = document.createElement("div");
	logoGrid.className = "pal-grid";
	for (const a of logos) {
		const variant: LogoVariant =
			a.elementId === "logo-riso-electric-blue"
				? "riso_electric_blue"
				: a.elementId === "logo-primary"
					? "primary"
					: "riso_graphite";
		logoGrid.append(thumb(a, () => addLogo(store, variant)));
	}
	logoGroup.append(logoGrid);

	// Upload + generate actions.
	const actions = document.createElement("div");
	actions.className = "pal-group";
	actions.append(Object.assign(document.createElement("h4"), { textContent: "Add" }));

	const uploadLabel = document.createElement("label");
	uploadLabel.className = "pal-action";
	uploadLabel.textContent = "⬆ Upload image";
	const fileInput = document.createElement("input");
	fileInput.type = "file";
	fileInput.accept = "image/*";
	fileInput.style.display = "none";
	fileInput.onchange = async () => {
		const file = fileInput.files?.[0];
		if (!file) return;
		try {
			toast("Uploading…");
			const { src } = await api.uploadImage(store.project.id, file);
			addImage(store, src);
			toast("Image added.");
		} catch (err) {
			toast(`Upload failed: ${err instanceof Error ? err.message : String(err)}`);
		} finally {
			fileInput.value = "";
		}
	};
	uploadLabel.append(fileInput);
	actions.append(uploadLabel);

	// Image-forward: every slide can pull a NanoBanana hero (text overlays on
	// top). Generation surfaces a clear error if ImageEngine/NanoBanana is down;
	// the CSS-riso background is the graceful fallback.
	const slide = store.activeSlide();
	const label = "✦ Generate hero (NanoBanana)";
	const genBtn = document.createElement("button");
	genBtn.type = "button";
	genBtn.className = "pal-action accent";
	genBtn.textContent = label;
	genBtn.title =
		"Generate this slide's hero image via Higgsfield + NanoBanana Pro. Text stays editable on top.";
	genBtn.onclick = async () => {
		genBtn.disabled = true;
		genBtn.classList.add("busy");
		genBtn.textContent = "✦ Generating…";
		try {
			const res = await api.generateHeroes({
				projectId: store.project.id,
				slideIds: [slide.id],
			});
			const ok = res.generated.find((g) => g.slideId === slide.id);
			const bad = res.failed.find((f) => f.slideId === slide.id);
			if (ok?.src) {
				store.setSlideBackgroundImage(ok.src, ok.generationId);
				toast("Hero generated.");
			} else {
				toast(`Hero generation declined — CSS background kept. ${bad?.error ?? ""}`.trim());
			}
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			toast(`Generation unavailable — CSS background kept. ${msg}`);
		} finally {
			genBtn.disabled = false;
			genBtn.classList.remove("busy");
			genBtn.textContent = label;
		}
	};
	actions.append(genBtn);

	if (slide.background.type === "image") {
		const cssBtn = document.createElement("button");
		cssBtn.type = "button";
		cssBtn.className = "pal-action";
		cssBtn.textContent = "↺ Revert to CSS background";
		cssBtn.onclick = () => store.setSlideBackgroundCss();
		actions.append(cssBtn);
	}

	panel.append(elGroup, logoGroup, actions);
}
