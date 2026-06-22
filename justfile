# Adcelerate
set dotenv-load := true
set positional-arguments := true

# List all recipes
default:
  @just --list

# ─── Claude Command Center (apps/command-center) ──────────
# Next.js 15 + Fastify + Drizzle + Socket.IO dashboard that replaces the
# observability stack above. Localhost-first: orchestrator :4100, web :3000.

# Install Command Center workspace deps (web + orchestrator + shared)
cc-install:
  cd apps/command-center && just install

# Apply migrations + import the legacy events.db (idempotent).
# Optional legacy path: `just cc-migrate /abs/path/to/events.db`
cc-migrate *args:
  cd apps/command-center && just migrate-import "$@"

# Bring up orchestrator (:4100) + web (:3000) concurrently (Ctrl-C stops both)
cc-dev:
  cd apps/command-center && just dev

# Production build (Next.js web)
cc-build:
  cd apps/command-center && just build

# Run the production build (orchestrator + next start) concurrently
cc-start:
  #!/usr/bin/env sh
  set -eu
  cd apps/command-center
  bun run --filter @command-center/orchestrator start &
  orch=$!
  bun run --filter web start &
  web=$!
  trap 'kill "$orch" "$web" 2>/dev/null || true' INT TERM EXIT
  wait "$orch" "$web"

# Typecheck + test the Command Center
cc-check:
  cd apps/command-center && just typecheck
  cd apps/command-center/orchestrator && bun test

# ─── Submodules ─────────────────────────────────────────

# Initialize all submodules
sub-init:
  git submodule update --init --recursive

# Update all submodules to latest remote
sub-update:
  git submodule update --remote --merge

# Gated lazy-init of a single system submodule (ADR-0021 pre-flight). No-op if
# already populated; else `git submodule update --init systems/<name>`.
# e.g. `just sub-ensure image-engine`
sub-ensure *args:
  #!/usr/bin/env sh
  set -eu
  name="$1"
  if [ -z "$name" ]; then echo "usage: just sub-ensure <name>" >&2; exit 2; fi
  if [ -n "$(ls -A "systems/$name" 2>/dev/null)" ]; then
    echo "✓ systems/$name already populated"
  else
    git submodule update --init "systems/$name"
  fi

# Run a just recipe in a submodule (e.g., just sub pinboard start)
sub project +recipe:
  cd {{project}} && just {{recipe}}

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

# Start Discord channel session
discord:
  claude --model opus --dangerously-skip-permissions --channels plugin:discord@claude-plugins-official

# ─── Adcelerate v1 — System Management ────────────────────

# List all registered systems and their status
systems-list:
  @echo "Adcelerate Registered Systems"
  @echo "=============================="
  @python3 -c "import yaml; data=yaml.safe_load(open('systems.yaml')); [print(f'  {k}: {v[\"name\"]} [{v[\"status\"]}]') for k,v in data.items() if isinstance(v, dict) and 'name' in v]"

# Validate registry entries match filesystem
systems-validate:
  @echo "Validating systems registry..."
  @python3 -c "\
  import yaml, os, sys; \
  data=yaml.safe_load(open('systems.yaml')); \
  errors=[]; \
  [errors.append(f'  FAIL: {k} path \"{v[\"path\"]}\" not found') for k,v in data.items() if isinstance(v, dict) and 'path' in v and not os.path.isdir(v['path'])]; \
  [errors.append(f'  FAIL: {k} knowledge \"{v[\"knowledge_path\"]}\" not found') for k,v in data.items() if isinstance(v, dict) and 'knowledge_path' in v and not os.path.isdir(v['knowledge_path'])]; \
  print('\n'.join(errors) if errors else '  All systems valid') or (sys.exit(1) if errors else None)"

# Quick health check across all registered systems
systems-health:
  @echo "System Health Check"
  @echo "==================="
  @python3 -c "\
  import yaml, os; \
  data=yaml.safe_load(open('systems.yaml')); \
  [print(f'  {v[\"name\"]}: {v[\"status\"]} | knowledge: {\"OK\" if os.path.isdir(v.get(\"knowledge_path\",\"\")) else \"MISSING\"} | justfile: {\"OK\" if os.path.isfile(os.path.join(v.get(\"path\",\"\"),\"justfile\")) else \"N/A\"}') for k,v in data.items() if isinstance(v, dict) and 'name' in v]"

# ─── Adcelerate v1 — Mode Launchers ──────────────────────

# Launch Build Mode for a new system
build-new:
  @echo "Launching Adcelerate Build Mode..."
  @echo "Use: /adcelerate-build in your Claude Code session"

# Launch Build Mode for migrating an existing system
build-migrate name:
  @echo "Launching Adcelerate Build Mode for migration of {{name}}..."
  @echo "Use: /adcelerate-build migrate {{name}} in your Claude Code session"

# Launch Execute Mode with a task
run task:
  @echo "Launching Adcelerate Execute Mode..."
  @echo "Use: /adcelerate-execute {{task}} in your Claude Code session"

# Launch Diagnosis Mode for a system
diagnose name:
  @echo "Launching Adcelerate Diagnose Mode for {{name}}..."
  @echo "Use: /adcelerate-diagnose {{name}} in your Claude Code session"

# ─── Agent Sandboxes ──────────────────────────────────────

# Build the disposable agent-sandbox image (with_media=1 adds ffmpeg etc.)
sandbox-build with_media="0":
  docker build {{ if with_media == "1" { "--build-arg WITH_MEDIA=1" } else { "" } }} -t adcelerate-sandbox:latest sandbox

# Run a task in disposable, network-locked containers → one PR per sandbox.
# Flags pass straight through to the orchestrator (just lacks named args):
#   just sandbox-run "add a comment to README" --target pinboard --parallel 3
#   just sandbox-run "noop" --dry-run
sandbox-run *args:
  @bun run sandbox/orchestrator.ts "$@"

# Verify firewall allow/deny + every threat-model row (non-zero exit on a leak)
sandbox-doctor:
  bun run sandbox/orchestrator.ts --doctor

# Remove any leftover sandbox containers, volumes, and run dirs
sandbox-clean:
  bun run sandbox/orchestrator.ts --clean

# ─── Cleanup ──────────────────────────────────────────────

# Reset artifacts (logs, results)
reset:
  rm -rf .claude/hooks/*.log
  rm -rf app_docs/install_results.md
  rm -rf app_docs/maintenance_results.md
  rm -rf logs/

# Reset everything including the Command Center database
reset-all: reset
  rm -f apps/command-center/orchestrator/command-center.db apps/command-center/orchestrator/command-center.db-wal apps/command-center/orchestrator/command-center.db-shm
  @echo "Full reset complete"
