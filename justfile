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

# ─── Submodules ─────────────────────────────────────────

# Initialize all submodules
sub-init:
  git submodule update --init --recursive

# Update all submodules to latest remote
sub-update:
  git submodule update --remote --merge

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
