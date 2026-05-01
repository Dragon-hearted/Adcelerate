# Plan: NanoBanana Image Engine + SceneBoard Integration

## Task Description
Build a new Adcelerate system ("ImageEngine") that serves as the centralized NanoBanana image generation service using WisGate (JuheAPI) as the provider, with full API call management — rate limiting, token-based cost tracking, budget guards, retry/error handling, and a generation gallery. Then update SceneBoard to use ImageEngine for actual image generation during storyboard creation, with parallel generation for independent scenes, reference-image feedback loops (use a generated image as a reference for the next), and automatic placement of generated images into the final storyboard document.

## Objective
When complete:
1. A new `systems/image-engine` system exists, registered in `systems.yaml`, built via `/adcelerate-build`
2. ImageEngine exposes a Bun HTTP API that calls WisGate's Gemini image generation endpoint with: rate limiting, token-based cost tracking from response `usageMetadata`, budget ceiling alerts/hard stops (both local token tracking and WisGate balance API), retry with backoff, a persistent generation gallery (SQLite), and parallel batch endpoints
3. SceneBoard's workflow is updated (via `/adcelerate-diagnose`) so that Stage 6 (NanoBanana Prompt Generation) actually calls ImageEngine to generate images, places them in the storyboard, and supports using any generated image as a reference for subsequent generations
4. Independent scenes generate images in parallel; dependent scenes (those that reference another scene's output) generate sequentially

## Problem Statement
Today SceneBoard produces NanoBanana Pro prompts but does NOT call any API — the user must manually copy prompts and run them. There is no cost management layer: if a batch of 20 scenes fires off 20 API calls with retries, costs can spiral without visibility or guardrails. A dedicated ImageEngine system solves this: it becomes the single place all systems call for NanoBanana image generation via WisGate, with full operational safety built in.

## Solution Approach
1. **New system: ImageEngine** — A Bun/Hono HTTP server with:
   - WisGate provider that calls `https://api.wisgate.ai/v1beta/models/{model}:generateContent` — no SDK needed, just `fetch`
   - Three model tiers: `gemini-3-pro-image-preview` (Pro), `gemini-3.1-flash-image-preview` (Nano Banana 2 — fast), `gemini-2.5-flash-image` (economical)
   - SQLite database for generation records, token cost ledger, and budget config
   - Rate limiter (token bucket per minute, configurable)
   - Token-based cost tracker using `usageMetadata.totalTokenCount` from WisGate responses
   - Budget guard (soft warning at threshold, hard stop at ceiling) — tracks both local token spend and WisGate account balance via `GET /v1/users/me/balance`
   - Batch endpoint that accepts multiple prompts and executes them in parallel with concurrency control
   - Gallery endpoint to list/retrieve past generations
   - Reference image support: up to 14 reference images per request (6 objects + 5 humans), passed as base64 `inline_data` parts; also supports referencing a previous generation by ID
   - Multi-turn editing support: maintain conversation context for iterative image refinement
2. **SceneBoard integration** — Update SceneBoard's Stage 6 to:
   - Call ImageEngine's batch endpoint with all independent scene prompts
   - Handle dependency chains (scene B references scene A's output) by generating sequentially where needed
   - Download generated images and embed/link them in the storyboard document
   - Support re-generation of individual scenes
3. **Build via `/adcelerate-build`** — The ImageEngine system goes through the full Build Mode pipeline
4. **Update via `/adcelerate-diagnose`** — SceneBoard is updated through Diagnose Mode since it's an existing active system gaining new capabilities

## Relevant Files

### Existing Files to Reference
- `systems/pinboard/server/src/index.ts` — Hono app structure with CORS (architecture pattern to replicate)
- `systems/pinboard/server/src/db.ts` — SQLite + Bun database pattern (images + generations tables)
- `systems/pinboard/server/src/routes/generate.ts` — Generation endpoint pattern (single generation, reference images, gallery)
- `systems/pinboard/server/src/types.ts` — TypeScript interface patterns for generation records
- `systems/scene-board/knowledge/domain.md` — SceneBoard domain knowledge (NanoBanana Pro constraints, Style Anchor, Stage 6)
- `systems/scene-board/knowledge/scope.md` — Current scope (lists "Direct integration with NanoBanana Pro API" as OUT of scope — this changes)
- `systems/scene-board/knowledge/acceptance-criteria.md` — Hard gates and soft criteria for storyboards
- `systems/scene-board/knowledge/dependencies.md` — Current dependency list (NanoBanana Pro listed as external service)
- `systems/scene-board/templates/storyboard-template.md` — Storyboard template (needs image URL fields added)
- `systems/scene-board/src/index.ts` — SceneBoard entry point
- `systems/scene-board/package.json` — Current SceneBoard dependencies
- `systems.yaml` — System registry (ImageEngine must be registered here)
- `knowledge/graph.yaml` — Dependency topology (ImageEngine relationships must be added)
- `ai_docs/wisgate-nanobanana-api.md` — WisGate Gemini image generation API documentation (full reference)
- `ai_docs/wisgate-pricing.md` — WisGate pricing model documentation
- `ai_docs/wisgate-balance-api.md` — WisGate balance check API (`GET /v1/users/me/balance`)
- `ai_docs/wisgate-llms-index.md` — WisGate documentation index

### New Files (ImageEngine system — created by Build Mode scaffolding)
- `systems/image-engine/` — Root directory
- `systems/image-engine/src/index.ts` — Hono server entry point
- `systems/image-engine/src/wisgate.ts` — WisGate API client (single file — calls `api.wisgate.ai` via `fetch`, handles all 3 models, reference images, multi-turn, response parsing)
- `systems/image-engine/src/types.ts` — Request/response types, cost types, budget config, WisGate API types
- `systems/image-engine/src/db.ts` — SQLite schema: generations, token_ledger, budget_config, images
- `systems/image-engine/src/routes/generate.ts` — Single + batch generation endpoints
- `systems/image-engine/src/routes/gallery.ts` — Gallery listing, retrieval, use-as-reference
- `systems/image-engine/src/routes/budget.ts` — Budget status (local + WisGate balance), set ceiling, cost history
- `systems/image-engine/src/middleware/rate-limiter.ts` — Token bucket rate limiter
- `systems/image-engine/src/middleware/budget-guard.ts` — Budget enforcement middleware (local token ceiling + WisGate balance check)
- `systems/image-engine/src/lib/batch-executor.ts` — Parallel batch execution with concurrency control and dependency resolution
- `systems/image-engine/package.json` — Dependencies (only `hono` — no SDK needed, WisGate is plain `fetch`)
- `systems/image-engine/justfile` — Dev/start/test recipes
- `systems/image-engine/knowledge/` — Knowledge directory (created by Build Mode)
- `systems/image-engine/tsconfig.json` — TypeScript config

### Modified Files (SceneBoard integration — via Diagnose Mode)
- `systems/scene-board/knowledge/scope.md` — Move "Direct NanoBanana Pro API integration" from Out-of-Scope to In-Scope (via ImageEngine)
- `systems/scene-board/knowledge/dependencies.md` — Add ImageEngine as a runtime dependency
- `systems/scene-board/knowledge/domain.md` — Add image generation workflow, parallel execution, reference feedback, WisGate model tiers
- `systems/scene-board/knowledge/acceptance-criteria.md` — Add hard gates for image generation
- `systems/scene-board/templates/storyboard-template.md` — Add `image_url` and `image_id` fields to each scene block
- `systems/scene-board/src/image-client.ts` — NEW: HTTP client for ImageEngine API
- `systems/scene-board/src/batch-generator.ts` — NEW: Orchestrates parallel/sequential image generation for all scenes
- `systems/scene-board/src/storyboard-assembler.ts` — NEW: Places generated images into the final storyboard document

## Implementation Phases

### Phase 1: Foundation — Build ImageEngine System (via `/adcelerate-build`)
Run the full Adcelerate Build Mode pipeline to create the ImageEngine system:
1. **Intake** — Define scope: centralized image generation via WisGate with cost/rate management
2. **Knowledge Capture** — Document WisGate API, model tiers, reference image limits, multi-turn editing, token-based pricing, balance API
3. **Criteria Formalization** — Hard gates: budget ceiling enforcement, rate limiting, token cost tracking per request, generation gallery persistence, batch parallel execution, retry with backoff
4. **Scaffolding** — Create `systems/image-engine/` with all source files
5. **Validation** — Type check, lint, server starts and health check responds
6. **Registration** — Add to `systems.yaml` and `knowledge/graph.yaml`

### Phase 2: Core Implementation — Build ImageEngine Server
Implement the actual server code:
- Hono HTTP server on configurable port (default 3002)
- SQLite database with tables: generations, images, token_ledger, budget_config
- WisGate client module (`wisgate.ts`) that:
  - Calls `POST https://api.wisgate.ai/v1beta/models/{model}:generateContent`
  - Authenticates via `x-goog-api-key: WISDOM_GATE_KEY` header
  - Supports all 3 models by swapping `{model}` in the URL path
  - Builds the Gemini `contents` array with text prompt + inline_data reference images (base64)
  - Configures `generationConfig.responseModalities` (force IMAGE-only or TEXT+IMAGE)
  - Configures `generationConfig.imageConfig` with `aspectRatio` and `imageSize`
  - Supports optional `systemInstruction` for style guidance
  - Parses response `candidates[0].content.parts[]` to extract `inlineData` (base64 image) and text
  - Extracts `usageMetadata.totalTokenCount` for cost tracking
  - Supports multi-turn editing by accepting conversation history in `contents` array
- Rate limiter middleware (token bucket: configurable requests/minute, default 10/min)
- Cost tracker (records `totalTokenCount` from each WisGate response into `token_ledger`)
- Budget guard (configurable token ceiling, soft warning at 80%, hard stop at 100%; also checks WisGate account balance via `GET /v1/users/me/balance` with Bearer auth)
- Single generation endpoint: `POST /api/generate`
- Batch generation endpoint: `POST /api/generate/batch`
- Gallery endpoints: `GET /api/gallery`, `GET /api/gallery/:id`, `GET /api/gallery/:id/image`
- Budget endpoints: `GET /api/budget`, `PUT /api/budget/ceiling`, `GET /api/budget/history`
- Health endpoint: `GET /health`

### Phase 3: Integration — Update SceneBoard (via `/adcelerate-diagnose`)
Diagnose SceneBoard's current limitation (prompt-only, no actual generation) and implement the fix:
- Create `src/image-client.ts` — typed HTTP client for ImageEngine
- Create `src/batch-generator.ts` — takes all scene prompts + dependency graph, calls ImageEngine batch endpoint, handles parallel execution for independent scenes and sequential for dependent ones
- Create `src/storyboard-assembler.ts` — takes generated image results and injects them into the storyboard document (adds `image_url`, `image_id`, and optional local thumbnail paths)
- Update storyboard template with image fields
- Update SceneBoard knowledge files (scope, dependencies, acceptance criteria, domain)

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
  - Name: builder-build-mode
  - Role: Runs `/adcelerate-build` to create the ImageEngine system through the full Build Mode pipeline (intake, knowledge capture, criteria, scaffolding, validation, registration)
  - Agent Type: builder
  - Resume: true

- Builder
  - Name: builder-engine-core
  - Role: Implements the ImageEngine server core — WisGate client, database, types, Hono routes, and the batch executor with concurrency control
  - Agent Type: builder
  - Resume: true

- Builder
  - Name: builder-engine-middleware
  - Role: Implements the ImageEngine middleware stack — rate limiter, token-based cost tracker, and budget guard (local + WisGate balance)
  - Agent Type: builder
  - Resume: true

- Builder
  - Name: builder-diagnose-sceneboard
  - Role: Runs `/adcelerate-diagnose` on SceneBoard to identify the integration gap, then implements the image-client, batch-generator, and storyboard-assembler modules
  - Agent Type: builder
  - Resume: true

- Builder
  - Name: builder-sceneboard-knowledge
  - Role: Updates SceneBoard's knowledge files (scope, dependencies, acceptance-criteria, domain) and storyboard template to reflect the new image generation capabilities
  - Agent Type: builder
  - Resume: true

- Validator
  - Name: validator-engine
  - Role: Validates the ImageEngine system — type checking, lint, server startup, health check, endpoint smoke tests, budget guard behavior
  - Agent Type: validator
  - Resume: false

- Validator
  - Name: validator-integration
  - Role: Validates the SceneBoard integration — knowledge file consistency, template correctness, image-client type safety, batch-generator dependency resolution logic, storyboard-assembler output format
  - Agent Type: validator
  - Resume: false

- Validator
  - Name: validator-final
  - Role: Final end-to-end validation — both systems registered, cross-references correct in systems.yaml and graph.yaml, all acceptance criteria met, no regressions in existing systems
  - Agent Type: validator
  - Resume: false

## Step by Step Tasks

### 1. Run Build Mode for ImageEngine
- **Task ID**: build-mode-image-engine
- **Depends On**: none
- **Assigned To**: builder-build-mode
- **Agent Type**: builder
- **Parallel**: false (must complete before implementation begins)
- Run `/adcelerate-build` to create the ImageEngine system
- During intake, define scope: "Centralized NanoBanana image generation service using WisGate (JuheAPI) as the API provider, with rate limiting, token-based cost tracking, budget guards, retry/backoff, batch parallel execution, and generation gallery. Serves as the single API gateway for all systems needing image generation."
- During knowledge capture, document:
  - **WisGate API**: Base URL `https://api.wisgate.ai`, endpoint `POST /v1beta/models/{model}:generateContent`, auth via `x-goog-api-key` header with `WISDOM_GATE_KEY`
  - **Models available**:
    - `gemini-3-pro-image-preview` — Full-featured, resolutions 1K/2K/4K, best quality
    - `gemini-3.1-flash-image-preview` (Nano Banana 2) — High-efficiency, resolutions 0.5K/1K/2K/4K, optimized for speed
    - `gemini-2.5-flash-image` — Fast and economical, resolutions 1K/2K
  - **Reference images**: Up to 14 per request (6 objects with high-fidelity, 5 humans for character consistency), passed as `inline_data` with base64-encoded data and `mime_type`
  - **Multi-turn editing**: Conversation context maintained via `contents` array with `role: "user"` and `role: "model"` turns — enables iterative refinement
  - **Aspect ratios**: 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9 (model-dependent; `gemini-3.1-flash-image-preview` also supports 1:4, 1:8, 4:1, 8:1)
  - **Image size**: Configurable via `imageConfig.imageSize` (0.5K, 1K, 2K, 4K — model-dependent)
  - **Force image output**: Set `responseModalities: ["IMAGE"]` (without TEXT) to guarantee image generation
  - **Response format**: `candidates[0].content.parts[]` — each part is either `{text: string}` or `{inlineData: {mimeType: string, data: string}}` (base64)
  - **Token tracking**: Every response includes `usageMetadata` with `promptTokenCount`, `candidatesTokenCount`, `totalTokenCount` — use for cost tracking
  - **Balance API**: `GET https://api.wisgate.ai/v1/users/me/balance` with Bearer auth returns `{available_balance, package_balance, cash_balance, token_balance, is_token_unlimited_quota}`
  - **Error codes**: 400 (bad request), 401 (invalid API key), 429 (rate limit exceeded)
  - **Cost optimization**: Gemini 2.5 Flash Image consumes 1,290 tokens per image regardless of aspect ratio; lower resolutions consume fewer tokens; use Flash models for iterations, Pro for final output
  - Reference the full API docs at `ai_docs/wisgate-nanobanana-api.md` and `ai_docs/wisgate-balance-api.md`
  - **No SDK dependency**: WisGate API is called via plain `fetch` — no `@fal-ai/serverless-client` or `@google/generative-ai` packages needed
  - Failure modes: API timeout, 429 rate limit, invalid prompt, budget exceeded, network errors, safety filter blocks (finishReason: SAFETY)
- During criteria formalization, define hard gates:
  - Budget ceiling is enforced — hard stop when local token total exceeds ceiling
  - WisGate account balance is checked before batch operations and warned if low
  - Rate limiter prevents more than N requests/minute (configurable, default 10)
  - Every generation has a token cost record in the ledger (from `usageMetadata.totalTokenCount`)
  - Batch endpoint respects dependency ordering (dependent scenes wait for their references)
  - All generations are persisted in SQLite gallery with image files on disk
  - Retry with exponential backoff on transient failures (max 3 retries, not on 400/401)
  - Health endpoint returns 200
- Let Build Mode handle scaffolding, validation, and registration

### 2. Implement WisGate Client and Database
- **Task ID**: engine-wisgate-db
- **Depends On**: build-mode-image-engine
- **Assigned To**: builder-engine-core
- **Agent Type**: builder
- **Parallel**: true (can run alongside engine-middleware)
- Implement `src/wisgate.ts` — Single WisGate API client module:
  ```typescript
  // Core function signature:
  async function generateImage(request: WisGateRequest): Promise<WisGateResponse>
  
  // WisGateRequest includes:
  // - model: "gemini-3-pro-image-preview" | "gemini-3.1-flash-image-preview" | "gemini-2.5-flash-image"
  // - prompt: string (the text prompt)
  // - systemInstruction?: string (style/behavior guidance)
  // - referenceImages?: { data: string; mimeType: string }[] (base64 inline_data, up to 14)
  // - aspectRatio?: "1:1" | "9:16" | "16:9" | ... (from imageConfig)
  // - imageSize?: "0.5K" | "1K" | "2K" | "4K"
  // - forceImage?: boolean (if true, responseModalities = ["IMAGE"] only)
  // - conversationHistory?: GeminiContent[] (for multi-turn editing)
  
  // WisGateResponse includes:
  // - imageBuffer: Buffer (decoded from base64 inlineData)
  // - mimeType: string (from inlineData.mimeType)
  // - textResponse?: string (if TEXT was in responseModalities)
  // - tokenUsage: { promptTokens: number; candidateTokens: number; totalTokens: number }
  // - finishReason: string
  ```
  - Builds the Gemini `contents` array: text part first, then `inline_data` parts for each reference image
  - Sets `generationConfig.responseModalities` based on `forceImage` flag
  - Sets `generationConfig.imageConfig` with `aspectRatio` and `imageSize`
  - Sets `systemInstruction.parts[0].text` if provided
  - Makes the `fetch` call to `https://api.wisgate.ai/v1beta/models/${model}:generateContent` with `x-goog-api-key` header
  - Parses response: extracts base64 image from `inlineData`, decodes to Buffer, extracts `usageMetadata`
  - Handles error responses (400, 401, 429) with descriptive errors
  - Handles safety blocks (finishReason: SAFETY) with clear error message
  - Implements `checkBalance()` function: calls `GET /v1/users/me/balance` with Bearer auth, returns balance info
- Implement `src/types.ts` — Define all TypeScript types:
  - `WisGateRequest`, `WisGateResponse` (as above)
  - `GeminiContent`, `GeminiPart`, `GeminiCandidate` (matching WisGate OpenAPI schema)
  - `GenerationRequest` (ImageEngine's own request: prompt, model, referenceImageIds?, aspectRatio?, imageSize?, forceImage?, sceneId?)
  - `GenerationResult` (id, imageUrl, model, prompt, tokenUsage, createdAt)
  - `BatchRequest` (items: GenerationRequest[], dependencies?: {sceneId: string, dependsOn: string[]}[])
  - `BatchResult` (results: Map<string, GenerationResult | Error>)
  - `TokenCostRecord` (id, generationId, model, promptTokens, candidateTokens, totalTokens, createdAt)
  - `BudgetConfig` (id, tokenCeiling, warnAtPercent, isActive, updatedAt)
  - `ImageRecord`, `GenerationRecord`
  - `WisGateBalanceResponse` (available_balance, package_balance, cash_balance, token_balance, is_token_unlimited_quota)
- Implement `src/db.ts` — SQLite with WAL mode, tables:
  - `generations` (id TEXT PK, prompt TEXT, model TEXT, systemInstruction TEXT, aspectRatio TEXT, imageSize TEXT, resultPath TEXT, referenceImageIds TEXT, finishReason TEXT, createdAt TEXT)
  - `images` (id TEXT PK, filename TEXT, originalName TEXT, path TEXT, mimeType TEXT, size INTEGER, createdAt TEXT)
  - `token_ledger` (id TEXT PK, generationId TEXT, model TEXT, promptTokens INTEGER, candidateTokens INTEGER, totalTokens INTEGER, createdAt TEXT)
  - `budget_config` (id TEXT PK, tokenCeiling INTEGER, warnAtPercent INTEGER DEFAULT 80, isActive INTEGER DEFAULT 1, updatedAt TEXT)

### 3. Implement ImageEngine Middleware Stack
- **Task ID**: engine-middleware
- **Depends On**: build-mode-image-engine
- **Assigned To**: builder-engine-middleware
- **Agent Type**: builder
- **Parallel**: true (can run alongside engine-wisgate-db)
- Implement `src/middleware/rate-limiter.ts` — Token bucket algorithm: configurable capacity (default 10) and refill rate (default 10/minute). Returns 429 with `Retry-After` header when bucket is empty. State stored in-memory (resets on server restart — acceptable for single-server). Middleware signature compatible with Hono.
- Implement `src/middleware/budget-guard.ts` — Before each generation:
  - Query running token total from `token_ledger` (sum of `totalTokens`)
  - Compare against `budget_config.tokenCeiling`
  - At `warnAtPercent` (default 80%): include `X-Budget-Warning: approaching ceiling` header in response
  - At 100%: return 402 Payment Required with budget status JSON `{spent, ceiling, remaining, percentUsed}`
  - Optionally check WisGate account balance via `checkBalance()` — warn if `available_balance` is below a configurable threshold
  - Provide `X-Budget-Override: true` header bypass for emergency overrides

### 4. Implement ImageEngine Routes and Batch Executor
- **Task ID**: engine-routes
- **Depends On**: engine-wisgate-db, engine-middleware
- **Assigned To**: builder-engine-core
- **Agent Type**: builder
- **Parallel**: false (depends on WisGate client and middleware)
- Implement `src/routes/generate.ts`:
  - `POST /api/generate` — Single generation. Accepts `GenerationRequest`. Applies rate limiter + budget guard middleware. Calls `generateImage()` from wisgate.ts. Saves result to disk + SQLite. Records token usage in `token_ledger`. Returns `GenerationResult`.
  - `POST /api/generate/batch` — Accepts `BatchRequest` with `items[]` and optional `dependencies[]`. Uses batch-executor for parallel/sequential execution. Returns `BatchResult`.
- Implement `src/routes/gallery.ts`:
  - `GET /api/gallery` — List all generations with pagination (`?limit=20&offset=0`)
  - `GET /api/gallery/:id` — Get single generation record with token usage
  - `GET /api/gallery/:id/image` — Serve the generated image file (binary response)
  - `POST /api/gallery/:id/use-as-reference` — Load a generation's image as base64 for use as a reference in future generations
- Implement `src/routes/budget.ts`:
  - `GET /api/budget` — Current budget status: `{tokenCeiling, tokensSpent, tokensRemaining, percentUsed, wisGateBalance?}`
  - `PUT /api/budget/ceiling` — Set/update token ceiling
  - `GET /api/budget/history` — Token usage history with optional date range filter (`?from=&to=`)
  - `GET /api/budget/wisgate-balance` — Proxy to WisGate balance API, returns `WisGateBalanceResponse`
- Implement `src/lib/batch-executor.ts`:
  - Takes `BatchRequest`, resolves dependency graph via topological sort
  - Executes independent items in parallel (`Promise.allSettled` with concurrency limit via semaphore, default max 5 concurrent)
  - For dependent items: waits for dependency to complete, then loads the dependency's generated image as a reference `inline_data` part for the dependent request
  - Returns `BatchResult` with per-item status (success/failed), generation IDs, token usage, and any errors
  - Each item goes through rate limiter + budget guard individually (so a single budget breach stops remaining items, not the whole batch retroactively)
- Implement `src/index.ts` — Hono app:
  - CORS middleware (allow localhost origins)
  - Mount routes: `/api` for generate, `/api/gallery` for gallery, `/api/budget` for budget
  - Health check at `GET /health` returning `"ImageEngine API"`
  - Configurable port via `IMAGE_ENGINE_PORT` env var (default 3002)
- Create `justfile`:
  ```
  dev: bun --watch src/index.ts
  start: bun src/index.ts
  typecheck: bunx tsc --noEmit
  lint: bunx @biomejs/biome check .
  ```
- Create `package.json` with dependency: `hono` (only runtime dep — WisGate is plain `fetch`)

### 5. Validate ImageEngine System
- **Task ID**: validate-engine
- **Depends On**: engine-routes
- **Assigned To**: validator-engine
- **Agent Type**: validator
- **Parallel**: false
- Run `cd systems/image-engine && bunx tsc --noEmit` — zero type errors
- Run `cd systems/image-engine && bunx @biomejs/biome check .` — zero lint errors
- Verify server starts: `cd systems/image-engine && timeout 5 bun src/index.ts` — starts without crash
- Verify health check: `curl -s http://localhost:3002/health` — returns "ImageEngine API"
- Verify ImageEngine is registered in `systems.yaml` with status: active
- Verify ImageEngine is in `knowledge/graph.yaml` with correct dependency entries
- Verify budget endpoint: `GET /api/budget` returns valid budget status shape with `tokenCeiling`, `tokensSpent`, `tokensRemaining`, `percentUsed`
- Verify gallery: `GET /api/gallery` returns an empty array (no generations yet)
- Verify WisGate client types: confirm `wisgate.ts` exports `generateImage()` and `checkBalance()` functions
- Verify rate limiter is applied: check for rate-limit headers on generation endpoint

### 6. Diagnose SceneBoard for Integration
- **Task ID**: diagnose-sceneboard
- **Depends On**: validate-engine
- **Assigned To**: builder-diagnose-sceneboard
- **Agent Type**: builder
- **Parallel**: false (must complete before SceneBoard implementation)
- Run `/adcelerate-diagnose` on SceneBoard with the diagnosis: "SceneBoard currently produces NanoBanana Pro prompts but does not call any image generation API. It needs to integrate with the new ImageEngine system (running on localhost:3002) to actually generate images during storyboard creation. The integration must support: (1) parallel generation of independent scenes via ImageEngine's batch endpoint, (2) sequential generation when one scene references another's output (ImageEngine resolves dependency graph), (3) accessing generated images from ImageEngine gallery to use as references for new generations, (4) placing generated images into the final storyboard document with gallery URLs. ImageEngine uses WisGate API internally — SceneBoard does NOT call WisGate directly."
- Document the diagnosis findings and proposed fix
- Implement the following modules based on the diagnosis:
  - `src/image-client.ts` — Typed HTTP client for ImageEngine. Functions:
    - `generateSingle(req: GenerationRequest): Promise<GenerationResult>` — POST /api/generate
    - `generateBatch(req: BatchRequest): Promise<BatchResult>` — POST /api/generate/batch
    - `getGallery(limit?: number, offset?: number): Promise<GenerationResult[]>` — GET /api/gallery
    - `getImage(id: string): Promise<Buffer>` — GET /api/gallery/:id/image
    - `getImageAsReference(id: string): Promise<{data: string, mimeType: string}>` — POST /api/gallery/:id/use-as-reference
    - `getBudgetStatus(): Promise<BudgetStatus>` — GET /api/budget
    - Base URL configurable via `IMAGE_ENGINE_URL` env var (default `http://localhost:3002`)
  - `src/batch-generator.ts` — Takes scene list with prompts and dependency graph:
    - Builds `BatchRequest` from scene prompts: maps each scene to a `GenerationRequest` with `sceneId`, `prompt`, `model`, `aspectRatio` (from storyboard platform), `imageSize`, reference images
    - Builds `dependencies[]` from scenes that reference other scenes' outputs
    - Calls ImageEngine batch endpoint
    - Returns map of `sceneId -> GenerationResult`
    - Handles errors per-scene (failed scene doesn't block independent scenes)
    - Supports re-generation of individual scenes by calling `generateSingle()`
    - Checks budget before batch generation, warns user if batch would push past ceiling
  - `src/storyboard-assembler.ts` — Takes storyboard markdown content + scene-image map:
    - For each scene block in the markdown, injects: `image_url` (ImageEngine gallery URL `http://localhost:3002/api/gallery/{id}/image`), `image_id` (generation UUID), `status` (generated | pending | failed)
    - Handles scenes that failed generation gracefully (marks as "generation pending")
    - Produces final markdown document with all images linked

### 7. Update SceneBoard Knowledge and Template
- **Task ID**: update-sceneboard-knowledge
- **Depends On**: diagnose-sceneboard
- **Assigned To**: builder-sceneboard-knowledge
- **Agent Type**: builder
- **Parallel**: true (can run alongside validate-integration since it's knowledge files, not code)
- Update `systems/scene-board/knowledge/scope.md`:
  - Move "Direct integration with NanoBanana Pro API" from "Out of Scope" to "In Scope" with note: "via ImageEngine system (which calls WisGate API internally)"
  - Add to In Scope: "Parallel image generation for independent scenes", "Reference feedback loops (use generated image as reference for next generation)", "Automatic image placement in storyboard documents"
- Update `systems/scene-board/knowledge/dependencies.md`:
  - Add ImageEngine as runtime dependency: `ImageEngine | systems/image-engine | Centralized image generation via WisGate with cost/rate management`
  - Add new environment variable: `IMAGE_ENGINE_URL` (default `http://localhost:3002`)
  - Update External Services table: replace direct NanoBanana Pro (fal.ai) reference with "ImageEngine (wraps WisGate API)"
- Update `systems/scene-board/knowledge/acceptance-criteria.md`:
  - Add hard gates under new section "### Image Generation":
    - [ ] Every scene with a NanoBanana Pro prompt has a corresponding generated image (or explicit "generation pending" marker if generation failed)
    - [ ] Independent scenes are generated in parallel (not sequentially)
    - [ ] Scenes that reference another scene's output are generated after their dependency
    - [ ] Budget is checked before batch generation begins; user is warned if batch would exceed token ceiling
    - [ ] Generated images are accessible via ImageEngine gallery URLs in the storyboard
    - [ ] Aspect ratio in generation requests matches the storyboard's declared platform aspect ratio
- Update `systems/scene-board/knowledge/domain.md`:
  - Update "NanoBanana Pro" domain concept: note WisGate as the provider, update reference image limit from 3 to 14 (6 objects + 5 humans), add multi-turn editing capability, add model tier selection guidance (Flash for iterations, Pro for final)
  - Add new section "## Image Generation Workflow" documenting:
    - ImageEngine integration via HTTP client (`src/image-client.ts`)
    - Model selection: use `gemini-2.5-flash-image` or `gemini-3.1-flash-image-preview` during iteration, `gemini-3-pro-image-preview` for final storyboard
    - Parallel vs sequential generation logic (independent scenes in parallel, dependent scenes in order)
    - Reference feedback loops: generated image from scene A → passed as reference for scene B
    - Re-generation: individual scene re-gen via `generateSingle()`, full re-gen via `generateBatch()` with updated prompts
    - Budget awareness: check budget before batch, warn user, respect hard stops
- Update `systems/scene-board/templates/storyboard-template.md`:
  - Add to each scene block after "Reference Images":
    ```
    #### Generated Image
    **Image ID**: {{image-id-or-pending}}
    **Image URL**: {{image-engine-gallery-url-or-pending}}
    **Status**: {{generated | pending | failed}}
    **Model**: {{model-used}}
    **Tokens Used**: {{total-tokens}}
    ```

### 8. Validate SceneBoard Integration
- **Task ID**: validate-integration
- **Depends On**: diagnose-sceneboard, update-sceneboard-knowledge
- **Assigned To**: validator-integration
- **Agent Type**: validator
- **Parallel**: false
- Verify `src/image-client.ts` exists and exports all expected functions (generateSingle, generateBatch, getGallery, getImage, getImageAsReference, getBudgetStatus)
- Verify `src/batch-generator.ts` exists and handles both parallel (no dependencies) and sequential (with dependencies) cases
- Verify `src/storyboard-assembler.ts` exists and handles the injection of image fields into markdown
- Run `cd systems/scene-board && bunx tsc --noEmit` — zero type errors
- Run `cd systems/scene-board && bunx @biomejs/biome check .` — zero lint errors
- Verify storyboard template has the new "Generated Image" section with Image ID, Image URL, Status, Model, Tokens Used fields
- Verify `knowledge/scope.md` no longer lists "Direct integration with NanoBanana Pro API" as out of scope
- Verify `knowledge/dependencies.md` lists ImageEngine as a runtime dependency
- Verify `knowledge/acceptance-criteria.md` has the new "Image Generation" hard gates (6 new criteria)
- Verify `knowledge/domain.md` has the new "Image Generation Workflow" section and updated NanoBanana Pro reference image limit (14)

### 9. Final End-to-End Validation
- **Task ID**: validate-all
- **Depends On**: validate-engine, validate-integration
- **Assigned To**: validator-final
- **Agent Type**: validator
- **Parallel**: false
- Verify `systems.yaml` contains `image-engine` entry with status: active
- Verify `knowledge/graph.yaml` contains `image-engine` entry with correct depends_on (bun, wisgate-api, sqlite) and related_systems (scene-board)
- Verify `systems.yaml` scene-board entry still has status: active (no regression)
- Verify no type errors across both systems: `cd systems/image-engine && bunx tsc --noEmit && cd ../scene-board && bunx tsc --noEmit`
- Verify no lint errors across both systems
- Verify ImageEngine server starts and health check passes
- Verify all acceptance criteria from both systems' `knowledge/acceptance-criteria.md` are addressed in the implementation
- Verify no import cross-contamination (SceneBoard imports from its own `image-client.ts` only, never from `wisgate.ts` or ImageEngine internals)
- Verify the Pinboard system is unchanged (no regressions — it continues to work independently with its own providers)
- Verify ImageEngine has NO dependency on `@fal-ai/serverless-client` or `@google/generative-ai` — only `hono` and native `fetch`

## Acceptance Criteria

### ImageEngine System
- [ ] System registered in `systems.yaml` with status: active
- [ ] System registered in `knowledge/graph.yaml` with dependencies and relationships
- [ ] `POST /api/generate` generates a single image via WisGate API and returns generation record with token usage
- [ ] `POST /api/generate/batch` accepts multiple prompts with dependency graph, executes parallel/sequential correctly
- [ ] WisGate client (`wisgate.ts`) supports all 3 models: `gemini-3-pro-image-preview`, `gemini-3.1-flash-image-preview`, `gemini-2.5-flash-image`
- [ ] WisGate client supports up to 14 reference images as `inline_data` base64 parts
- [ ] WisGate client supports configurable `aspectRatio` and `imageSize` via `imageConfig`
- [ ] WisGate client supports `systemInstruction` for style guidance
- [ ] WisGate client supports multi-turn editing via `conversationHistory`
- [ ] WisGate client extracts `usageMetadata.totalTokenCount` from every response
- [ ] Rate limiter returns 429 when request rate exceeds configured limit
- [ ] Token cost tracker records `totalTokenCount` for every successful generation in `token_ledger` table
- [ ] Budget guard returns 402 when cumulative token spend exceeds ceiling
- [ ] Budget guard returns `X-Budget-Warning` header when spend exceeds 80% of ceiling
- [ ] Budget guard can check WisGate account balance via `GET /v1/users/me/balance`
- [ ] `GET /api/gallery` returns paginated list of all generations
- [ ] `GET /api/gallery/:id/image` serves the generated image file
- [ ] `POST /api/gallery/:id/use-as-reference` makes a generation's image available as base64 reference data
- [ ] Retry with exponential backoff on transient API failures (429, 5xx — max 3 retries; no retry on 400/401)
- [ ] Server starts on configured port with health check at `GET /health`
- [ ] Only runtime dependency is `hono` — no AI SDK packages
- [ ] TypeScript compiles with zero errors
- [ ] Biome lint passes with zero errors

### SceneBoard Integration
- [ ] `image-client.ts` provides typed HTTP client for all ImageEngine endpoints (generateSingle, generateBatch, getGallery, getImage, getImageAsReference, getBudgetStatus)
- [ ] `batch-generator.ts` builds dependency graph from scene list and generates images via ImageEngine batch endpoint
- [ ] Independent scenes are generated in parallel
- [ ] Dependent scenes (referencing another scene's output) wait for their dependency and receive the output as a reference image
- [ ] `storyboard-assembler.ts` injects image URLs, IDs, status, model, and token usage into storyboard documents
- [ ] Storyboard template includes "Generated Image" section per scene with all required fields
- [ ] Failed generations are marked as "pending" (don't crash the pipeline)
- [ ] Budget is checked before batch generation and user is warned if approaching ceiling
- [ ] Knowledge files (scope, dependencies, acceptance-criteria, domain) are updated with WisGate-specific details
- [ ] NanoBanana Pro reference image limit updated from 3 to 14 in domain knowledge
- [ ] TypeScript compiles with zero errors
- [ ] Biome lint passes with zero errors
- [ ] Pinboard system is untouched and still functional

## Validation Commands
Execute these commands to validate the task is complete:

- `cd systems/image-engine && bunx tsc --noEmit` — ImageEngine type check
- `cd systems/image-engine && bunx @biomejs/biome check .` — ImageEngine lint
- `cd systems/scene-board && bunx tsc --noEmit` — SceneBoard type check
- `cd systems/scene-board && bunx @biomejs/biome check .` — SceneBoard lint
- `cd systems/image-engine && timeout 5 bun src/index.ts &; sleep 2 && curl -s http://localhost:3002/health && kill %1` — ImageEngine server starts and health check passes
- `python3 -c "import yaml; d=yaml.safe_load(open('systems.yaml')); assert 'image-engine' in d, 'image-engine not in systems.yaml'; assert d['image-engine']['status']=='active'"` — Registry check
- `python3 -c "import yaml; d=yaml.safe_load(open('knowledge/graph.yaml')); assert 'image-engine' in d['systems'], 'image-engine not in graph.yaml'"` — Graph check
- `grep -q 'ImageEngine' systems/scene-board/knowledge/dependencies.md` — SceneBoard dependency updated
- `grep -q 'Generated Image' systems/scene-board/templates/storyboard-template.md` — Template updated
- `grep -q 'wisgate' systems/image-engine/src/wisgate.ts 2>/dev/null || grep -q 'api.wisgate.ai' systems/image-engine/src/wisgate.ts` — WisGate client exists
- `test -f systems/scene-board/src/image-client.ts && test -f systems/scene-board/src/batch-generator.ts && test -f systems/scene-board/src/storyboard-assembler.ts` — SceneBoard integration files exist
- `! grep -rq '@fal-ai/serverless-client\|@google/generative-ai' systems/image-engine/package.json` — No AI SDK dependencies in ImageEngine

## Notes

- **WisGate API, not fal.ai**: ImageEngine uses WisGate (JuheAPI) at `api.wisgate.ai` as the image generation provider. This is a Gemini-compatible REST API — no SDK needed, just `fetch`. The auth is `x-goog-api-key` header with the `WISDOM_GATE_KEY` env var.
- **No cross-system imports**: ImageEngine is its own standalone system. SceneBoard communicates with it via HTTP only.
- **Pinboard is untouched**: This plan does not modify Pinboard. Pinboard retains its own fal.ai + Google AI providers. In the future, Pinboard could be refactored to use ImageEngine as its backend, but that's out of scope.
- **Token-based cost tracking**: Unlike dollar-based pricing, WisGate costs are tracked in tokens via `usageMetadata.totalTokenCount` from each response. Gemini 2.5 Flash Image uses ~1,290 tokens per image. The budget ceiling is set in tokens, not cents.
- **Only runtime dependency is `hono`**: The WisGate API is called via native `fetch` — no `@fal-ai/serverless-client`, no `@google/generative-ai`. This keeps ImageEngine lightweight and decoupled from any SDK versioning.
- **14 reference images (up from 3)**: WisGate's Gemini endpoint supports up to 14 reference images per request (6 objects + 5 humans). This is a significant upgrade from the fal.ai NanoBanana Pro limit of 3. SceneBoard's domain knowledge must be updated to reflect this.
- **Multi-turn editing**: WisGate supports conversation context for iterative refinement. ImageEngine exposes this capability, and SceneBoard can use it for scene-by-scene refinement loops.
- **Environment variables**: `WISDOM_GATE_KEY` (WisGate API key), `IMAGE_ENGINE_PORT` (default 3002), `IMAGE_ENGINE_TOKEN_CEILING` (default 100000 tokens), `IMAGE_ENGINE_RATE_LIMIT` (default 10/min), `IMAGE_ENGINE_URL` (for SceneBoard client, default `http://localhost:3002`)
- **SceneBoard has no WisGate dependency**: SceneBoard talks to ImageEngine over HTTP. It never calls WisGate directly. This keeps the API abstraction clean — if the provider changes again, only ImageEngine changes.
- **Build Mode (`/adcelerate-build`) creates the system scaffold and knowledge files.** The actual implementation code is built in subsequent tasks by the builder agents.
- **Diagnose Mode (`/adcelerate-diagnose`) identifies the integration gap** and produces a diagnosis report. The actual fix implementation is done by the builder agent following the diagnosis.
