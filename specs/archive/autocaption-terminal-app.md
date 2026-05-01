# Plan: autoCaption — Terminal Video Captioning App (Remotion-powered)

## Task Description
Build a standalone terminal application called **autoCaption** inside the Adcelerate monorepo. The app takes a video file (from any directory), transcribes the audio using Whisper.cpp (via `@remotion/install-whisper-cpp` — free, open-source), generates captions in Remotion's `Caption` format, and renders the video with styled caption overlays using Remotion. The overlay is done via Remotion (React-based video rendering) for superior future customization — fonts, sizes, effects, word-by-word highlighting, animations, positioning, etc. The app is structured as a separate project (like Pinboard) connected via git submodule, built with TypeScript/Bun, and developed with TDD practices including a CI pipeline.

## Objective
Deliver a fully functional, tested CLI tool that:
1. Accepts a video file path (any directory on the system)
2. Transcribes audio using Whisper.cpp via `@remotion/install-whisper-cpp`
3. Generates captions in JSON format (`Caption[]` from `@remotion/captions`)
4. Renders the video with TikTok-style caption overlays using Remotion
5. Has a clean CLI interface with future extensibility for customization (font, size, effects, position, word highlighting)
6. Is published as a separate GitHub repository and linked as a git submodule in Adcelerate

## Problem Statement
Manual captioning of videos is tedious and time-consuming. A terminal-first tool that automates transcription and caption overlay provides a fast, scriptable workflow for content creators. Using Remotion for the overlay (instead of FFmpeg subtitle burn) unlocks React-powered customization — TikTok-style word-by-word highlighting, custom fonts, animated transitions, and precise positioning that FFmpeg subtitle filters cannot achieve.

## Solution Approach
- **Language**: TypeScript with Bun runtime
- **Transcription**: `@remotion/install-whisper-cpp` — downloads, installs, and runs Whisper.cpp locally (free, open-source)
- **Captions**: `@remotion/captions` — `Caption` type, `toCaptions()`, `createTikTokStyleCaptions()`, `parseSrt()`
- **Video Rendering**: Remotion (`remotion`, `@remotion/cli`, `@remotion/renderer`) — React components render captions over source video, then render to output file
- **CLI Framework**: Custom CLI with `process.argv` parsing or a lightweight lib (commander/yargs). Bun script entry point.
- **Testing**: `vitest` with TDD — unit tests for transcription/captions, component tests, integration tests
- **CI**: GitHub Actions workflow with linting (`biome`), type checking (`tsc`), and tests (`vitest`)
- **Structure**: Standalone repo → git submodule in Adcelerate (mirrors Pinboard pattern)
- **Remotion Skill**: All Remotion code MUST follow patterns from `.agents/skills/remotion-best-practices/` — especially `rules/subtitles.md`, `rules/display-captions.md`, `rules/transcribe-captions.md`, `rules/fonts.md`, `rules/text-animations.md`

## Relevant Files
Use these files to understand patterns and complete the task:

- `pinboard/` — Reference for submodule structure, justfile, CI setup
- `pinboard/.github/workflows/ci.yml` — CI pattern to follow
- `pinboard/justfile` — Justfile pattern for submodule projects
- `.gitmodules` — Where to register the new submodule
- `justfile` — Root justfile to verify submodule commands work
- `.agents/skills/remotion-best-practices/rules/subtitles.md` — Caption type definitions, JSON format rules
- `.agents/skills/remotion-best-practices/rules/transcribe-captions.md` — Whisper.cpp transcription via `@remotion/install-whisper-cpp`
- `.agents/skills/remotion-best-practices/rules/display-captions.md` — TikTok-style caption pages, word highlighting, Sequence rendering
- `.agents/skills/remotion-best-practices/rules/import-srt-captions.md` — SRT import via `parseSrt()`
- `.agents/skills/remotion-best-practices/rules/fonts.md` — Google Fonts & local font loading
- `.agents/skills/remotion-best-practices/rules/text-animations.md` — Typewriter, word highlight animations
- `.agents/skills/remotion-best-practices/rules/videos.md` — Embedding source video in composition
- `.agents/skills/remotion-best-practices/rules/compositions.md` — Defining compositions and dynamic metadata
- `.agents/skills/remotion-best-practices/rules/calculate-metadata.md` — Dynamic duration from source video

### New Files (in autoCaption repo)

```
autoCaption/
├── .github/
│   └── workflows/
│       └── ci.yml                    # GitHub Actions CI pipeline
├── src/
│   ├── cli.ts                        # CLI entry point — parses args, orchestrates pipeline
│   ├── transcribe.ts                 # Whisper.cpp transcription script (install + download model + transcribe)
│   ├── captions/
│   │   ├── types.ts                  # Caption style types (Zod schema for Remotion input props)
│   │   ├── CaptionPage.tsx           # Single caption page component with word highlighting
│   │   └── CaptionOverlay.tsx        # Full caption overlay — maps pages to Sequences
│   ├── compositions/
│   │   ├── CaptionedVideo.tsx        # Main composition — source video + caption overlay
│   │   └── Root.tsx                  # Remotion Root with composition registration
│   ├── render.ts                     # Programmatic rendering via @remotion/renderer
│   └── config.ts                     # Default caption styles, position presets
├── tests/
│   ├── transcribe.test.ts            # Tests for transcription output format
│   ├── captions.test.ts              # Tests for caption page creation, formatting
│   ├── render.test.ts                # Tests for render command construction
│   ├── cli.test.ts                   # CLI integration tests
│   └── setup.ts                      # Test setup/fixtures
├── public/                           # Remotion public folder (captions JSON, test assets)
├── justfile                          # Dev commands (test, lint, typecheck, render, dev)
├── package.json                      # Dependencies, scripts
├── tsconfig.json                     # TypeScript config
├── remotion.config.ts                # Remotion bundler config
├── README.md                         # Usage docs
└── .gitignore                        # Node ignores
```

## Implementation Phases

### Phase 1: Foundation
- Create GitHub repo `autoCaption`
- Initialize Bun project with `package.json`
- Install Remotion packages: `remotion`, `@remotion/cli`, `@remotion/renderer`, `@remotion/captions`, `@remotion/install-whisper-cpp`, `@remotion/google-fonts`
- Set up TypeScript, Biome (linting/formatting), Vitest
- Create directory structure
- Write initial failing tests (TDD red phase)

### Phase 2: Core Implementation
- Implement transcription script using `@remotion/install-whisper-cpp` (install whisper.cpp, download model, transcribe, output `Caption[]` JSON)
- Implement Remotion caption components (`CaptionPage` with word highlighting, `CaptionOverlay` with Sequences, `CaptionedVideo` composition)
- Implement programmatic rendering via `@remotion/renderer`
- Wire up CLI (input path, output path, model size, srt-only mode)
- Make all tests pass (TDD green phase)

### Phase 3: Integration & Polish
- End-to-end integration test
- CI pipeline (GitHub Actions: biome lint + tsc typecheck + vitest)
- Add as git submodule to Adcelerate
- Push to GitHub

## Team Orchestration

- You operate as the team lead and orchestrate the team to execute the plan.
- You're responsible for deploying the right team members with the right context to execute the plan.
- IMPORTANT: You NEVER operate directly on the codebase. You use `Task` and `Task*` tools to deploy team members to to the building, validating, testing, deploying, and other tasks.
  - This is critical. You're job is to act as a high level director of the team, not a builder.
  - You're role is to validate all work is going well and make sure the team is on track to complete the plan.
  - You'll orchestrate this by using the Task* Tools to manage coordination between the team members.
  - Communication is paramount. You'll use the Task* Tools to communicate with the team members and ensure they're on track to complete the plan.
- Take note of the session id of each team member. This is how you'll reference them.
- IMPORTANT: All builders working on Remotion code MUST read and follow patterns from `.agents/skills/remotion-best-practices/` — specifically load the relevant rule files before writing Remotion components.

### Team Members

- Builder
  - Name: builder-foundation
  - Role: Set up the repo, Bun project, all dependencies, directory structure, configs (tsconfig, remotion.config, biome), justfile, CI pipeline, and initial git commit
  - Agent Type: builder
  - Resume: true

- Builder
  - Name: builder-transcription
  - Role: Implement the Whisper.cpp transcription pipeline — install script, model download, audio extraction, transcription to Caption[] JSON. Must read `.agents/skills/remotion-best-practices/rules/transcribe-captions.md` first.
  - Agent Type: builder
  - Resume: true

- Builder
  - Name: builder-remotion
  - Role: Implement all Remotion components — CaptionPage (word highlighting), CaptionOverlay (Sequence mapping), CaptionedVideo composition, Root registration, and programmatic render. Must read `.agents/skills/remotion-best-practices/rules/display-captions.md`, `rules/subtitles.md`, `rules/fonts.md`, `rules/videos.md`, `rules/compositions.md`, `rules/calculate-metadata.md` first.
  - Agent Type: builder
  - Resume: true

- Builder
  - Name: builder-cli
  - Role: Implement the CLI entry point that orchestrates: validate input → transcribe → generate captions JSON → render with Remotion → output. Also write tests (TDD).
  - Agent Type: builder
  - Resume: true

- Builder
  - Name: builder-integration
  - Role: Wire submodule into Adcelerate, push to GitHub, verify CI
  - Agent Type: builder
  - Resume: true

- Builder
  - Name: validator-final
  - Role: Validate the entire project — run tests, lint, typecheck, verify CLI help, check submodule, verify CI green
  - Agent Type: validator
  - Resume: false

## Step by Step Tasks

- IMPORTANT: Execute every step in order, top to bottom. Each task maps directly to a `TaskCreate` call.
- Before you start, run `TaskCreate` to create the initial task list that all team members can see and execute.

### 1. Initialize Project & Install Dependencies
- **Task ID**: init-project
- **Depends On**: none
- **Assigned To**: builder-foundation
- **Agent Type**: builder
- **Parallel**: false
- Create directory `autoCaption/` at `/Users/dragonhearted/Desktop/Adcelerate/autoCaption/`
- Run `bun init` inside it
- Install core dependencies:
  ```bash
  bun add remotion @remotion/cli @remotion/renderer @remotion/captions @remotion/install-whisper-cpp @remotion/google-fonts react react-dom zod
  ```
- Install dev dependencies:
  ```bash
  bun add -d @types/react @types/react-dom typescript vitest @biomejs/biome @remotion/bundler
  ```
- Create `tsconfig.json` with JSX support (react-jsx), strict mode, paths
- Create `remotion.config.ts` (Remotion bundler configuration)
- Create `biome.json` for linting/formatting config
- Create directory structure: `src/`, `src/captions/`, `src/compositions/`, `tests/`, `public/`
- Create `.gitignore` (node_modules, dist, whisper.cpp, *.mp4, *.wav — but NOT public/)
- Create `justfile` with recipes:
  - `test` → `bun run vitest run`
  - `test-watch` → `bun run vitest`
  - `lint` → `bun run biome check src/ tests/`
  - `format` → `bun run biome format --write src/ tests/`
  - `typecheck` → `bun run tsc --noEmit`
  - `dev` → `bun run remotion studio` (Remotion preview)
  - `render` → `bun run src/cli.ts` (CLI entry point)
- Create `package.json` scripts:
  - `"studio"`: `"remotion studio src/compositions/Root.tsx"`
  - `"render"`: `"bun run src/cli.ts"`
  - `"test"`: `"vitest run"`
  - `"typecheck"`: `"tsc --noEmit"`
  - `"lint"`: `"biome check src/ tests/"`
- Create `.github/workflows/ci.yml`:
  - Trigger on push/PR to master/main
  - Jobs: lint (biome check), typecheck (tsc --noEmit), test (vitest run)
  - Use `oven-sh/setup-bun@v2`
- Initialize git repo (`git init`), create initial commit
- Run `bun install` to verify setup

### 2. Write Test Suite (TDD Red Phase)
- **Task ID**: write-tests
- **Depends On**: init-project
- **Assigned To**: builder-cli
- **Agent Type**: builder
- **Parallel**: false
- Create `tests/setup.ts` with test fixtures:
  - Mock `Caption[]` data matching `@remotion/captions` Caption type
  - Mock Whisper.cpp output data
  - Helper to create temporary directories
- Create `tests/transcribe.test.ts`:
  - Test that transcription output matches `Caption[]` format (mocked)
  - Test `toCaptions()` postprocessing
  - Test model size parameter validation
  - Test error handling for missing audio file
- Create `tests/captions.test.ts`:
  - Test `createTikTokStyleCaptions()` produces correct pages from Caption data
  - Test page timing calculations (startMs, token fromMs/toMs)
  - Test empty captions input
  - Test various `combineTokensWithinMilliseconds` values
- Create `tests/render.test.ts`:
  - Test render configuration construction
  - Test output path generation (default naming convention)
  - Test composition props schema validation (Zod)
- Create `tests/cli.test.ts`:
  - Test CLI parses video path argument
  - Test CLI validates input file exists
  - Test CLI `--output` flag
  - Test CLI `--model` flag (tiny, base, small, medium, large)
  - Test CLI `--srt-only` flag
  - Test CLI error messages for missing args
- Verify all tests fail (red phase) — commit

### 3. Implement Transcription Pipeline
- **Task ID**: impl-transcription
- **Depends On**: write-tests
- **Assigned To**: builder-transcription
- **Agent Type**: builder
- **Parallel**: false
- FIRST: Read `.agents/skills/remotion-best-practices/rules/transcribe-captions.md` for the canonical pattern
- Implement `src/transcribe.ts`:
  - `ensureWhisperCpp()` — install Whisper.cpp to `whisper.cpp/` directory if not present, using `installWhisperCpp()` from `@remotion/install-whisper-cpp`
  - `ensureModel(model: string)` — download specified model if not present, using `downloadWhisperModel()`
  - `extractAudio(videoPath: string, outputPath: string)` — use FFmpeg subprocess to extract audio as 16KHz WAV
  - `transcribeVideo(videoPath: string, options: { model: string })` — full pipeline:
    1. Ensure Whisper.cpp is installed
    2. Ensure model is downloaded
    3. Extract audio from video to temp WAV
    4. Run `transcribe()` with `tokenLevelTimestamps: true`
    5. Run `toCaptions()` for postprocessing
    6. Return `Caption[]`
    7. Clean up temp WAV file
  - `writeCaptionsJson(captions: Caption[], outputPath: string)` — write captions to JSON file
- Run `just test` — transcription tests should pass

### 4. Implement Remotion Caption Components
- **Task ID**: impl-remotion
- **Depends On**: write-tests
- **Assigned To**: builder-remotion
- **Agent Type**: builder
- **Parallel**: true (can run alongside impl-transcription)
- FIRST: Read these Remotion skill files for canonical patterns:
  - `.agents/skills/remotion-best-practices/rules/display-captions.md`
  - `.agents/skills/remotion-best-practices/rules/subtitles.md`
  - `.agents/skills/remotion-best-practices/rules/fonts.md`
  - `.agents/skills/remotion-best-practices/rules/videos.md`
  - `.agents/skills/remotion-best-practices/rules/compositions.md`
  - `.agents/skills/remotion-best-practices/rules/calculate-metadata.md`
- Implement `src/config.ts`:
  - Zod schema for caption style input props:
    ```ts
    const CaptionStyleSchema = z.object({
      fontSize: z.number().default(80),
      fontFamily: z.string().default("Inter"),
      highlightColor: z.string().default("#39E508"),
      textColor: z.string().default("#FFFFFF"),
      position: z.enum(["top", "center", "bottom"]).default("bottom"),
      bold: z.boolean().default(true),
      combineTokensWithinMs: z.number().default(1200),
    });
    ```
  - Default style export
- Implement `src/captions/CaptionPage.tsx`:
  - Receives a `TikTokPage` prop
  - Uses `useCurrentFrame()` and `useVideoConfig()` for timing
  - Renders tokens with word-by-word highlighting (active word gets `highlightColor`)
  - Uses `whiteSpace: "pre"` for whitespace preservation
  - Applies font from props (loaded via `@remotion/google-fonts`)
  - Positions based on `position` prop (top/center/bottom via flexbox)
- Implement `src/captions/CaptionOverlay.tsx`:
  - Receives `captions: Caption[]` and style props
  - Uses `createTikTokStyleCaptions()` to generate pages
  - Maps pages to `<Sequence>` components with correct `from` and `durationInFrames`
  - Renders `<CaptionPage>` inside each Sequence
- Implement `src/compositions/CaptionedVideo.tsx`:
  - Main composition component
  - Loads captions JSON from `public/` via `staticFile()` + `useDelayRender()`
  - Renders source `<Video>` with `<CaptionOverlay>` on top inside `<AbsoluteFill>`
  - Accepts input props via Zod schema (videoSrc, captionsPath, style options)
- Implement `src/compositions/Root.tsx`:
  - Register `CaptionedVideo` composition with `<Composition>`
  - Use `calculateMetadata` to dynamically set duration from source video
  - Set default dimensions (1080x1920 for vertical, or match source video)
- Run `just test` — caption component tests should pass

### 5. Implement Programmatic Renderer
- **Task ID**: impl-renderer
- **Depends On**: impl-remotion
- **Assigned To**: builder-remotion
- **Agent Type**: builder
- **Parallel**: false
- Implement `src/render.ts`:
  - `renderVideo(options: RenderOptions)` — uses `@remotion/renderer`:
    1. Bundle the Remotion project using `bundle()` from `@remotion/bundler`
    2. Get composition with `selectComposition()`, passing input props
    3. Render with `renderMedia()` — output as mp4
    4. Return output path
  - `RenderOptions` type: `{ videoPath, captionsJsonPath, outputPath, style, compositionId }`
  - Progress callback for CLI feedback
- Run `just test` — render tests should pass

### 6. Implement CLI
- **Task ID**: impl-cli
- **Depends On**: impl-transcription, impl-renderer
- **Assigned To**: builder-cli
- **Agent Type**: builder
- **Parallel**: false
- Implement `src/cli.ts`:
  - Parse `process.argv` (or use a lightweight CLI lib):
    - Positional: `video_path` (required, validate file exists)
    - `--output` / `-o`: output video path (default: `<input>_captioned.mp4`)
    - `--model` / `-m`: Whisper model (default: "medium.en", choices: tiny/tiny.en/base/base.en/small/small.en/medium/medium.en/large)
    - `--srt-only`: only generate SRT file (use Remotion's SRT format), don't render
    - `--keep-captions`: keep captions JSON file after render
    - `--font-size`: caption font size (default: 80)
    - `--position`: caption position top/center/bottom (default: bottom)
    - `--highlight-color`: word highlight color (default: #39E508)
  - Pipeline:
    1. Validate input video exists
    2. Transcribe → `Caption[]`
    3. Write captions JSON to `public/` folder
    4. Copy/symlink source video to `public/` folder (for Remotion access via `staticFile()`)
    5. Render via `renderVideo()` with Remotion
    6. Clean up temp files (captions JSON, copied video) unless `--keep-captions`
    7. Output success message with path to rendered video
  - Progress feedback: show transcription progress, render progress (% complete)
  - Shebang line for direct execution: `#!/usr/bin/env bun`
- Run `just test` — all tests should pass
- Run `just lint` and `just typecheck` — fix any issues
- Commit all work

### 7. Integration Testing & README
- **Task ID**: integration-test
- **Depends On**: impl-cli
- **Assigned To**: builder-cli
- **Agent Type**: builder
- **Parallel**: false
- Create/update `tests/cli.test.ts` with integration tests:
  - Test full pipeline with a very short synthetic test video (generate via FFmpeg in test setup — 2 second video with silent tone)
  - Test `--srt-only` produces a valid SRT file
  - Test `--keep-captions` preserves JSON file
  - Test output file naming convention
- Run full test suite, ensure all pass
- Run `biome check` and `tsc --noEmit` — fix any issues
- Create `README.md` with:
  - What it does
  - Prerequisites (FFmpeg, Bun)
  - Installation (`bun install`)
  - Usage examples:
    - Basic: `bun run src/cli.ts /path/to/video.mp4`
    - With options: `bun run src/cli.ts video.mp4 -o output.mp4 --model medium.en --position center`
    - SRT only: `bun run src/cli.ts video.mp4 --srt-only`
  - Future customization roadmap (fonts, effects, animations, templates)
  - Development (just recipes)
- Commit all work

### 8. GitHub Setup & Submodule Integration
- **Task ID**: github-setup
- **Depends On**: integration-test
- **Assigned To**: builder-integration
- **Agent Type**: builder
- **Parallel**: false
- Create GitHub repo `autoCaption` under `Dragon-hearted` using `gh repo create Dragon-hearted/autoCaption --public --source=. --push`
- Push all commits to the new repo
- In Adcelerate root (`/Users/dragonhearted/Desktop/Adcelerate/`):
  - Add autoCaption as git submodule: `git submodule add https://github.com/Dragon-hearted/autoCaption.git autoCaption`
- Verify `just sub autoCaption test` works from Adcelerate root
- Check CI pipeline runs on GitHub: `cd autoCaption && gh run list --limit 1`
- Commit submodule addition to Adcelerate

### 9. Final Validation
- **Task ID**: validate-all
- **Depends On**: init-project, write-tests, impl-transcription, impl-remotion, impl-renderer, impl-cli, integration-test, github-setup
- **Assigned To**: validator-final
- **Agent Type**: validator
- **Parallel**: false
- Verify project structure matches the plan (all expected files exist)
- Run `cd autoCaption && bun run test` — all tests pass
- Run `cd autoCaption && bun run lint` — no lint errors
- Run `cd autoCaption && bun run typecheck` — no type errors
- Run `cd autoCaption && bun run src/cli.ts --help` — verify CLI outputs help
- Verify `cat .gitmodules` includes autoCaption entry
- Run `gh repo view Dragon-hearted/autoCaption` — verify repo exists
- Run `cd autoCaption && gh run list --limit 1` — verify CI ran
- Verify README.md is present and accurate

## Acceptance Criteria
- [ ] `autoCaption/` exists as a standalone project with its own git repo
- [ ] `bun run src/cli.ts <video_path>` transcribes and renders captioned video via Remotion
- [ ] `bun run src/cli.ts --srt-only <video_path>` generates only an SRT file
- [ ] Captions use Remotion's `Caption` type and `@remotion/captions` utilities
- [ ] Caption overlay uses TikTok-style pages with word-by-word highlighting
- [ ] Remotion renders a valid output MP4 with captions burned in
- [ ] CLI validates input file exists and provides clear error messages
- [ ] All tests pass (`vitest`)
- [ ] Linting passes (`biome check`)
- [ ] Type checking passes (`tsc --noEmit`)
- [ ] CI pipeline runs on push/PR and checks lint + typecheck + tests
- [ ] Project is pushed to GitHub under `Dragon-hearted`
- [ ] `autoCaption` is registered as a git submodule in Adcelerate
- [ ] `just sub autoCaption test` works from Adcelerate root
- [ ] Caption style is configurable via CLI flags (fontSize, position, highlightColor)
- [ ] Architecture supports future customization (font selection, effects, animation presets, templates)

## Validation Commands
Execute these commands to validate the task is complete:

- `cd /Users/dragonhearted/Desktop/Adcelerate/autoCaption && bun run test` — Run all tests
- `cd /Users/dragonhearted/Desktop/Adcelerate/autoCaption && bun run lint` — Lint check
- `cd /Users/dragonhearted/Desktop/Adcelerate/autoCaption && bun run typecheck` — Type check
- `cd /Users/dragonhearted/Desktop/Adcelerate/autoCaption && bun run src/cli.ts --help` — Verify CLI works
- `cat /Users/dragonhearted/Desktop/Adcelerate/.gitmodules` — Verify submodule registered
- `gh repo view Dragon-hearted/autoCaption` — Verify GitHub repo exists
- `cd /Users/dragonhearted/Desktop/Adcelerate/autoCaption && gh run list --limit 1` — Verify CI ran

## Notes
- **FFmpeg dependency**: Still required for audio extraction (video → 16KHz WAV for Whisper). Must be installed: `brew install ffmpeg`. The CLI should check for it.
- **Whisper.cpp**: `@remotion/install-whisper-cpp` handles downloading and building Whisper.cpp locally. First run will take time to compile. Models (~140MB for "medium.en") are downloaded on first use.
- **Remotion rendering**: Programmatic rendering via `@remotion/renderer` requires Chromium. Remotion handles this automatically but it can be slow on first run.
- **Performance**: Use "tiny" or "tiny.en" model for fast testing. "medium.en" is the recommended default for quality.
- **Remotion skill**: ALL Remotion code must follow patterns from `.agents/skills/remotion-best-practices/`. Key rules:
  - Captions must use `Caption` type from `@remotion/captions`
  - Use `createTikTokStyleCaptions()` for page grouping
  - Use `whiteSpace: "pre"` for caption text
  - Use `useDelayRender()` for async caption loading
  - Load fonts via `@remotion/google-fonts`
  - Put caption logic in a separate component file
- **Future customization roadmap** (not in v1 scope but architecture supports):
  - Font selection via `@remotion/google-fonts`
  - Animation presets (typewriter, fade-in, slide-up)
  - Word highlight effects (background color, underline, scale)
  - Caption templates (TikTok, YouTube, professional, minimal)
  - Custom positioning with pixel offsets
  - Shadow/outline effects
  - Multi-line caption formatting
