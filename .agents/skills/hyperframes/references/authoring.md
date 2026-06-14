# Hyperframes authoring reference

Detailed reference for building Hyperframes compositions. Read the parent [SKILL.md](../SKILL.md) first.

## Full data-attribute reference

Stage (root) element:

| Attribute | Required | Meaning |
|-----------|:--------:|---------|
| `data-composition-id` | yes | Unique id; also the key under `window.__timelines` |
| `data-width` | yes | Composition width in px (e.g. `1920`) |
| `data-height` | yes | Composition height in px (e.g. `1080`) |
| `data-start` | — | Stage start offset (usually `0`) |

Child elements (text, images, video, audio, shapes):

| Attribute | Meaning |
|-----------|---------|
| `data-start` | Appearance time in seconds |
| `data-duration` | Visible duration in seconds |
| `data-track-index` | Stacking/track order; lower renders behind. Track 0 is conventionally the audio bed |
| `data-volume` | 0–1, for `<audio>`/`<video>` |

The total composition duration is the max of every element's `data-start + data-duration`. Render fps is set by the project config / `render` flags.

## Adapter snippets (all paused & seekable)

GSAP:
```javascript
const tl = gsap.timeline({ paused: true });
tl.from("#title", { opacity: 0, y: 40, duration: 0.8 }, 1)
  .to("#title", { opacity: 0, duration: 0.4 }, 4.6);
window.__timelines = window.__timelines || {};
window.__timelines.demo = tl;
// engine calls tl.seek(frameTime) per frame
```

Anime.js:
```javascript
const anim = anime({
  targets: "#logo",
  scale: [0.8, 1],
  opacity: [0, 1],
  duration: 800,
  easing: "easeOutCubic",
  autoplay: false,
});
window.__timelines.demo = { seek: (t) => anim.seek(t * 1000) }; // seconds → ms
```

Lottie:
```javascript
const lottieAnim = lottie.loadAnimation({ container, renderer: "svg", autoplay: false, path: "data.json" });
window.__timelines.demo = {
  seek: (t) => lottieAnim.goToAndStop(t * lottieAnim.frameRate, true),
};
```

Motion One / WAAPI:
```javascript
const a = el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 800, fill: "both" });
a.pause();
window.__timelines.demo = { seek: (t) => { a.currentTime = Math.max(0, t * 1000); } };
```

## Determinism rules

Seeking to time `t` must always produce the same pixels. Therefore:

- **No `Date.now()` / `performance.now()` / `Math.random()`** in render-affecting code. If you need pseudo-randomness, seed it from a constant.
- **No accumulating state** across frames — every frame seeks fresh; a frame may be rendered out of order.
- **No autoplaying** CSS/JS animations, video, or `requestAnimationFrame` loops that advance on their own.
- **Wait for assets** (fonts, images, Lottie JSON) before the engine seeks — block on load so frame 0 isn't blank.

## CLI workflow

```bash
npx hyperframes init my-video   # one-time scaffold
npx hyperframes lint            # validate before every render
npx hyperframes preview         # scrub timeline; verify seek correctness visually
npx hyperframes render          # → out/<composition>.mp4
npx hyperframes inspect         # dump parsed composition tree for debugging
npx hyperframes add flash-through-white   # add a catalog component
```

Lint catches the common mistakes: missing `data-composition-id`, unparented timing attributes, timelines not registered on `window.__timelines`, overlapping track indices used incorrectly.

## Common pitfalls

- **Blank frames at the start** — assets not loaded before first seek. Preload fonts/images; gate timeline registration on a load promise.
- **Animation "jumps"** — a `.from()` tween that depends on the element's live computed style. Seeking out of order can read a mutated baseline. Prefer `.fromTo()` with explicit start and end values.
- **Timeline not found** — the `window.__timelines` key must exactly match `data-composition-id`.
- **Audio out of sync** — set `data-start`/`data-duration` on the `<audio>` element; the engine muxes audio by those, not by playback.

## Auto-editor handoff (motionClip)

When producing clips for the auto-editor pipeline, each rendered MP4 becomes a `motionClip` item in the JSON timeline. Keep clips:

- **Transparent where needed** — render with an alpha-capable codec (e.g. ProRes 4444 / WebM VP9 alpha) when the clip is an overlay rather than a full-frame background.
- **Self-contained** — one composition per clip, fixed dimensions matching the project (commonly 1080×1920 vertical or 1920×1080).
- **Named deterministically** — the timeline references clips by path; stable filenames make re-renders idempotent.

Remotion then composites the clip via `<OffthreadVideo>` / `<Video>` at the `motionClip`'s `from`/`durationInFrames`. See [auto-editor-workflow](../../auto-editor-workflow/SKILL.md) and [remotion-best-practices](../../remotion-best-practices/SKILL.md).
