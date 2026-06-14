# Iterate Post — Revise an Existing Project

**Trigger:** User selects `[IP] Iterate Post`, or wants to change an already-created post/carousel.
**Goal:** Make surgical, approval-gated revisions to an existing project — copy, cover, slides, format — and re-export. No restart.

> Run engine commands from `systems/post-board`. Default client: `dragonhearted_labs`.

---

## Core Principles

- **Surgical, not wholesale.** Change only what the user asks; preserve everything else.
- **Gate every change.** Same `[A]/[M]/[R]` protocol as generate.
- **Persist through the schema.** Every write goes through `saveProject` / `PUT /api/projects/:id` so it stays Zod-valid.

---

## Stage 1 — Load the Project

1. **List existing projects:**

```bash
cd systems/post-board
bun -e 'import { listProjects } from "./src/index"; console.log((await listProjects()).join("\n"))'
```

   (Or `GET /api/projects` if the server is running.)

2. **Ask which project** (if not already named). Load + summarize it:

```bash
cd systems/post-board
bun -e 'import { loadProject } from "./src/index"; const p = await loadProject(process.argv[1]); console.log(p.type, p.format.preset, p.styleMode, "—", p.slides.length, "slides"); for (const s of p.slides) console.log(" ", s.id, s.role)' <project-id>
```

3. **Confirm context:** type, format, style mode, slide roles, and whether the cover is CSS or a generated image.

---

## Stage 2 — Identify the Change

Ask what to revise, then route:

| The user wants to… | Path |
|---|---|
| Reword the hook / a slide / the CTA / caption | **2A — Copy revision** |
| Add / remove / reorder slides | **2B — Slide structure** |
| Swap the cover to a generated background (or back to CSS) | **2C — Cover treatment** |
| Change format or style mode | **2D — Format / style** |
| Just nudge layers visually | Open the editor (Stage 3) — no code change needed |

### 2A — Copy revision
- Re-run the relevant copy skill (copywriting / ad-creative / social-content / marketing-psychology) for the part in question, presenting 2 options for anything regenerated.
- Rebuild the CopyDoc (or edit just the changed fields), then re-apply with `scripts/apply-copy.ts` (see generate-post.md Stage 4B). **Note:** re-applying the whole CopyDoc rebuilds all slide layers from the layouts — use it when copy changed broadly. For a one-field tweak the user already made in the editor, prefer editing that layer's `content` directly via `PUT` to avoid discarding manual layout nudges.
- Gate the new copy before applying.

### 2B — Slide structure
- Edit `project.slides` directly (add/remove/reorder), keeping each slide Zod-valid (unique `id`, valid `role`, layers). Easiest: regenerate from an updated CopyDoc (adds/removes body slides) via `apply-copy.ts`.
- Re-number slide ids predictably (`slide-1…N`).

### 2C — Cover treatment
- **To a generated background:** describe + gate the prompt, then `bun run src/cli.ts generate-cover --project <id>`. Requires ImageEngine :3002 — if down, keep CSS (start it with `just sub systems/image-engine start` from the monorepo root, then retry).
- **Back to CSS:** set the cover slide's `background` to `{ "type": "css", "styleMode": "<id>", "cssClass": "mode-<id>" }` and `PUT`.

### 2D — Format / style
- Changing format re-pins pixels; layer geometry is fractional in the templates but existing absolute layers won't auto-rescale. Safest: rebuild slides from the CopyDoc at the new format via `apply-copy.ts` (it reads `project.format.preset`), so update `project.format` first, then re-apply.
- Changing style mode: update `project.styleMode` and each slide's `background.styleMode`/`cssClass`; re-apply the CopyDoc to refresh.

**Approval Gate** (every change):

```
--- Iterate: [change type] ---

[Before → After preview]

---
[A] Approve — Apply this change
[M] Modify  — Adjust the change
[R] Reject  — Don't apply

Anything else to revise, or shall I apply?
```

---

## Stage 3 — Re-open the Editor (if needed)

```bash
cd systems/post-board
bun run src/cli.ts serve --port 4300   # background, if not already running
```

Editor: `http://127.0.0.1:4300/editor?project=<project-id>`. Let the user verify the change live.

---

## Stage 4 — Re-export

```bash
cd systems/post-board
bun run src/cli.ts export --project <project-id> --pdf
```

Present the refreshed PNG paths (+ `carousel.pdf`) and the current caption + hashtags. Final gate:

```
[A] Approve — Done.
[M] Modify  — Another revision
[R] Reject  — Rework
```

---

## Cascade Awareness

- Re-applying a CopyDoc **rebuilds all slide layers** — it discards manual editor nudges. Warn the user: *"Re-applying the copy will reset layer positions you tweaked in the editor. Want me to regenerate, or edit just this field?"*
- A format change can shift every layer — prefer the rebuild path and re-open the editor afterward.
- Generated covers cost an ImageEngine call — confirm before re-running.
