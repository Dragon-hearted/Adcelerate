# Adcelerate — Development Guide

**Generated:** 2026-03-23 | **Scan Level:** Quick

## Prerequisites

- **Bun** v1.0+ (primary runtime for all TypeScript/JavaScript)
- **just** (command runner — install via `brew install just` or `cargo install just`)
- **Git** with submodule support
- **FFmpeg** (required by AutoEditor for audio extraction)
- **Node.js** (may be needed for some Remotion operations)

## Initial Setup

```bash
# Clone with submodules
git clone --recurse-submodules https://github.com/Dragon-hearted/Adcelerate.git
cd Adcelerate

# Or if already cloned, initialize submodules
just sub-init

# Install Claude Command Center dependencies
just cc-install

# Install AutoEditor dependencies
cd systems/auto-editor && bun install && cd ../..

# Install pinboard dependencies
cd pinboard/server && bun install && cd ../client && bun install && cd ../..
```

## Environment Configuration

### Root `.env`
```
ANTHROPIC_API_KEY=<your-key>
ENGINEER_NAME=<your-name>
```

### Pinboard `.env`
```
FAL_KEY=<your-fal-ai-key>
```

Copy from `.env.example` in `pinboard/` directory.

## Running Applications

### Claude Command Center
```bash
just cc-install        # first run only: install web + orchestrator deps
just cc-dev            # orchestrator (:4100) + web (:3000), Ctrl-C stops both
# Dashboard: http://localhost:3000
# Orchestrator: http://localhost:4100
```

### AutoEditor
```bash
# Run CLI
cd systems/auto-editor
bun run src/cli.ts video.mp4

# Open Remotion Studio
bun run studio

# Or via justfile from root
just sub auto-editor dev
```

### Pinboard
```bash
# Start both server and client
cd pinboard
bun run dev

# Or individually
bun run dev:server    # Server on port 3001
bun run dev:client    # Client on port 5173

# Or via justfile from root
just sub pinboard dev
```

## Testing

### AutoEditor
```bash
cd systems/auto-editor
bun run test           # Run tests (Vitest)
bun run test:watch     # Watch mode
bun run typecheck      # TypeScript type check
bun run lint           # Biome linting
bun run format         # Biome formatting
```

### Other Parts
No test framework detected in quick scan for pinboard. The Command Center runs `bun test` in its orchestrator.

## Build Commands

### Pinboard Client
```bash
cd pinboard/client
bun run build          # TypeScript compile + Vite build
bun run preview        # Preview production build
```

### Command Center Web
```bash
cd apps/command-center
just build             # Next.js production build
```

### AutoEditor
```bash
cd systems/auto-editor
bun run render         # Render a video via CLI
```

## Claude Code Sessions

The justfile provides several modes for launching Claude Code:

```bash
just cldi              # Deterministic init (--init mode)
just cldm              # Deterministic maintenance
just cldii             # Agentic init with /install
just cldit             # Agentic init interactive
just cldmm             # Agentic maintenance with /maintenance
just discord           # Discord channel session
```

## Cleanup

```bash
just reset             # Remove logs, hook logs, result files
just reset-all         # Full reset including the Command Center database
```

## Submodule Management

```bash
just sub-init          # Initialize all submodules
just sub-update        # Update submodules to latest remote
just sub <project> <recipe>  # Run a justfile recipe in a submodule
# Example: just sub pinboard dev
```
