---
name: hyperframes
description: 'Author and render Hyperframes (heygen-com/hyperframes) — HTML→MP4 motion-graphic clips driven by seekable, paused timelines. Use when building short motion-graphic clips from HTML/CSS/JS, wiring GSAP/Motion One/Lottie/Anime.js animations that render deterministically frame-by-frame, or producing motionClip assets that the auto-editor composites with Remotion. Triggers: "make a hyperframes clip", "render HTML to mp4", "motion graphic overlay", "seekable timeline animation", "data-start/data-duration clip".'
metadata:
  tags: hyperframes, motion-graphics, html-to-mp4, gsap, puppeteer, ffmpeg, auto-editor
---

# Hyperframes

Hyperframes turns an HTML document into a deterministic MP4. You author a normal web page (HTML + CSS + JS), declare timing with `data-*` attributes, and expose **paused, seekable** animation timelines. The render engine drives a headless Chromium with Puppeteer, calls `seek(frameTime)` on each timeline once per frame, screenshots, and pipes frames to FFmpeg. Because every frame is computed by seeking — never by wall-clock playback — output is reproducible.

Source of truth: https://github.com/heygen-com/hyperframes

## When to use

- You need a short, self-contained motion-graphic clip (title card, lower-third, kinetic text, logo sting, data flourish) authored as HTML.
- You want code-based, version-controlled motion graphics that render identically every time.
- You're producing clips for **auto-editor**: each rendered clip becomes a `motionClip` item that Remotion composites onto the timeline. See [auto-editor-workflow](../auto-editor-workflow/SKILL.md).

For React-composition-level animation (the Remotion video itself), use [remotion-best-practices](../remotion-best-practices/SKILL.md) instead — prefer `interpolate`/`spring` there. Use `motion`/GSAP only inside Hyperframes HTML, where a seekable clock exists. See [motion-graphics](../motion-graphics/SKILL.md).

## The timing model

Timing is declared with data attributes on elements — never with `setTimeout` or autoplaying animations.

| Attribute | Meaning |
|-----------|---------|
| `data-composition-id` | Root composition identifier (on the stage element) |
| `data-start` | When the element appears, in seconds |
| `data-duration` | How long it stays visible, in seconds |
| `data-track-index` | Layer/track ordering (lower = behind; track 0 commonly audio) |
| `data-width` / `data-height` | Composition pixel dimensions (on the stage) |
| `data-volume` | Volume for `<audio>`/`<video>` tracks (0–1) |

## The seekable timeline model (critical)

The renderer does **not** play your page. For each output frame it computes `frameTime = frame / fps` and calls `seek(frameTime)` on every registered timeline, then captures the DOM. This means:

1. **All animations must be paused.** Never let an animation run on its own clock.
2. **Expose timelines on `window.__timelines`** keyed by composition id, so the engine can find and seek them.
3. **Animations must be pure functions of time** — seeking to `t` must always produce the same visual state, regardless of what frame rendered before it. Avoid randomness, `Date.now()`, or state that accumulates across frames.

Supported animation adapters (all must be paused/seekable):

- **GSAP** — `gsap.timeline({ paused: true })`, then `tl.seek(t)`
- **Motion One / WAAPI** — paused animations driven by `.currentTime`
- **Lottie** — `goToAndStop(frame, true)`
- **Anime.js** — `anime({ autoplay: false })`, then `.seek(ms)`
- **Three.js / CSS** — via frame adapters

```javascript
const tl = gsap.timeline({ paused: true });
tl.from("#title", { opacity: 0, y: 40, duration: 0.8 }, 1); // starts at t=1s
window.__timelines = window.__timelines || {};
window.__timelines.demo = tl; // keyed by data-composition-id
```

## Install & requirements

- **Node.js 22+**
- **FFmpeg** on PATH (encoding)
- **Chromium** — Puppeteer installs it automatically

```bash
npx hyperframes init my-video   # scaffold a project
cd my-video
```

Packages (installed by the scaffold):

| Package | Purpose |
|---------|---------|
| `hyperframes` | CLI |
| `@hyperframes/core` | types, parser, linter, frame adapters |
| `@hyperframes/engine` | Puppeteer + FFmpeg capture engine |
| `@hyperframes/producer` | full render pipeline |
| `@hyperframes/studio` | browser editor UI |

To teach a coding agent the production patterns directly: `npx skills add heygen-com/hyperframes`.

## The agent authoring loop

1. **Plan** — sketch scenes, durations, tracks, and the resolution/fps.
2. **Write HTML** — build the stage with `data-composition-id`, `data-width`, `data-height`; add elements with `data-start`/`data-duration`/`data-track-index`.
3. **Wire seekable animation** — create paused timelines, register them on `window.__timelines`. Keep everything a pure function of time.
4. **Lint** — `npx hyperframes lint` to validate composition syntax and timing.
5. **Preview** — `npx hyperframes preview` (live-reload browser; scrub the timeline to verify seek correctness).
6. **Render** — `npx hyperframes render` → MP4.

CLI reference:

```bash
npx hyperframes lint      # validate composition syntax & timing
npx hyperframes preview   # live-reload browser preview
npx hyperframes render    # produce the MP4
npx hyperframes inspect   # debug composition structure
npx hyperframes add <component>   # pull a catalog component (e.g. flash-through-white)
```

See [references/authoring.md](references/authoring.md) for the full attribute reference, adapter snippets, common pitfalls, and the auto-editor `motionClip` handoff.

## Minimal working example

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js"></script>
  <style>
    #stage { background:#0b0b10; color:#fff; font-family:Inter,system-ui,sans-serif; }
    #title { position:absolute; top:42%; left:8%; font-size:96px; font-weight:800; }
  </style>
</head>
<body>
  <div id="stage" data-composition-id="demo" data-start="0"
       data-width="1920" data-height="1080">
    <h1 id="title" data-start="1" data-duration="4" data-track-index="1">
      Hello World
    </h1>
    <audio data-start="0" data-duration="6" data-track-index="0"
           data-volume="0.8" src="music.wav"></audio>
  </div>

  <script>
    const tl = gsap.timeline({ paused: true });
    tl.from("#title", { opacity: 0, y: 40, duration: 0.8 }, 1);
    window.__timelines = window.__timelines || {};
    window.__timelines.demo = tl;
  </script>
</body>
</html>
```

Save as `index.html`, then `npx hyperframes lint && npx hyperframes preview`, and finally `npx hyperframes render`.
