---
name: auto-editor-workflow
description: 'The end-to-end auto-editor pipeline — ingest raw footage, transcribe & caption with whisper.cpp, generate motion-graphic clips with Hyperframes, add gradient/textured backgrounds with ShaderGradient, assemble a JSON timeline, preview/edit in the browser editor, and export MP4 with Remotion. Use when building or running the auto-editor, wiring its stages together, or understanding how captions, motion clips, backgrounds, and the timeline fit into a single render. Triggers: "auto-editor pipeline", "caption and edit a video", "assemble the timeline", "export the edit", "how does the editor work end to end".'
metadata:
  tags: auto-editor, pipeline, remotion, whisper, hyperframes, shadergradient, captions, timeline
---

# Auto-editor workflow

The auto-editor turns raw footage into a captioned, motion-graphic-enhanced MP4 through a deterministic, JSON-driven pipeline. Every stage writes into a single **project JSON** (the timeline); Remotion renders it. Because each stage is reproducible from that JSON, you can re-run, edit, and re-export without redoing earlier work.

## When to use

- Building, extending, or running the auto-editor end to end.
- Wiring a new stage (a new clip type, caption style, or background) into the pipeline.
- Understanding how captions, motion clips, backgrounds, and the timeline compose into one render.

## Companion skills

- [hyperframes](../hyperframes/SKILL.md) — authoring/rendering HTML→MP4 motion-graphic clips (`motionClip` items).
- [motion-graphics](../motion-graphics/SKILL.md) — `motion` + `@shadergradient/react`; where animation belongs in each layer.
- [remotion-best-practices](../remotion-best-practices/SKILL.md) — the Remotion composition that assembles and renders the timeline (captions, sequencing, transitions, fonts).

## The pipeline

```
ingest → transcribe/caption → motion-graphic clips → gradient/textured backgrounds
       → assemble JSON timeline → preview/edit (browser) → export MP4
```

Each step appends to the project JSON. Steps are independent given that JSON, so re-running one stage doesn't invalidate the others.

### 1. Ingest

Pull in the source footage (and any audio/B-roll). Probe duration/dimensions/fps (FFmpeg/`ffprobe`) and record them in the project JSON as the base track. Normalize to the project's target resolution/fps up front so every downstream stage shares one frame grid.

### 2. Transcribe & caption (whisper.cpp)

Run **whisper.cpp** to produce a timestamped transcript (word- or segment-level). Convert it to caption items on the timeline.

- Word-level timestamps enable karaoke/highlight captions; segment-level is fine for simple subtitles.
- Caption *styling and rendering* happens in the Remotion composition — see [remotion-best-practices](../remotion-best-practices/SKILL.md) `rules/subtitles.md` and `rules/text-animations.md`. This skill's job is getting accurate, timestamped caption data into the timeline.
- Store captions as structured items (`{ text, startMs, endMs, words? }`) keyed to the project frame grid, not as burned-in pixels — that keeps them editable.

### 3. Generate motion-graphic clips (Hyperframes)

For title cards, lower-thirds, kinetic text, logo stings, and data flourishes, author **Hyperframes** HTML clips and render them to MP4. Each rendered clip becomes a **`motionClip`** item in the timeline with a `from` (start frame) and `durationInFrames`.

- Render overlays with an **alpha channel** (e.g. ProRes 4444 / VP9 alpha) so Remotion can composite them over the footage.
- Keep clip dimensions equal to the project's (commonly 1080×1920 vertical or 1920×1080).
- All Hyperframes animation must be **paused & seekable** (deterministic). See [hyperframes](../hyperframes/SKILL.md).

### 4. Gradient / textured backgrounds (ShaderGradient)

Where a scene needs a backdrop (intro/outro cards, talking-head fill, text-only beats), use **`@shadergradient/react`**. Inside the Remotion composition, drive `uTime` from `useCurrentFrame()/fps` with `animate="off"` for deterministic renders. See [motion-graphics](../motion-graphics/SKILL.md) → `references/shadergradient.md`. Add the background as a `gradientBg` (or full-frame `background`) item layered beneath captions and clips.

### 5. Assemble the JSON timeline

Merge every stage's output into one project JSON: the base footage track, caption items, `motionClip` items, and background items — each with track index, `from`, and `durationInFrames` on the shared frame grid. This JSON is the single source of truth that Remotion reads. Validate it against the project schema before rendering so timing errors surface early, not mid-render.

### 6. Preview / edit (browser editor)

Load the project JSON into the **browser editor** (`@remotion/player`-based) to scrub, retime items, swap clips, and adjust caption styling live. Edits write back to the project JSON — nothing is destructive, because every change is a data change on the timeline, not a re-encode.

### 7. Export MP4 (Remotion)

Render the final timeline with Remotion (`@remotion/renderer` / CLI). The composition reads the project JSON and composites, in z-order: background (ShaderGradient) → footage → `motionClip` overlays → captions. Output is a single MP4. Because the whole timeline is deterministic, the export reproduces exactly what the editor previewed.

## Determinism is the through-line

Every stage must be a pure function of the timeline data and the frame number:

- whisper.cpp timestamps map to fixed frames.
- Hyperframes clips render by seeking paused timelines.
- ShaderGradient `uTime` is derived from `useCurrentFrame()`.
- Remotion composites by frame, never by wall-clock.

Keep this invariant and any stage can be re-run, the editor and the export will always agree, and renders are reproducible across machines.
