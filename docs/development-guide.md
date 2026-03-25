# Adcelerate — Development Guide

**Generated:** 2026-03-23 | **Scan Level:** Quick

## Prerequisites

- **Bun** v1.0+ (primary runtime for all TypeScript/JavaScript)
- **just** (command runner — install via `brew install just` or `cargo install just`)
- **Git** with submodule support
- **FFmpeg** (required by autoCaption for audio extraction)
- **Node.js** (may be needed for some Remotion operations)

## Initial Setup

```bash
# Clone with submodules
git clone --recurse-submodules https://github.com/Dragon-hearted/Adcelerate.git
cd Adcelerate

# Or if already cloned, initialize submodules
just sub-init

# Install observability dependencies
just obs-install

# Install autoCaption dependencies
cd autoCaption && bun install && cd ..

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

### Observability Dashboard
```bash
just obs-start         # Start server + client
just obs-bg            # Start in background
just obs-stop          # Stop all
# Dashboard: http://localhost:5173
# Server:    http://localhost:4000
```

### autoCaption
```bash
# Run CLI
cd autoCaption
bun run src/cli.ts video.mp4

# Open Remotion Studio
bun run studio

# Or via justfile from root
just sub autoCaption dev
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

### autoCaption
```bash
cd autoCaption
bun run test           # Run tests (Vitest)
bun run test:watch     # Watch mode
bun run typecheck      # TypeScript type check
bun run lint           # Biome linting
bun run format         # Biome formatting
```

### Other Parts
No test frameworks detected in quick scan for pinboard or observability parts.

## Build Commands

### Pinboard Client
```bash
cd pinboard/client
bun run build          # TypeScript compile + Vite build
bun run preview        # Preview production build
```

### Observability Client
```bash
cd apps/client
bun run build          # vue-tsc + Vite build
bun run preview        # Preview production build
```

### autoCaption
```bash
cd autoCaption
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
just reset-all         # Full reset including observability databases
```

## Submodule Management

```bash
just sub-init          # Initialize all submodules
just sub-update        # Update submodules to latest remote
just sub <project> <recipe>  # Run a justfile recipe in a submodule
# Example: just sub pinboard dev
```
