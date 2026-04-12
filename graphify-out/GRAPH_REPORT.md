# Graph Report - .  (2026-04-11)

## Corpus Check
- 127 files · ~79,561 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 378 nodes · 509 edges · 36 communities detected
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.79)
- Token cost: 0 input · 0 output

## God Nodes (most connected - your core abstractions)
1. `ChartRenderer` - 17 edges
2. `BrowserLogin` - 12 edges
3. `Pinboard System` - 12 edges
4. `InstagramApiClient` - 10 edges
5. `Binocular Court Showcase Storyboard v1` - 10 edges
6. `SceneBoard Domain Knowledge` - 10 edges
7. `MediaDownloader` - 9 edges
8. `Adcelerate Monorepo` - 8 edges
9. `autoCaption System` - 8 edges
10. `ApifyInstagramScraper` - 7 edges

## Surprising Connections (you probably didn't know these)
- `Pinboard React Client` --semantically_similar_to--> `Observability Client (Vue 3)`  [INFERRED] [semantically similar]
  specs/pinboard-image-generation-app.md → docs/architecture.md
- `Hono API Server` --semantically_similar_to--> `Observability Server (Bun HTTP+WS)`  [INFERRED] [semantically similar]
  specs/pinboard-image-generation-app.md → docs/architecture.md
- `Pinboard SQLite Database` --semantically_similar_to--> `Observability SQLite (events.db)`  [INFERRED] [semantically similar]
  specs/pinboard-image-generation-app.md → docs/architecture.md
- `Pipeline Architecture Pattern (autoCaption)` --conceptually_related_to--> `autoCaption System`  [EXTRACTED]
  docs/architecture.md → specs/autocaption-terminal-app.md
- `Adcelerate Monorepo` --references--> `autoCaption System`  [EXTRACTED]
  CLAUDE.md → specs/autocaption-terminal-app.md

## Hyperedges (group relationships)
- **Adcelerate Four Core Systems** — autocaption_system, pinboard_system, sceneboard_system, instagram_scrapper_system [EXTRACTED 1.00]
- **v1 Build-Execute-Diagnose Skill Triad** — v1_adcelerate_build_skill, v1_adcelerate_execute_skill, v1_adcelerate_diagnose_skill, v1_scaffolder_agent, v1_validator_agent, v1_formalizer_agent [EXTRACTED 1.00]
- **Shared Technology Stack Across Systems** — shared_tech_bun, shared_tech_typescript, shared_tech_tailwind, shared_tech_sqlite, shared_tech_vite [EXTRACTED 1.00]
- **SceneBoard Visual Generation Pipeline** — nanobanana_pro, kling_video, remotion_rendering, style_anchor_system, storyboard_template [EXTRACTED 0.90]
- **Binocular Court Showcase Version Chain** — binocular_court_showcase_v1, binocular_court_showcase_v2, binocular_court_showcase_v3, binocular_court_showcase_v4, binocular_court_showcase_v1_pdf [EXTRACTED 0.95]
- **Instagram Scrapper Authentication and Data Flow** — playwright_login, session_management, instagram_private_api, apify_fallback [EXTRACTED 0.90]

## Communities

### Community 0 - "Pinboard Web App"
Cohesion: 0.05
Nodes (4): FalProvider, buildCookieString(), buildHeaders(), SessionManager

### Community 1 - "Architecture & Documentation"
Cohesion: 0.05
Nodes (41): Client-Server REST Pattern (Pinboard), Monorepo with Submodule Isolation Pattern, Pipeline Architecture Pattern (autoCaption), Real-time Event Dashboard Pattern (Observability), Architecture Document, Component Inventory Document, Development Guide, Documentation Index (+33 more)

### Community 2 - "Pinboard Database Layer"
Cohesion: 0.06
Nodes (4): GoogleAIProvider, isAllowedWebSocketUrl(), sendResponseToAgent(), ProviderRegistry

### Community 3 - "Adcelerate Platform Core"
Cohesion: 0.07
Nodes (33): Adcelerate v1 Platform Upgrade Spec, Adcelerate Monorepo, Graphify Knowledge Graph Tool, knowledge/graph.yaml, library.yaml Catalog, systems.yaml Registry, Instagram Scrapper System, Library Catalog Skill Integration (+25 more)

### Community 4 - "Instagram Apify Scraper"
Cohesion: 0.09
Nodes (10): ApifyInstagramScraper, formatPostSummary(), formatSummary(), main(), parseArgs(), ensureModel(), ensureWhisperCpp(), extractAudio() (+2 more)

### Community 5 - "SceneBoard Storyboards"
Cohesion: 0.11
Nodes (29): Binocular Court Showcase Storyboard v1, Binocular Court Showcase Storyboard v1 PDF, Binocular Court Showcase Storyboard v2, Binocular Court Showcase Storyboard v3, Binocular Court Showcase Storyboard v4, Binocular POV Narrative Device, Client Knowledge Management System, Dynamic Approval Workflow (+21 more)

### Community 6 - "Remotion Video Scenes"
Cohesion: 0.14
Nodes (7): createTheme(), generateId(), importTheme(), isValidColor(), sanitizeTheme(), updateThemeById(), validateTheme()

### Community 7 - "Chart Renderer"
Cohesion: 0.16
Nodes (1): ChartRenderer

### Community 8 - "AutoCaption System"
Cohesion: 0.12
Nodes (19): Biome Linter, CaptionOverlay Component, CaptionPage Component, Remotion Caption Type, CaptionedVideo Composition, autoCaption CLI Entry Point, FFmpeg Audio Extraction, Remotion Video Rendering (+11 more)

### Community 9 - "Caption Components"
Cohesion: 0.2
Nodes (0): 

### Community 10 - "Browser Login Flow"
Cohesion: 0.35
Nodes (1): BrowserLogin

### Community 11 - "Instagram API Client"
Cohesion: 0.27
Nodes (3): delay(), InstagramApiClient, shortcodeToMediaId()

### Community 12 - "Instagram Scrapper Knowledge"
Cohesion: 0.27
Nodes (10): Apify Fallback Scraping, Instagram Private API Scraping, Instagram Scrapper Acceptance Criteria, Instagram Scrapper Dependencies, Instagram Scrapper Domain Knowledge, Instagram Scrapper History, Instagram Scrapper Index, Playwright Browser Login Automation (+2 more)

### Community 13 - "Media Downloader"
Cohesion: 0.44
Nodes (1): MediaDownloader

### Community 14 - "Instagram Core Scraper"
Cohesion: 0.48
Nodes (1): InstagramScraper

### Community 15 - "Formatters"
Cohesion: 0.67
Nodes (0): 

### Community 16 - "Action Bar UI"
Cohesion: 1.0
Nodes (0): 

### Community 17 - "Event Colors Hook"
Cohesion: 1.0
Nodes (0): 

### Community 18 - "Media Query Hook"
Cohesion: 1.0
Nodes (0): 

### Community 19 - "Event Emojis Hook"
Cohesion: 1.0
Nodes (0): 

### Community 20 - "Pinboard Specs"
Cohesion: 1.0
Nodes (2): Pinboard Image Generation App Spec, Pinboard Overhaul Spec

### Community 21 - "Bun Server"
Cohesion: 1.0
Nodes (2): Bun JavaScript Runtime, Server README

### Community 22 - "Base Config"
Cohesion: 1.0
Nodes (0): 

### Community 23 - "Tailwind Config"
Cohesion: 1.0
Nodes (0): 

### Community 24 - "Vite Config"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "PostCSS Config"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "Vite Env Types"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "AutoCaption Spec"
Cohesion: 1.0
Nodes (1): autoCaption Terminal App Spec

### Community 28 - "V1 Feature Branch"
Cohesion: 1.0
Nodes (1): feature/adcelerate-v1 Branch

### Community 29 - "BMAD Platform"
Cohesion: 1.0
Nodes (1): BMAD Methodology Skills

### Community 30 - "Bun Runtime"
Cohesion: 1.0
Nodes (1): Bun Runtime (Shared Technology)

### Community 31 - "TypeScript"
Cohesion: 1.0
Nodes (1): TypeScript (Shared Technology)

### Community 32 - "Tailwind CSS"
Cohesion: 1.0
Nodes (1): Tailwind CSS (Shared Technology)

### Community 33 - "SQLite"
Cohesion: 1.0
Nodes (1): SQLite (Shared Technology)

### Community 34 - "Vite Build"
Cohesion: 1.0
Nodes (1): Vite (Shared Technology)

### Community 35 - "Vindof Brand"
Cohesion: 1.0
Nodes (1): Quiet Maximalism Philosophy

## Knowledge Gaps
- **56 isolated node(s):** `Graphify Knowledge Graph Tool`, `autoCaption Terminal App Spec`, `Remotion Caption Type`, `TikTok-Style Captions`, `Remotion Best Practices Skill` (+51 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Action Bar UI`** (2 nodes): `ActionBar.tsx`, `ActionBar()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Event Colors Hook`** (2 nodes): `useEventColors.ts`, `useEventColors()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Media Query Hook`** (2 nodes): `useMediaQuery.ts`, `useMediaQuery()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Event Emojis Hook`** (2 nodes): `useEventEmojis.ts`, `useEventEmojis()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Pinboard Specs`** (2 nodes): `Pinboard Image Generation App Spec`, `Pinboard Overhaul Spec`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Bun Server`** (2 nodes): `Bun JavaScript Runtime`, `Server README`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Base Config`** (1 nodes): `base.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Tailwind Config`** (1 nodes): `tailwind.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Vite Config`** (1 nodes): `vite.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `PostCSS Config`** (1 nodes): `postcss.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Vite Env Types`** (1 nodes): `vite-env.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `AutoCaption Spec`** (1 nodes): `autoCaption Terminal App Spec`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `V1 Feature Branch`** (1 nodes): `feature/adcelerate-v1 Branch`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `BMAD Platform`** (1 nodes): `BMAD Methodology Skills`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Bun Runtime`** (1 nodes): `Bun Runtime (Shared Technology)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `TypeScript`** (1 nodes): `TypeScript (Shared Technology)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Tailwind CSS`** (1 nodes): `Tailwind CSS (Shared Technology)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `SQLite`** (1 nodes): `SQLite (Shared Technology)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Vite Build`** (1 nodes): `Vite (Shared Technology)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Vindof Brand`** (1 nodes): `Quiet Maximalism Philosophy`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Adcelerate Monorepo` connect `Adcelerate Platform Core` to `AutoCaption System`, `Architecture & Documentation`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **Why does `SceneBoard System` connect `Adcelerate Platform Core` to `Instagram Scrapper Knowledge`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `Pinboard System` connect `Architecture & Documentation` to `AutoCaption System`, `Adcelerate Platform Core`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `Binocular Court Showcase Storyboard v1` (e.g. with `Binocular Court Showcase Storyboard v2` and `Vindof Visual Direction & Art Direction`) actually correct?**
  _`Binocular Court Showcase Storyboard v1` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Graphify Knowledge Graph Tool`, `autoCaption Terminal App Spec`, `Remotion Caption Type` to the rest of the system?**
  _56 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Pinboard Web App` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Architecture & Documentation` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._