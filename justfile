# Adcelerate
set dotenv-load := true

# List all recipes
default:
  @just --list

# ─── Observability System ─────────────────────────────────

# Start observability dashboard (server + client)
obs-start:
  sh scripts/start-system.sh

# Stop observability dashboard
obs-stop:
  sh scripts/reset-system.sh

# Start observability in background
obs-bg:
  sh scripts/start-system.sh > /dev/null 2>&1 &
  @echo "Observability started in background"
  @echo "  Dashboard: http://localhost:5173"
  @echo "  Server:    http://localhost:4000"

# Install observability dependencies
obs-install:
  cd apps/server && bun install
  cd apps/client && bun install

# ─── Claude Code Sessions ─────────────────────────────────

# Deterministic codebase setup
cldi:
  claude --model opus --dangerously-skip-permissions --init

# Deterministic codebase maintenance
cldm:
  claude --model opus --dangerously-skip-permissions --maintenance

# Agentic codebase setup
cldii:
  claude --model opus --dangerously-skip-permissions --init "/install"

# Agentic codebase setup interactive
cldit:
  claude --model opus --dangerously-skip-permissions --init "/install true"

# Agentic codebase maintenance
cldmm:
  claude --model opus --dangerously-skip-permissions --maintenance "/maintenance"

# ─── Cleanup ──────────────────────────────────────────────

# Reset artifacts (logs, results)
reset:
  rm -rf .claude/hooks/*.log
  rm -rf app_docs/install_results.md
  rm -rf app_docs/maintenance_results.md
  rm -rf logs/

# Reset everything including database
reset-all: reset obs-stop
  rm -f apps/server/events.db apps/server/events.db-wal apps/server/events.db-shm
  @echo "Full reset complete"
