# Plan: Pinboard — AI Image Generation with Reference Images

## Task Description
Create a standalone project called **Pinboard** within the Adcelerate ecosystem. Pinboard is an AI-powered image generation tool that allows users to upload one or multiple reference images, describe what changes they want, and generate new images using AI models. The primary model is NanoBanana Pro, with an abstraction layer supporting multiple image generation models. The app features a dark-themed, production-grade UI with the ability to regenerate images and use generated images as new references. The project will be pushed to its own GitHub repository with a CI pipeline.

## Objective
Deliver a fully functional, self-contained Pinboard application with:
1. Multi-image upload and reference management
2. AI image generation via NanoBanana Pro (primary) with multi-model support
3. Regenerate and "use as reference" workflows
4. A polished dark-themed frontend
5. A separate GitHub repository with CI/CD pipeline
6. All work executed by team member agents — the orchestrator does not write code

## Problem Statement
Designers, marketers, and creatives need a fast way to iterate on visual ideas by providing reference images and describing modifications. Existing tools require switching between multiple platforms. Pinboard consolidates reference management and AI generation into a single, streamlined interface.

## Solution Approach
Build a React + Vite + Tailwind CSS frontend with a Bun + Hono backend. The backend abstracts image generation providers behind a unified interface, with NanoBanana Pro (via fal.ai) as the default. Images are stored locally with SQLite tracking metadata. The frontend provides a drag-and-drop pinboard interface where users manage references, describe changes, and iterate on generated results. GitHub Actions handles CI with linting, type-checking, and tests.

### Architecture

```
┌─────────────────────────────────────────────────┐
│                   Frontend                       │
│  React + Vite + Tailwind (Dark Theme)           │
│                                                  │
│  ┌──────────┐ ┌───────────┐ ┌────────────────┐ │
│  │ Image    │ │ Prompt    │ │ Generated     │  │
│  │ Uploader │ │ Editor    │ │ Image Gallery │  │
│  └──────────┘ └───────────┘ └────────────────┘ │
│  ┌──────────┐ ┌───────────┐ ┌────────────────┐ │
│  │ Reference│ │ Model     │ │ Action Bar    │  │
│  │ Gallery  │ │ Selector  │ │ (Regen/UseAs) │  │
│  └──────────┘ └───────────┘ └────────────────┘ │
└───────────────────┬─────────────────────────────┘
                    │ REST API
┌───────────────────▼─────────────────────────────┐
│                   Backend                        │
│  Bun + Hono                                     │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │ Provider Abstraction Layer               │   │
│  │  ├─ NanoBanana Pro (fal.ai) [default]   │   │
│  │  ├─ Stable Diffusion (fal.ai)           │   │
│  │  └─ ... extensible                       │   │
│  └──────────────────────────────────────────┘   │
│  ┌─────────┐ ┌──────────────┐                   │
│  │ SQLite  │ │ File Storage │                   │
│  │ (meta)  │ │ (uploads/)   │                   │
│  └─────────┘ └──────────────┘                   │
└─────────────────────────────────────────────────┘
```

## Relevant Files

### Existing Files (for reference/patterns)
- `apps/client/package.json` — Reference for Vite + Tailwind setup patterns used in Adcelerate
- `apps/client/vite.config.ts` — Vite configuration reference
- `apps/client/tailwind.config.js` — Tailwind configuration reference
- `apps/client/src/styles/themes.css` — Dark theme patterns reference
- `apps/server/package.json` — Reference for Bun server setup
- `apps/server/src/index.ts` — Server entry point pattern reference
- `apps/server/src/db.ts` — SQLite database pattern reference
- `justfile` — For adding Pinboard recipes later

### New Files

All new files will be created in a new directory: `pinboard/` at the project root (this will also become the root of the separate GitHub repo).

#### Project Root
- `pinboard/package.json` — Workspace root with scripts
- `pinboard/.env.example` — Environment variable template (FAL_KEY, etc.)
- `pinboard/.gitignore` — Standard ignores + uploads directory
- `pinboard/README.md` — Project documentation

#### Backend (`pinboard/server/`)
- `pinboard/server/package.json` — Bun server dependencies (hono, @fal-ai/serverless-client, better-sqlite3)
- `pinboard/server/tsconfig.json` — TypeScript config
- `pinboard/server/src/index.ts` — Server entry point with Hono routes
- `pinboard/server/src/db.ts` — SQLite database setup (images table, generations table)
- `pinboard/server/src/types.ts` — Shared types (GenerationRequest, Provider, etc.)
- `pinboard/server/src/routes/generate.ts` — POST /api/generate endpoint
- `pinboard/server/src/routes/images.ts` — GET/POST /api/images (upload, list, get)
- `pinboard/server/src/providers/base.ts` — Abstract provider interface
- `pinboard/server/src/providers/fal.ts` — fal.ai provider (NanoBanana Pro + others)
- `pinboard/server/src/providers/registry.ts` — Provider registry and factory

#### Frontend (`pinboard/client/`)
- `pinboard/client/package.json` — React + Vite + Tailwind dependencies
- `pinboard/client/tsconfig.json` — TypeScript config
- `pinboard/client/tsconfig.app.json` — App-specific TS config
- `pinboard/client/vite.config.ts` — Vite config with proxy to backend
- `pinboard/client/tailwind.config.js` — Tailwind with dark theme
- `pinboard/client/postcss.config.js` — PostCSS config
- `pinboard/client/index.html` — HTML entry point
- `pinboard/client/src/main.tsx` — React entry point
- `pinboard/client/src/App.tsx` — Main app with layout and routing
- `pinboard/client/src/styles/globals.css` — Global styles + Tailwind directives + dark theme
- `pinboard/client/src/types/index.ts` — Frontend type definitions
- `pinboard/client/src/api/client.ts` — API client for backend communication
- `pinboard/client/src/components/Layout.tsx` — App shell with dark sidebar
- `pinboard/client/src/components/ImageUploader.tsx` — Drag-and-drop multi-image uploader
- `pinboard/client/src/components/ReferenceGallery.tsx` — Grid of selected reference images with remove/reorder
- `pinboard/client/src/components/PromptEditor.tsx` — Text area for describing desired changes
- `pinboard/client/src/components/ModelSelector.tsx` — Dropdown to select AI model
- `pinboard/client/src/components/GeneratedImage.tsx` — Display generated image with action buttons
- `pinboard/client/src/components/ActionBar.tsx` — Regenerate + Use as Reference buttons
- `pinboard/client/src/components/GenerationHistory.tsx` — Sidebar showing past generations
- `pinboard/client/src/hooks/useImageGeneration.ts` — Hook for generation API calls + loading state
- `pinboard/client/src/hooks/useReferenceImages.ts` — Hook for managing reference image state

#### CI/CD
- `pinboard/.github/workflows/ci.yml` — GitHub Actions: lint, typecheck, test
- `pinboard/vitest.config.ts` — Vitest configuration (if tests are added)

## Implementation Phases

### Phase 1: Foundation
- Initialize the `pinboard/` directory structure
- Set up both client and server package.json with all dependencies
- Configure TypeScript, Vite, Tailwind, and PostCSS for the client
- Configure Bun + Hono for the server
- Set up SQLite database schema
- Create the provider abstraction interface
- Initialize a new Git repo and push to GitHub

### Phase 2: Core Implementation
- Implement the fal.ai provider with NanoBanana Pro as default model
- Build the image upload endpoint (multipart form data → local storage + SQLite record)
- Build the generation endpoint (accepts reference image IDs + prompt → calls provider → returns result)
- Build the React frontend: dark theme shell, image uploader, reference gallery, prompt editor, model selector
- Build the generated image display with regenerate and "use as reference" action buttons
- Wire frontend to backend API

### Phase 3: Integration & Polish
- Add generation history sidebar
- Implement "use generated image as reference" flow (moves generated image into reference pool)
- Add loading states, error handling, and toast notifications
- Polish the dark theme (consistent colors, hover states, transitions)
- Set up GitHub Actions CI pipeline (lint, typecheck, build)
- Final testing and validation

## Team Orchestration

- You operate as the team lead and orchestrate the team to execute the plan.
- You're responsible for deploying the right team members with the right context to execute the plan.
- IMPORTANT: You NEVER operate directly on the codebase. You use `Task` and `Task*` tools to deploy team members to to the building, validating, testing, deploying, and other tasks.
  - This is critical. You're job is to act as a high level director of the team, not a builder.
  - You're role is to validate all work is going well and make sure the team is on track to complete the plan.
  - You'll orchestrate this by using the Task* Tools to manage coordination between the team members.
  - Communication is paramount. You'll use the Task* Tools to communicate with the team members and ensure they're on track to complete the plan.
- Take note of the session id of each team member. This is how you'll reference them.

### Team Members

- Builder
  - Name: builder-foundation
  - Role: Project scaffolding — create directory structure, initialize packages, configure tooling, create GitHub repo
  - Agent Type: builder
  - Resume: true

- Builder
  - Name: builder-backend
  - Role: Backend development — Bun + Hono server, provider abstraction, fal.ai integration, API endpoints, SQLite database
  - Agent Type: builder
  - Resume: true

- Builder
  - Name: builder-frontend
  - Role: Frontend development — React components, dark theme, image upload, reference gallery, generation UI, action buttons. Use the `/frontend-design` skill for high-quality design output.
  - Agent Type: builder
  - Resume: true

- Builder
  - Name: builder-cicd
  - Role: CI/CD pipeline — GitHub Actions workflow, linting config, typecheck scripts
  - Agent Type: builder
  - Resume: false

- Builder
  - Name: builder-github
  - Role: Git and GitHub operations — initialize repo, push to separate GitHub remote, set up branch protection
  - Agent Type: general-purpose
  - Resume: false

- Validator
  - Name: validator-final
  - Role: End-to-end validation — verify all components work together, CI passes, frontend renders, API responds
  - Agent Type: validator
  - Resume: false

## Step by Step Tasks

- IMPORTANT: Execute every step in order, top to bottom. Each task maps directly to a `TaskCreate` call.
- Before you start, run `TaskCreate` to create the initial task list that all team members can see and execute.

### 1. Scaffold Project Structure
- **Task ID**: scaffold-project
- **Depends On**: none
- **Assigned To**: builder-foundation
- **Agent Type**: builder
- **Parallel**: false
- Create `pinboard/` directory at project root
- Create `pinboard/server/` and `pinboard/client/` subdirectories
- Create `pinboard/package.json` as workspace root with scripts: `"dev:server"`, `"dev:client"`, `"dev"` (runs both)
- Create `pinboard/.env.example` with `FAL_KEY=your_fal_api_key_here` and `PORT=3001`
- Create `pinboard/.gitignore` (node_modules, dist, .env, uploads/, *.db)
- Create `pinboard/README.md` with project overview

### 2. Setup Backend Foundation
- **Task ID**: setup-backend
- **Depends On**: scaffold-project
- **Assigned To**: builder-backend
- **Agent Type**: builder
- **Parallel**: false
- Create `pinboard/server/package.json` with dependencies: `hono`, `@fal-ai/serverless-client`, `better-sqlite3`, and dev deps: `@types/bun`, `@types/better-sqlite3`, `typescript`
- Create `pinboard/server/tsconfig.json` targeting ES2022 with Bun types
- Create `pinboard/server/src/types.ts` with interfaces:
  ```typescript
  interface GenerationRequest {
    referenceImageIds: string[];
    prompt: string;
    model: string; // e.g., "nanobanana-pro", "stable-diffusion-xl"
    options?: Record<string, unknown>;
  }
  interface GenerationResult {
    id: string;
    imageUrl: string;
    model: string;
    prompt: string;
    referenceImageIds: string[];
    createdAt: string;
  }
  interface ImageProvider {
    name: string;
    models: string[];
    generate(request: GenerationRequest, referenceImageUrls: string[]): Promise<GenerationResult>;
  }
  ```
- Create `pinboard/server/src/db.ts` — SQLite setup with tables:
  - `images` (id TEXT PK, filename TEXT, originalName TEXT, path TEXT, mimeType TEXT, size INTEGER, createdAt TEXT)
  - `generations` (id TEXT PK, prompt TEXT, model TEXT, resultPath TEXT, referenceImageIds TEXT JSON, createdAt TEXT)
- Create `pinboard/server/src/providers/base.ts` — Abstract ImageProvider interface
- Create `pinboard/server/src/providers/fal.ts` — fal.ai provider implementing ImageProvider:
  - Supports models: `nanobanana-pro` (default), `stable-diffusion-xl`, `flux-pro`
  - Converts local reference images to base64 for API calls
  - Handles fal.ai SDK initialization with FAL_KEY env var
- Create `pinboard/server/src/providers/registry.ts` — Provider registry that maps model names to providers
- Run `cd pinboard/server && bun install` to install dependencies

### 3. Build Backend API Endpoints
- **Task ID**: build-backend-api
- **Depends On**: setup-backend
- **Assigned To**: builder-backend
- **Agent Type**: builder
- **Parallel**: false
- Create `pinboard/server/src/routes/images.ts`:
  - `POST /api/images/upload` — Accept multipart form data, save files to `pinboard/server/uploads/`, insert record into SQLite, return image metadata
  - `GET /api/images` — List all uploaded images
  - `GET /api/images/:id` — Get single image metadata
  - `GET /api/images/:id/file` — Serve the actual image file
  - `DELETE /api/images/:id` — Remove image
- Create `pinboard/server/src/routes/generate.ts`:
  - `POST /api/generate` — Accept GenerationRequest JSON, resolve reference images from DB, call provider, save result to uploads/, insert generation record, return GenerationResult
  - `GET /api/generations` — List all generations (with pagination)
  - `GET /api/generations/:id` — Get single generation
  - `POST /api/generations/:id/use-as-reference` — Copy a generated image into the images table so it can be used as a reference
- Create `pinboard/server/src/routes/models.ts`:
  - `GET /api/models` — Return list of available models from the provider registry
- Create `pinboard/server/src/index.ts` — Hono app entry point:
  - Mount all route modules
  - Serve static files from uploads/
  - CORS middleware for dev (allow localhost:5174)
  - Listen on PORT (default 3001)
- Verify server starts: `cd pinboard/server && bun run src/index.ts`

### 4. Setup Frontend Foundation
- **Task ID**: setup-frontend
- **Depends On**: scaffold-project
- **Assigned To**: builder-frontend
- **Agent Type**: builder
- **Parallel**: true (can run alongside backend tasks 2-3)
- Create `pinboard/client/package.json` with React 19, Vite, Tailwind CSS, TypeScript, and dev dependencies
- Create `pinboard/client/tsconfig.json` and `pinboard/client/tsconfig.app.json`
- Create `pinboard/client/vite.config.ts` with React plugin and proxy `/api` to `http://localhost:3001`
- Create `pinboard/client/tailwind.config.js` — Dark mode enabled with custom color palette (zinc/slate-based dark theme with accent color)
- Create `pinboard/client/postcss.config.js`
- Create `pinboard/client/index.html`
- Create `pinboard/client/src/main.tsx` — React entry with StrictMode
- Create `pinboard/client/src/styles/globals.css`:
  ```css
  @tailwind base;
  @tailwind components;
  @tailwind utilities;

  :root { color-scheme: dark; }
  body { @apply bg-zinc-950 text-zinc-100; }
  ```
- Create `pinboard/client/src/types/index.ts` — Mirror backend types for frontend use
- Create `pinboard/client/src/api/client.ts` — Fetch wrapper with base URL, typed methods for all API endpoints
- Run `cd pinboard/client && bun install`

### 5. Build Frontend UI Components
- **Task ID**: build-frontend-ui
- **Depends On**: setup-frontend
- **Assigned To**: builder-frontend
- **Agent Type**: builder
- **Parallel**: false
- Use the `/frontend-design` skill approach for high-quality, distinctive design. The dark theme should feel modern and polished — not generic. Use zinc-950 as base background, zinc-900 for cards, and a vibrant accent color (violet-500 or cyan-500) for interactive elements.
- Create `pinboard/client/src/components/Layout.tsx`:
  - Dark app shell with left sidebar (generation history) and main content area
  - Top bar with "Pinboard" branding and model selector
  - Responsive layout
- Create `pinboard/client/src/components/ImageUploader.tsx`:
  - Drag-and-drop zone with dashed border that highlights on drag-over
  - Click to browse files (accept image/*)
  - Support multiple file selection
  - Show upload progress
  - Call POST /api/images/upload for each file
  - On success, add to reference gallery
- Create `pinboard/client/src/components/ReferenceGallery.tsx`:
  - Grid display of selected reference images (thumbnail cards)
  - Each card has a remove button (X) and shows filename
  - Shows count "N references selected"
  - Empty state: "Drop images above or click to upload references"
- Create `pinboard/client/src/components/PromptEditor.tsx`:
  - Large textarea with placeholder "Describe the changes you want..."
  - Character count
  - Submit button ("Generate") that's disabled when no references or no prompt
- Create `pinboard/client/src/components/ModelSelector.tsx`:
  - Dropdown populated from GET /api/models
  - Default selection: NanoBanana Pro
  - Shows model name and brief description
- Create `pinboard/client/src/components/GeneratedImage.tsx`:
  - Displays the generated image large/centered
  - Loading skeleton animation while generating
  - Fade-in on image load
- Create `pinboard/client/src/components/ActionBar.tsx`:
  - "Regenerate" button — calls generate API again with same params
  - "Use as Reference" button — calls POST /api/generations/:id/use-as-reference and adds to reference gallery
  - "Download" button — direct download link
  - Buttons styled with accent color, hover/active states
- Create `pinboard/client/src/components/GenerationHistory.tsx`:
  - Sidebar list of past generations
  - Each entry shows thumbnail, prompt preview, model, timestamp
  - Click to view in main area

### 6. Build Frontend Hooks and Wire Up
- **Task ID**: wire-frontend
- **Depends On**: build-frontend-ui, build-backend-api
- **Assigned To**: builder-frontend
- **Agent Type**: builder
- **Parallel**: false
- Create `pinboard/client/src/hooks/useReferenceImages.ts`:
  - State management for reference images (add, remove, reorder)
  - Upload function that calls API and adds result to state
  - "Use generated as reference" function
- Create `pinboard/client/src/hooks/useImageGeneration.ts`:
  - Generate function: takes referenceImageIds + prompt + model → calls POST /api/generate
  - Loading state, error state, result state
  - Regenerate function (same params, new call)
  - Generation history state (loaded from GET /api/generations)
- Create `pinboard/client/src/App.tsx`:
  - Compose all components into the full application
  - Wire hooks into components via props
  - Handle the "use as reference" flow end-to-end
- Verify the full flow works: upload images → enter prompt → select model → generate → regenerate → use as reference

### 7. Setup GitHub Repository
- **Task ID**: setup-github
- **Depends On**: wire-frontend
- **Assigned To**: builder-github
- **Agent Type**: general-purpose
- **Parallel**: false
- Initialize git repo inside `pinboard/`: `cd pinboard && git init`
- Create initial commit with all project files
- Create a new GitHub repository named "pinboard" using `gh repo create pinboard --public --source=. --push`
- Verify repo is accessible on GitHub

### 8. Setup CI/CD Pipeline
- **Task ID**: setup-cicd
- **Depends On**: setup-github
- **Assigned To**: builder-cicd
- **Agent Type**: builder
- **Parallel**: false
- Create `pinboard/.github/workflows/ci.yml`:
  ```yaml
  name: CI
  on: [push, pull_request]
  jobs:
    lint-and-typecheck:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: oven-sh/setup-bun@v2
        - name: Install server deps
          run: cd server && bun install
        - name: Install client deps
          run: cd client && bun install
        - name: Typecheck server
          run: cd server && bun run tsc --noEmit
        - name: Typecheck client
          run: cd client && bun run vue-tsc --noEmit || bun run tsc --noEmit
        - name: Build client
          run: cd client && bun run build
  ```
- Commit and push CI config
- Verify the GitHub Actions workflow triggers and passes

### 9. Final Validation
- **Task ID**: validate-all
- **Depends On**: scaffold-project, setup-backend, build-backend-api, setup-frontend, build-frontend-ui, wire-frontend, setup-github, setup-cicd
- **Assigned To**: validator-final
- **Agent Type**: validator
- **Parallel**: false
- Verify `pinboard/` directory exists with correct structure
- Verify `pinboard/server/` has all required files and `bun install` succeeds
- Verify `pinboard/client/` has all required files and `bun install` succeeds
- Verify server starts without errors: `cd pinboard/server && timeout 5 bun run src/index.ts || true`
- Verify client builds without errors: `cd pinboard/client && bun run build`
- Verify GitHub repo exists: `cd pinboard && gh repo view`
- Verify CI workflow file exists at `pinboard/.github/workflows/ci.yml`
- Verify dark theme is applied (check globals.css for dark mode classes)
- Verify provider abstraction exists with NanoBanana Pro as default
- Verify multi-model support (check registry.ts has multiple models)
- Verify regenerate and "use as reference" endpoints exist
- Run all validation commands listed below

## Acceptance Criteria
1. `pinboard/` directory exists as a self-contained project at the repo root
2. Server starts on port 3001 with Bun + Hono and responds to health checks
3. Image upload endpoint accepts multipart form data and stores files locally
4. Generation endpoint accepts reference image IDs + prompt + model and returns a result
5. NanoBanana Pro is the default model in the provider registry
6. At least 2 additional models are available in the model selector (multi-model support)
7. Provider abstraction layer allows adding new providers without modifying existing code
8. Frontend renders with a dark theme (zinc-950 background, no white/light pages)
9. Image uploader supports drag-and-drop and multi-file selection
10. Reference gallery displays uploaded images with remove functionality
11. "Regenerate" button triggers a new generation with the same parameters
12. "Use as Reference" button moves a generated image into the reference pool
13. Generation history is visible in the sidebar
14. Project is pushed to a separate GitHub repository named "pinboard"
15. GitHub Actions CI pipeline runs on push/PR and includes typecheck + build
16. All TypeScript files compile without errors
17. Client builds successfully with `bun run build`

## Validation Commands
Execute these commands to validate the task is complete:

- `ls pinboard/server/src/index.ts pinboard/client/src/App.tsx` — Verify core files exist
- `cd pinboard/server && bun install && bun run tsc --noEmit` — Verify server compiles
- `cd pinboard/client && bun install && bun run build` — Verify client builds
- `cd pinboard && gh repo view 2>/dev/null` — Verify GitHub repo exists
- `cat pinboard/.github/workflows/ci.yml` — Verify CI pipeline exists
- `grep -r "nanobanana\|NanoBanana\|nano-banana" pinboard/server/src/providers/` — Verify NanoBanana Pro provider
- `grep -r "dark\|zinc-950\|color-scheme" pinboard/client/src/styles/` — Verify dark theme
- `grep -r "use-as-reference\|useAsReference" pinboard/server/src/` — Verify use-as-reference endpoint
- `grep -r "regenerate\|Regenerate" pinboard/client/src/components/` — Verify regenerate button

## Notes
- **NanoBanana Pro**: This is assumed to be a model available via the fal.ai platform. The provider implementation should use the `@fal-ai/serverless-client` SDK. If NanoBanana Pro is not a recognized fal.ai model identifier, the builder should use the closest available image-to-image model and make the model ID configurable via environment variable.
- **Image Storage**: For simplicity, images are stored locally in `pinboard/server/uploads/`. For production, this should be migrated to cloud storage (S3, R2, etc.).
- **API Key**: The fal.ai API key must be set in `.env` as `FAL_KEY`. The `.env.example` documents this requirement.
- **Port Conflict**: The Pinboard server uses port 3001 to avoid conflicting with the Adcelerate observability server on port 4000.
- **Frontend Design**: The builder-frontend should use the `/frontend-design` skill to ensure high-quality, distinctive UI design. The dark theme should use zinc-950 as the base with violet-500 or cyan-500 as the accent color.
- **Multi-Model**: The provider registry pattern allows adding new providers (e.g., Replicate, OpenAI DALL-E) by implementing the ImageProvider interface and registering them — no changes needed to existing code.
- **Tmux**: All team members will be deployed using the tmux teammate mode configured in Adcelerate's settings.json. The orchestrator will launch agents that are visible in tmux panes.
