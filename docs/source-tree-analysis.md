# Adcelerate — Source Tree Analysis

**Generated:** 2026-03-23 | **Scan Level:** Quick

## Annotated Directory Tree

```
Adcelerate/                          # Monorepo root
├── .agents/                         # Agent skill library
│   └── skills/                      # 34+ marketing/growth skills
│       ├── ab-test-setup/           # A/B test planning skill
│       ├── ad-creative/             # Ad copy generation skill
│       ├── ai-seo/                  # AI search optimization
│       ├── analytics-tracking/      # Analytics setup skill
│       ├── churn-prevention/        # Churn reduction strategies
│       ├── cold-email/              # B2B outreach emails
│       ├── competitor-alternatives/  # Competitive analysis
│       ├── content-strategy/        # Content planning
│       ├── copy-editing/            # Copy review
│       ├── copywriting/             # Sales copy generation
│       ├── email-sequence/          # Email automation
│       ├── find-skills/             # Skill discovery
│       ├── form-cro/               # Form optimization
│       ├── free-tool-strategy/     # Lead gen tool design
│       ├── launch-strategy/        # Product launch planning
│       ├── marketing-ideas/        # Growth ideation
│       ├── marketing-psychology/   # Behavioral triggers
│       ├── onboarding-cro/         # Onboarding optimization
│       ├── page-cro/               # Landing page optimization
│       ├── paid-ads/               # Paid advertising
│       ├── paywall-upgrade-cro/    # Upgrade flow optimization
│       ├── popup-cro/              # Popup optimization
│       ├── pricing-strategy/       # Pricing design
│       ├── product-marketing-context/ # Product positioning
│       ├── programmatic-seo/       # Programmatic SEO
│       ├── referral-program/       # Referral system design
│       ├── remotion-best-practices/ # Remotion video dev guide
│       ├── revops/                 # Revenue operations
│       ├── sales-enablement/       # Sales material creation
│       ├── schema-markup/          # Schema.org markup
│       ├── seo-audit/              # SEO audit
│       ├── social-media-content/   # Social media creation
│       ├── ugc-strategy/           # User-generated content
│       └── video-ad/              # Video ad production
├── .claude/                         # Claude Code configuration
│   ├── hooks/                       # Python hook scripts (12 hooks)
│   │   ├── session_start.py         # Session initialization
│   │   ├── session_end.py           # Session cleanup
│   │   ├── send_event.py            # Observability event dispatch
│   │   ├── pre_tool_use.py          # Tool use interception
│   │   ├── post_tool_use.py         # Post-tool-use handling
│   │   ├── post_tool_use_failure.py # Tool failure handling
│   │   ├── pre_compact.py           # Context compaction
│   │   ├── setup_init.py            # Codebase init hook
│   │   ├── setup_maintenance.py     # Codebase maintenance hook
│   │   ├── library_sync.py          # Library catalog sync
│   │   ├── notification.py          # Notification dispatch
│   │   └── permission_request.py    # Permission handling
│   ├── commands/                    # Claude Code slash commands
│   │   └── install.md               # /install command
│   └── skills/                      # BMAD methodology skills (100+)
│       ├── bmad-document-project/   # Project documentation skill
│       ├── bmad-generate-project-context/ # Context generation
│       ├── bmad-dev/                # Development workflow
│       ├── bmad-architect/          # Architecture design
│       ├── bmad-analyst/            # Business analysis
│       ├── bmad-pm/                 # Project management
│       ├── bmad-qa/                 # Quality assurance
│       ├── bmad-create-prd/         # PRD creation
│       └── ... (90+ more BMAD skills)
├── apps/                            # Observability dashboard ★
│   ├── server/                      # Bun HTTP + WebSocket server
│   │   └── src/
│   │       ├── index.ts             # ★ Entry point — HTTP/WS server
│   │       ├── db.ts                # SQLite event storage
│   │       ├── types.ts             # Event type definitions
│   │       └── theme.ts             # Theme configuration
│   └── client/                      # Vue 3 dashboard
│       └── src/
│           ├── App.vue              # ★ Entry point — Dashboard app
│           ├── main.ts              # Vue app bootstrap
│           ├── config.ts            # Client configuration
│           ├── types.ts             # Client type definitions
│           ├── components/          # Vue dashboard components
│           ├── composables/         # Vue composables
│           ├── styles/              # CSS styles
│           ├── types/               # Additional type defs
│           └── utils/               # Client utilities
├── autoCaption/                     # ★ Git submodule — Video captioning
│   ├── src/
│   │   ├── cli.ts                   # ★ Entry point — CLI
│   │   ├── transcribe.ts            # Whisper.cpp transcription
│   │   ├── render.ts                # Remotion renderer
│   │   ├── config.ts                # Caption config schema
│   │   ├── compositions/
│   │   │   ├── Root.tsx             # Remotion root
│   │   │   └── CaptionedVideo.tsx   # Video + caption overlay
│   │   └── captions/
│   │       ├── CaptionOverlay.tsx   # Caption page sequencer
│   │       └── CaptionPage.tsx      # Single caption renderer
│   ├── tests/                       # Vitest test suite
│   ├── whisper.cpp/                 # Whisper.cpp dependency
│   ├── package.json
│   └── justfile
├── pinboard/                        # ★ Git submodule — AI image gen app
│   ├── server/
│   │   └── src/
│   │       └── index.ts             # ★ Entry point — Hono API
│   ├── client/
│   │   └── src/                     # React + Vite frontend
│   ├── demo/                        # Demo assets
│   ├── package.json
│   └── justfile
├── scripts/                         # System management scripts
│   ├── start-system.sh              # Start observability system
│   └── reset-system.sh              # Reset observability system
├── ai_docs/                         # AI tool documentation
├── design-artifacts/                # Design artifacts
├── specs/                           # Specifications
├── _bmad/                           # BMAD configuration
│   └── bmm/
│       └── config.yaml              # BMAD module config
├── _bmad-output/                    # BMAD output artifacts
├── docs/                            # ★ Project documentation (this output)
├── library.yaml                     # ★ Skill library catalog (34+ skills)
├── justfile                         # ★ Top-level task runner
├── .gitmodules                      # Submodule declarations
├── .gitignore                       # Comprehensive ignore rules
└── .env                             # API keys and engineer config
```

## Critical Folders

| Folder | Purpose | Part |
|--------|---------|------|
| `.agents/skills/` | Marketing/growth AI skill library (34 skills) | Platform |
| `.claude/hooks/` | Python hooks for Claude Code session lifecycle | Platform |
| `.claude/skills/` | BMAD methodology skills (100+) | Platform |
| `apps/server/src/` | Observability event ingestion server | Observability |
| `apps/client/src/` | Observability dashboard frontend | Observability |
| `autoCaption/src/` | Video captioning pipeline source | autoCaption |
| `pinboard/server/src/` | AI image gen API server | Pinboard |
| `pinboard/client/src/` | AI image gen frontend | Pinboard |
| `scripts/` | System management shell scripts | Platform |

## Entry Points

| Entry Point | Part | Description |
|-------------|------|-------------|
| `autoCaption/src/cli.ts` | autoCaption | CLI tool entry — bun run src/cli.ts |
| `pinboard/server/src/index.ts` | pinboard | Hono API server |
| `pinboard/client/src/main.tsx` | pinboard | React app bootstrap |
| `apps/server/src/index.ts` | observability | HTTP + WebSocket server |
| `apps/client/src/main.ts` | observability | Vue app bootstrap |
| `justfile` | platform | Top-level task orchestration |
