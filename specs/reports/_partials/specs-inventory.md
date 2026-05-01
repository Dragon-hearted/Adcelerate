# Spec/Plan Inventory — 2026-05-01

## Executive Summary
- Spec files found: 11
- SHIPPED (archive): 6
- ACTIVE (keep): 3
- SUPERSEDED (archive): 1
- ABANDONED (archive): 0
- AUDIT (keep): 1

Notes:
- `specs/full-security-and-housekeeping-review.md` is the active housekeeping audit plan (untracked working file, dated 2026-05-01); kept as AUDIT.
- `specs/reports/*` partials are this audit's outputs — not enumerated here.
- `_bmad-output/project-context.md` and `app_docs/*.md` are environment/context docs, not spec/plan files; excluded from classification.

## Inventory Table

| File | Title | First Seen | Last Modified | Classification | Evidence | Action |
|------|-------|------------|---------------|----------------|----------|--------|
| `specs/full-security-and-housekeeping-review.md` | Plan: Full Security & Housekeeping Review of Adcelerate + All Systems | 2026-05-01 (untracked) | 2026-05-01 | AUDIT | This audit's own plan; explicitly protected | KEEP |
| `specs/pinboard-ui-overhaul.md` | Plan: Pinboard UI Overhaul + Vision/Refs/Budget/PromptWriter Fixes | 2026-04-26 | 2026-04-26 | ACTIVE | Open PR #9 head=`feat/pinboard-ui-overhaul`; partial commits `b722070`, `ee8b0ec`, `1cf44d2`, `7957b7b` (Phase 1 Darkroom + CLI launcher pass landed; remaining phases in flight) | KEEP |
| `specs/inbox/pinboard-overhaul.md` | Pinboard App Overhaul - Implementation Plan | 2026-04-25 | 2026-04-25 | ACTIVE | Inbox-staged subset of `pinboard-ui-overhaul.md`; same feature scope referenced by open PR #9 | KEEP |
| `specs/inbox/pinboard-tidy-toast.md` | Pinboard TUI — Tidy Toast Sweep | 2026-04-25 | 2026-04-25 | SHIPPED | Commit `a60ddc7` "Bump Pinboard submodule: tidy-toast sweep (delete/clear/help-fix/hints/preview)" | ARCHIVE |
| `specs/pinboard-vision-gallery-keyrotate.md` | Plan: Pinboard System Update — Vision, Prompt Drafting, Gallery Semantics, Upload UX, Preview, Key Rotation | 2026-04-26 | 2026-04-26 | SHIPPED | Commit `9f6f7a4` "feat(pinboard): bump submodules — vision/gallery overhaul + budget+key rotation"; supporting `bc4eb33` "fix(image-engine): bump submodule with rotating-key fix" | ARCHIVE |
| `specs/pinboard-terminal-rewrite.md` | Plan: Pinboard Terminal Rewrite (Warp-styled TUI + ImageEngine + PromptWriter + Pinterest Import) | 2026-04-18 | 2026-04-18 | SUPERSEDED | Initial TUI rewrite shipped via PR #1 (`fa8cedb` merge of `pinboard-tui-rewrite`, `b5f9e74` Ink TUI bump); newer scope picked up by `pinboard-ui-overhaul.md` (Darkroom aesthetic, CLI launcher) | ARCHIVE |
| `specs/pinboard-image-generation-app.md` | Plan: Pinboard — AI Image Generation with Reference Images | 2026-03-25 | 2026-03-25 | SHIPPED | Pinboard submodule landed via `41de197` "Add pinboard as git submodule"; reference-image generation shipped per `0f44554` "Bump image-engine + pinboard: inline base64 references fix" and ongoing pinboard bumps | ARCHIVE |
| `specs/nanobanana-image-engine-and-sceneboard-integration.md` | Plan: NanoBanana Image Engine + SceneBoard Integration | 2026-04-12 | 2026-04-12 | SHIPPED | Commits `8b52f29` "Add ImageEngine as submodule", `20c4e16` "feat(skills): wire scene-board Stage 4.5", `b129dbd` "refactor(skills): align scene-board Stage 4.5", `bc4eb33` image-engine rotating-key fix; `systems/image-engine` and `systems/scene-board` exist | ARCHIVE |
| `specs/prompt-writer-system.md` | Plan: PromptWriter System — Centralized AI Prompt Engineering Authority | 2026-04-14 | 2026-04-14 | SHIPPED | Commits `3e70ee2` "Add PromptWriter system: centralized prompt engineering knowledge", `1f52c9a` "Convert readme-engine and prompt-writer to submodules", `cfdffc8`/`71f8d82` submodule refs; `systems/prompt-writer` exists | ARCHIVE |
| `specs/autocaption-terminal-app.md` | Plan: autoCaption — Terminal Video Captioning App (Remotion-powered) | 2026-03-25 | 2026-03-25 | SHIPPED | `systems/autoCaption` system exists with full Remotion app (src/, tests/, justfile, package.json); shipped as part of original platform restructure (`89700ef` "Restructure systems into systems/ directory with submodules") | ARCHIVE |
| `specs/adcelerate-v1-platform-upgrade.md` | Plan: Adcelerate v1 Platform Upgrade | 2026-03-25 | 2026-03-25 | SHIPPED | Commit `b7f7312` "Adcelerate v1: refactor UI components, add agents/skills, and knowledge base"; v1 platform structure now baseline (systems/, skills/, knowledge/) | ARCHIVE |

## Cross-References

### Spec ↔ Commit SHA mappings
- `pinboard-vision-gallery-keyrotate.md` → `9f6f7a4` feat(pinboard): vision/gallery overhaul + budget+key rotation; `bc4eb33` fix(image-engine): rotating-key fix
- `inbox/pinboard-tidy-toast.md` → `a60ddc7` Bump Pinboard submodule: tidy-toast sweep
- `pinboard-terminal-rewrite.md` → `b5f9e74` Bump Pinboard submodule: terminal rewrite (Ink TUI); `fa8cedb` PR #1 merge
- `pinboard-image-generation-app.md` → `41de197` Add pinboard as git submodule; `0f44554` inline base64 references fix
- `nanobanana-image-engine-and-sceneboard-integration.md` → `8b52f29` Add ImageEngine as submodule; `20c4e16` scene-board Stage 4.5; `b129dbd` Stage 4.5 single composite
- `prompt-writer-system.md` → `3e70ee2` Add PromptWriter system; `1f52c9a` Convert readme-engine and prompt-writer to submodules
- `autocaption-terminal-app.md` → `89700ef` Restructure systems into systems/ directory with submodules (autoCaption present in tree)
- `adcelerate-v1-platform-upgrade.md` → `b7f7312` Adcelerate v1: refactor UI components, add agents/skills, and knowledge base

### Spec ↔ Open PR mappings
- `pinboard-ui-overhaul.md` ↔ PR #9 (head=`feat/pinboard-ui-overhaul`, "feat(pinboard): UI overhaul + CLI launcher rubric pass") — IN PROGRESS
- `inbox/pinboard-overhaul.md` ↔ PR #9 (companion inbox-staged plan for the same overhaul effort)
- (no spec maps to PR #7 head=`claude/refine-local-plan-d5Iox` "feat(design-system): unified token system" — design-system rollout is tracked by `_bmad-output`/docs, not by a `specs/*.md` file)

### Spec ↔ Active branch mappings
- `feat/pinboard-ui-overhaul` (current branch, parent of PR #9) → `pinboard-ui-overhaul.md` + `inbox/pinboard-overhaul.md`
- `claude/refine-local-plan-d5Iox` (PR #7, design-system) → no matching spec file
- `pinboard-tui-rewrite`, `pinboard-ci-fix`, `feature/adcelerate-v1` → stale branches matching SHIPPED specs above

### Supersession chains
- `pinboard-terminal-rewrite.md` (2026-04-18, Warp-styled TUI rewrite) → SUPERSEDED by `pinboard-ui-overhaul.md` (2026-04-26, Darkroom aesthetic + CLI launcher) which subsumed remaining UI work after the initial Ink TUI rewrite shipped.
- `pinboard-image-generation-app.md` (2026-03-25, original gen app spec) → SHIPPED by initial pinboard submodule + later refined by `pinboard-vision-gallery-keyrotate.md` (also SHIPPED) and `pinboard-ui-overhaul.md` (ACTIVE).
- `inbox/pinboard-overhaul.md` and `pinboard-ui-overhaul.md` are companion plans for the same effort (inbox is a focused subset; root spec is comprehensive). Both kept while PR #9 is open.

## Action Proposal — Specs to Archive

- [ ] `specs/pinboard-vision-gallery-keyrotate.md` → `specs/archive/pinboard-vision-gallery-keyrotate.md` (reason: SHIPPED in `9f6f7a4` + `bc4eb33`)
- [ ] `specs/inbox/pinboard-tidy-toast.md` → `specs/archive/pinboard-tidy-toast.md` (reason: SHIPPED in `a60ddc7`)
- [ ] `specs/pinboard-terminal-rewrite.md` → `specs/archive/pinboard-terminal-rewrite.md` (reason: SUPERSEDED by `pinboard-ui-overhaul.md`; initial rewrite shipped via PR #1 `fa8cedb`)
- [ ] `specs/pinboard-image-generation-app.md` → `specs/archive/pinboard-image-generation-app.md` (reason: SHIPPED via `41de197` + `0f44554`; downstream refinements tracked by newer specs)
- [ ] `specs/nanobanana-image-engine-and-sceneboard-integration.md` → `specs/archive/nanobanana-image-engine-and-sceneboard-integration.md` (reason: SHIPPED — `8b52f29`, `20c4e16`, `b129dbd`, `bc4eb33`; systems/image-engine + systems/scene-board live)
- [ ] `specs/prompt-writer-system.md` → `specs/archive/prompt-writer-system.md` (reason: SHIPPED in `3e70ee2` + `1f52c9a`; systems/prompt-writer live)
- [ ] `specs/autocaption-terminal-app.md` → `specs/archive/autocaption-terminal-app.md` (reason: SHIPPED — systems/autoCaption Remotion app present in tree since `89700ef`)
- [ ] `specs/adcelerate-v1-platform-upgrade.md` → `specs/archive/adcelerate-v1-platform-upgrade.md` (reason: SHIPPED in `b7f7312`; v1 platform structure is now the baseline)

Recommended migration command (single batch, preserves history):

```bash
mkdir -p specs/archive && \
git mv specs/pinboard-vision-gallery-keyrotate.md specs/archive/ && \
git mv specs/inbox/pinboard-tidy-toast.md specs/archive/ && \
git mv specs/pinboard-terminal-rewrite.md specs/archive/ && \
git mv specs/pinboard-image-generation-app.md specs/archive/ && \
git mv specs/nanobanana-image-engine-and-sceneboard-integration.md specs/archive/ && \
git mv specs/prompt-writer-system.md specs/archive/ && \
git mv specs/autocaption-terminal-app.md specs/archive/ && \
git mv specs/adcelerate-v1-platform-upgrade.md specs/archive/
```

No specs are recommended for DELETE-ONLY-WITH-APPROVAL — every file has either landed value or is referenced by an active PR.

## Tasks-Left Summary (ACTIVE specs)

- **`specs/pinboard-ui-overhaul.md`** — In flight via PR #9. Phase 1 (Darkroom aesthetic, `b722070`) and CLI launcher rubric pass (`ee8b0ec`) landed; remaining phases include Vision/Refs/Budget polish and PromptWriter integration fixes per the multi-phase plan. Submodule bumps still pending merge to `master`.
- **`specs/inbox/pinboard-overhaul.md`** — Inbox-staged checklist that mirrors the in-flight overhaul work tracked by PR #9. Used as the focused execution checklist; folds into the same merge once PR #9 lands.
- **`specs/full-security-and-housekeeping-review.md`** — This audit. Currently running: spec inventory (this file), branches, PRs, security, and open-tasks partials in `specs/reports/_partials/`. Final consolidation report and approved cleanup actions still pending.
