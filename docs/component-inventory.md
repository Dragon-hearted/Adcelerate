# Adcelerate — Component Inventory

**Generated:** 2026-03-23 | **Scan Level:** Quick

## autoCaption Components

### Remotion Compositions
| Component | Path | Type | Description |
|-----------|------|------|-------------|
| Root | `autoCaption/src/compositions/Root.tsx` | Layout | Remotion root composition registry |
| CaptionedVideo | `autoCaption/src/compositions/CaptionedVideo.tsx` | Display | Video + caption overlay composition |

### Caption Components
| Component | Path | Type | Description |
|-----------|------|------|-------------|
| CaptionOverlay | `autoCaption/src/captions/CaptionOverlay.tsx` | Display | TikTok-style caption page sequencer |
| CaptionPage | `autoCaption/src/captions/CaptionPage.tsx` | Display | Single caption page renderer |

### Core Modules
| Module | Path | Type | Description |
|--------|------|------|-------------|
| CLI | `autoCaption/src/cli.ts` | Entry Point | CLI argument parsing and orchestration |
| Transcribe | `autoCaption/src/transcribe.ts` | Service | Whisper.cpp transcription pipeline |
| Render | `autoCaption/src/render.ts` | Service | Remotion programmatic rendering |
| Config | `autoCaption/src/config.ts` | Schema | Caption style configuration (Zod) |

## Pinboard Components

### Server Modules
| Module | Path | Type | Description |
|--------|------|------|-------------|
| API Server | `pinboard/server/src/index.ts` | Entry Point | Hono REST API server |

### Client (React)
_(Detailed component inventory requires deep scan of `pinboard/client/src/`)_

Quick scan indicators: React 19 + Vite + Tailwind CSS frontend with dark theme.

## Observability Components

### Server Modules
| Module | Path | Type | Description |
|--------|------|------|-------------|
| Server | `apps/server/src/index.ts` | Entry Point | HTTP + WebSocket event server |
| Database | `apps/server/src/db.ts` | Data Layer | SQLite event storage and queries |
| Types | `apps/server/src/types.ts` | Schema | Event type definitions |
| Theme | `apps/server/src/theme.ts` | Config | Dashboard theme configuration |

### Client (Vue 3)
| Module | Path | Type | Description |
|--------|------|------|-------------|
| App | `apps/client/src/App.vue` | Entry Point | Main dashboard application |
| Main | `apps/client/src/main.ts` | Bootstrap | Vue app initialization |
| Config | `apps/client/src/config.ts` | Config | Client configuration |
| Types | `apps/client/src/types.ts` | Schema | Client-side type definitions |
| Components | `apps/client/src/components/` | UI | Dashboard UI components |
| Composables | `apps/client/src/composables/` | Logic | Vue composables for data fetching |
| Utilities | `apps/client/src/utils/` | Utility | Client helper functions |
| Styles | `apps/client/src/styles/` | Styling | CSS style modules |

## Platform Components

### Hook System (`.claude/hooks/`)
| Hook | Trigger | Description |
|------|---------|-------------|
| `session_start.py` | Session init | Initializes agent session, sends start event |
| `session_end.py` | Session close | Cleanup and sends end event |
| `send_event.py` | Various | Generic event dispatch to observability server |
| `pre_tool_use.py` | Before tool | Tool invocation interception and logging |
| `post_tool_use.py` | After tool | Tool completion handling |
| `post_tool_use_failure.py` | Tool failure | Error handling for failed tool calls |
| `pre_compact.py` | Before compact | Context window compaction handling |
| `setup_init.py` | /init | Codebase initialization workflow |
| `setup_maintenance.py` | /maintenance | Codebase maintenance workflow |
| `library_sync.py` | Library update | Skill library catalog synchronization |
| `notification.py` | Various | Notification dispatch to user |
| `permission_request.py` | Permission | Permission request handling |

### Skill Library (`.agents/skills/`)
34 marketing/growth skills covering: A/B testing, ad creative, AI SEO, analytics, churn prevention, cold email, competitor analysis, content strategy, copywriting, email sequences, CRO (forms, pages, popups, paywalls, onboarding), growth strategy, marketing psychology, paid ads, pricing, programmatic SEO, referral programs, revenue ops, sales enablement, schema markup, social media, UGC, video ads, and Remotion development.

### BMAD Skills (`.claude/skills/bmad-*`)
100+ methodology skills for project management, development workflows, QA testing, design systems, architecture, documentation, brainstorming, research, retrospectives, sprint management, and more.
