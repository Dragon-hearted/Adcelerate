/**
 * Pointer interactions: Selecto (marquee + click selection) + Moveable
 * (drag / resize / rotate). Re-attached whenever the stage is rebuilt. Geometry
 * is committed to the model on gesture end by reading back `offsetLeft/Top/
 * Width/Height` (layout values, immune to the stage's CSS scale), so the model
 * stays correct regardless of zoom. Locked and background layers are inert.
 */

import Moveable from "moveable";
import type {
	OnDrag,
	OnDragGroup,
	OnResize,
	OnResizeGroup,
	OnRotate,
	OnRotateGroup,
} from "moveable";
import Selecto from "selecto";
import type { OnSelect } from "selecto";
import type { Store } from "./store";

/** Parse the rotation (deg) out of a `rotate(Ndeg)` transform string. */
function rotationOf(el: HTMLElement): number {
	const m = /rotate\(([-0-9.]+)deg\)/.exec(el.style.transform);
	return m ? Number(m[1]) : 0;
}

export class Interactions {
	private moveable: Moveable | null = null;
	private selecto: Selecto | null = null;

	constructor(private store: Store) {}

	/** Tear down current instances (called before each re-attach + on unmount). */
	destroy(): void {
		this.moveable?.destroy();
		this.selecto?.destroy();
		this.moveable = null;
		this.selecto = null;
	}

	/** Attach to a freshly-mounted stage, targeting the current selection. */
	attach(stage: HTMLElement): void {
		this.destroy();
		const store = this.store;

		const selectedNodes = this.selectionNodes(stage);
		const moveable = new Moveable(document.body, {
			target: selectedNodes,
			draggable: true,
			resizable: true,
			rotatable: true,
			origin: false,
			keepRatio: false,
			throttleDrag: 0,
			throttleResize: 0,
			throttleRotate: 0,
			edge: false,
		});
		this.moveable = moveable;

		// ── Drag ──
		moveable.on("drag", (e: OnDrag) => {
			e.target.style.left = `${e.left}px`;
			e.target.style.top = `${e.top}px`;
		});
		moveable.on("dragEnd", () => this.commit(stage));
		moveable.on("dragGroup", (e: OnDragGroup) => {
			for (const ev of e.events) {
				ev.target.style.left = `${ev.left}px`;
				ev.target.style.top = `${ev.top}px`;
			}
		});
		moveable.on("dragGroupEnd", () => this.commit(stage));

		// ── Resize ──
		moveable.on("resize", (e: OnResize) => {
			e.target.style.width = `${Math.round(e.width)}px`;
			e.target.style.height = `${Math.round(e.height)}px`;
			e.target.style.left = `${Math.round(e.drag.left)}px`;
			e.target.style.top = `${Math.round(e.drag.top)}px`;
		});
		moveable.on("resizeEnd", () => this.commit(stage));
		moveable.on("resizeGroup", (e: OnResizeGroup) => {
			for (const ev of e.events) {
				ev.target.style.width = `${Math.round(ev.width)}px`;
				ev.target.style.height = `${Math.round(ev.height)}px`;
				ev.target.style.left = `${Math.round(ev.drag.left)}px`;
				ev.target.style.top = `${Math.round(ev.drag.top)}px`;
			}
		});
		moveable.on("resizeGroupEnd", () => this.commit(stage));

		// ── Rotate ──
		moveable.on("rotate", (e: OnRotate) => {
			e.target.style.transform = `rotate(${e.rotation.toFixed(2)}deg)`;
		});
		moveable.on("rotateEnd", () => this.commit(stage));
		moveable.on("rotateGroup", (e: OnRotateGroup) => {
			for (const ev of e.events) {
				ev.target.style.transform = ev.drag.transform;
			}
		});
		moveable.on("rotateGroupEnd", () => this.commit(stage));

		// ── Selection ──
		const selecto = new Selecto({
			container: stage,
			rootContainer: stage,
			selectableTargets: [".layer.pb-interactive"],
			selectByClick: true,
			selectFromInside: false,
			toggleContinueSelect: ["shift"],
			hitRate: 0,
			ratio: 0,
		});
		this.selecto = selecto;

		selecto.on("dragStart", (e) => {
			const target = e.inputEvent.target as HTMLElement;
			// Don't start a marquee when grabbing a Moveable handle or an already-
			// selected (and thus draggable) layer, or when editing text.
			if (
				moveable.isMoveableElement(target) ||
				target.isContentEditable ||
				selectedNodes.some((n) => n === target || n.contains(target))
			) {
				e.stop();
			}
		});
		selecto.on("select", (e: OnSelect) => {
			const ids = (e.selected as HTMLElement[])
				.map((el) => el.dataset.layerId)
				.filter((id): id is string => Boolean(id));
			store.setSelection(ids);
		});
	}

	/** Re-point Moveable at the current selection without rebuilding the stage. */
	refreshSelection(stage: HTMLElement): void {
		if (!this.moveable) {
			return;
		}
		this.moveable.target = this.selectionNodes(stage);
		this.moveable.updateRect();
	}

	private selectionNodes(stage: HTMLElement): HTMLElement[] {
		return this.store.selection
			.map((id) => stage.querySelector<HTMLElement>(`.layer[data-layer-id="${CSS.escape(id)}"]`))
			.filter((n): n is HTMLElement => n !== null && !n.classList.contains("locked"));
	}

	/** Read back geometry from the DOM and commit it to the model (one undo step). */
	private commit(stage: HTMLElement): void {
		const nodes = this.selectionNodes(stage);
		if (nodes.length === 0) {
			return;
		}
		this.store.mutate((p) => {
			const slide = p.slides[this.store.activeSlideIndex];
			for (const el of nodes) {
				const id = el.dataset.layerId;
				const layer = slide.layers.find((l) => l.id === id);
				if (layer) {
					layer.x = el.offsetLeft;
					layer.y = el.offsetTop;
					layer.w = el.offsetWidth;
					layer.h = el.offsetHeight;
					layer.rotation = rotationOf(el);
				}
			}
		});
	}
}
