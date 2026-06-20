# Reference-Group overflow is a deterministic montage, and the cap is a per-(provider, model, modality) descriptor

When an un-flattened Reference Group exceeds a provider's reference-input cap, the design "partial-flattens": pinned refs stay sharp in their own slots, the overflow tail collapses into the last slot as one image (the *Reference Group* glossary term). Two questions: **who makes that one image**, and **what *is* the cap** that triggers it.

**Grounding (Explore, 2026-06-20):**
- **No image-compositing tooling exists** anywhere (no `sharp`/`jimp`/`canvas`/ImageMagick in any `package.json`). Every "composite" in the repo (scene-board storyboard sheets, 4-view reference sheets) is *prompt-described and AI-rendered*, never locally composited. A local montage is net-new but clean (`sharp`, ~1.5s, zero failure surface).
- **The cap is route-specific and sometimes typed**, and the code does not reflect this: Higgsfield CLI ~8 (`higgsfield-provider.ts:59`, comment only, **unenforced**); WisGate/Gemini NanoBanana Pro **14 = 6 objects + 5 humans** (`README.md:40`, `domain.md:299`); Higgsfield `gpt_image_2` 3. The **default** route is Higgsfield CLI `nano_banana_2` (`generate.ts:33`), so the common cap is ~8.
- **`IMAGE_ENGINE_REF_CAP = 3` is scene-board's conservative hardcode** for gpt_image_2 compat (`reference-sheet-generator.ts:50`), **not** image-engine's limit. image-engine does **no reference-count validation** — it passes refs through (only a per-image 10MB size check, `generate.ts:99-104`). So the cap logic is net-new with nothing real to inherit.
- image-engine is **image-only**; video models (with their own input limits) live in other flows.

**Decision:**

1. **The overflow blend is a deterministic local montage (`sharp`), never a provider call.** Resize the overflow-tail refs and tile them into the last slot. This *cannot* 402, time out, or fail beyond malformed-input (which hard-blocks the Run with a clear message, the same class as the existing "pinned set alone exceeds cap" block). It also honors "no ref discarded" *better* than an AI blend — a montage keeps every overflow ref visible, where an AI fusion destroys per-image detail — and it is reproducible across Board reopen (an AI blend would drift, breaking immutability/lineage). It retires scene-board's silent-drop (`slice(0, cap)`) by replacing pruning with honest preservation. Applies to the **flatten toggle** too in v1; if true aesthetic vibe-fusion proves necessary, it is added later as an explicit opt-in mode — at which point it is a normal Step with normal lifecycle/failure handling, not a special case.

2. **The cap is a descriptor resolved at dispatch**, not a constant: `capFor(provider, model, modality) → { total: number, byCategory?: { objects, humans } }`. A real model→cap table in image-engine replaces the flat `=3`. The default Higgsfield route returns `{ total: 8 }`; the WisGate route returns `{ total: 14, byCategory: { objects: 6, humans: 5 } }`. Built as a descriptor from day one so we never re-bake scene-board's flat-number mistake, and keyed by **modality** so video models slot in when Drive/video flows arrive.

3. **Partial-flatten triggers only when the *resolved* cap is exceeded.** 7 refs to an 8-cap default model fit natively — no montage. Montage is the exception (deep ref sets / low-cap models), not the norm.

4. **Typed sub-caps (6 objects + 5 humans) are carried but not enforced in v1.** The descriptor holds the typed shape; v1 montage stays category-blind (trigger on `total`, tile whatever overflows). Honest typed enforcement — *don't* montage 7 human refs into one slot, since that wrecks face fidelity — is a documented refinement for the WisGate route, not a v1 blocker (the default route is scalar-8 anyway).

**Considered and rejected:**
- **AI-generated blend** for the overflow tail — drags a fallible, costly, ~20–30s provider call into a step that should be instant and infallible; destroys per-ref detail; non-reproducible.
- **A flat reference cap** (scene-board's `=3`) — a lie about provider capability; needlessly montages/drops refs on an 8- or 14-cap model.
- **Enforcing typed 6+5 in v1** — real, but the default route is scalar; deferring keeps v1 lean without baking in a wrong assumption (the descriptor already carries the shape).

**Consequence:** image-engine gains a `sharp` dependency and a model→cap table; the Reference-Group→payload resolution computes the resolved cap at dispatch, montages the tail only on overflow, and snapshots the montage as an Artifact (ADR-0011). The cap descriptor is the seam through which video-model limits later enter.
