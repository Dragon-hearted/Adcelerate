#!/usr/bin/env bash
#
# task-runner.sh — in-container lifecycle for one sandbox run (ENTRYPOINT).
#
# Order:  firewall  →  scoped install  →  headless Claude agent  →  tests  →
#         branch + commit (incl. dirty submodules)  →  /work/result.json
#
# The agent COMMITS but never pushes (no GitHub credentials live in here). The
# host orchestrator reads /work/result.json, then pushes the branch and opens the
# PR. Runs as the unprivileged `node` user.
#
# Inputs (env, set by the orchestrator):
#   SANDBOX_ID, SANDBOX_SLUG, SANDBOX_TARGET, SANDBOX_MODEL,
#   SANDBOX_INSTALL_DIR, SANDBOX_BRANCH, SANDBOX_TASK, SANDBOX_ALLOWLIST,
#   CLAUDE_CODE_OAUTH_TOKEN   (subscription auth; ANTHROPIC_API_KEY is absent)

# Note: NOT `set -e` — we capture failures and still emit result.json.
set -uo pipefail

ID="${SANDBOX_ID:-unknown}"
SLUG="${SANDBOX_SLUG:-task}"
TARGET="${SANDBOX_TARGET:-adcelerate}"
MODEL="${SANDBOX_MODEL:-opus}"
INSTALL_DIR="${SANDBOX_INSTALL_DIR:-.}"
BRANCH="${SANDBOX_BRANCH:-sandbox/${ID}-${SLUG}}"
TASK="${SANDBOX_TASK:-${1:-}}"

REPO="/work/repo"
RESULT="/work/result.json"
AGENT_LOG="/work/agent-stream.jsonl"
AGENT_ERR="/work/agent-stderr.log"
TEST_LOG="/work/test.log"

log() { echo "[runner] $*"; }

# result.json status accumulators.
FIREWALL_OK=false
INSTALL_OK=false
AGENT_EXIT=1
TESTS_RAN=false
TESTS_PASSED=null     # JSON literal: null | true | false
HAS_CHANGES=false
COMMIT_SHA=""
CHANGED_FILES=""
declare -a CHANGED_SUBMODULES=()
ERROR=""

# shellcheck disable=SC2329  # invoked indirectly via `trap emit_result EXIT` below
emit_result() {
  # Scrub the OAuth token from any captured logs before they can leave the box.
  if [ -n "${CLAUDE_CODE_OAUTH_TOKEN:-}" ]; then
    for f in "$AGENT_LOG" "$AGENT_ERR" "$TEST_LOG"; do
      [ -f "$f" ] || continue
      # Literal (fixed-string) replacement — `sed` would treat the token as a
      # regex/replacement and could miss tokens containing #, &, \, / or newlines.
      python3 - "$CLAUDE_CODE_OAUTH_TOKEN" "$f" <<'PY' || true
import pathlib, sys
token = sys.argv[1]
path = pathlib.Path(sys.argv[2])
path.write_text(path.read_text().replace(token, "***REDACTED***"))
PY
    done
  fi

  local subs_json
  if [ "${#CHANGED_SUBMODULES[@]}" -gt 0 ]; then
    subs_json="$(printf '%s\n' "${CHANGED_SUBMODULES[@]}" | jq -R . | jq -s 'map(select(length>0))')"
  else
    subs_json="[]"
  fi

  jq -n \
    --arg id "$ID" \
    --arg slug "$SLUG" \
    --arg target "$TARGET" \
    --arg branch "$BRANCH" \
    --arg task "$TASK" \
    --arg commit "$COMMIT_SHA" \
    --arg changed_files "$CHANGED_FILES" \
    --arg error "$ERROR" \
    --argjson firewall_ok "$FIREWALL_OK" \
    --argjson install_ok "$INSTALL_OK" \
    --argjson agent_exit "${AGENT_EXIT:-1}" \
    --argjson tests_ran "$TESTS_RAN" \
    --argjson tests_passed "$TESTS_PASSED" \
    --argjson has_changes "$HAS_CHANGES" \
    --argjson changed_submodules "$subs_json" \
    '{
      id: $id, slug: $slug, target: $target, branch: $branch, task: $task,
      firewall_ok: $firewall_ok, install_ok: $install_ok,
      agent_exit: $agent_exit,
      tests: { ran: $tests_ran, passed: $tests_passed },
      has_changes: $has_changes, commit: $commit,
      changed_files: ($changed_files | split("\n") | map(select(length>0))),
      changed_submodules: $changed_submodules,
      error: $error
    }' > "$RESULT" 2>/dev/null \
    || printf '{"id":"%s","error":"failed to render result.json"}\n' "$ID" > "$RESULT"

  log "wrote $RESULT"
}

# Always emit a result, even on early exit.
trap emit_result EXIT

# ---------------------------------------------------------------------------
# 1. Lock the network down before anything else runs.
# ---------------------------------------------------------------------------
log "applying egress firewall"
if /usr/local/bin/init-firewall.sh; then
  FIREWALL_OK=true
else
  ERROR="firewall init failed"
  log "FATAL: $ERROR"
  exit 1
fi

if [ ! -d "$REPO" ]; then
  ERROR="repo not found at $REPO"
  log "FATAL: $ERROR"
  exit 1
fi

# ---------------------------------------------------------------------------
# 2. Scoped dependency install (only the touched system).
# ---------------------------------------------------------------------------
WORKDIR="$REPO/$INSTALL_DIR"
[ -d "$WORKDIR" ] || WORKDIR="$REPO"
log "scoped install in $WORKDIR"
cd "$WORKDIR" || { ERROR="cannot cd to $WORKDIR"; exit 1; }

INSTALL_OK=true
if [ -f package.json ]; then
  log "bun install --frozen-lockfile"
  bun install --frozen-lockfile || { log "bun install failed (continuing)"; INSTALL_OK=false; }
fi
if [ -f pyproject.toml ] || [ -f uv.lock ]; then
  log "uv sync --frozen"
  uv sync --frozen || { log "uv sync failed (continuing)"; INSTALL_OK=false; }
fi

# ---------------------------------------------------------------------------
# 3. Run the headless Claude Code agent on the subscription (NO API key).
# ---------------------------------------------------------------------------
# $HOME points at the /work bind mount (empty at runtime) so config writes work
# under an arbitrary host UID; create it before Claude touches ~/.claude.
mkdir -p "$HOME" || { ERROR="cannot create HOME ($HOME)"; exit 1; }
cd "$REPO" || { ERROR="cannot cd to $REPO"; exit 1; }
log "running agent (model=$MODEL): $TASK"
env -u ANTHROPIC_API_KEY claude -p "$TASK" \
  --dangerously-skip-permissions \
  --output-format stream-json --verbose \
  --model "$MODEL" 2>"$AGENT_ERR" | tee "$AGENT_LOG"
AGENT_EXIT="${PIPESTATUS[0]}"
log "agent exited with $AGENT_EXIT"

# ---------------------------------------------------------------------------
# 4. Run tests (best-effort detection): bun test, else a system `just test`.
# ---------------------------------------------------------------------------
cd "$WORKDIR" 2>/dev/null || cd "$REPO" || { ERROR="cannot cd for tests"; exit 1; }
if [ -f package.json ] && grep -q '"test"' package.json; then
  TESTS_RAN=true
  log "bun test"
  if bun test >"$TEST_LOG" 2>&1; then TESTS_PASSED=true; else TESTS_PASSED=false; fi
elif [ -f justfile ] && command -v just >/dev/null 2>&1 && just --list 2>/dev/null | grep -qE '^[[:space:]]*test'; then
  TESTS_RAN=true
  log "just test"
  if just test >"$TEST_LOG" 2>&1; then TESTS_PASSED=true; else TESTS_PASSED=false; fi
else
  log "no test target detected — skipping"
fi

# ---------------------------------------------------------------------------
# 5. Branch + commit. Dirty submodules get their own same-named branch first,
#    then the parent stages the bumped gitlink + remaining changes.
# ---------------------------------------------------------------------------
cd "$REPO" || exit 1
# Use --global (writes to $HOME/.gitconfig in the ephemeral container) so the
# identity also applies to commits made INSIDE submodules — a repo-local
# `git config` only covers the parent repo, so submodule commits would otherwise
# fail with "unable to auto-detect email address" and abort the whole run.
git config --global user.email "sandbox@adcelerate.local"
git config --global user.name  "Adcelerate Sandbox"
git config --global init.defaultBranch main

COMMIT_MSG="sandbox(${ID}): ${TASK}"

# Handle changed git submodules (only present for parent-target clones).
if [ -f .gitmodules ]; then
  while read -r sp; do
    [ -z "$sp" ] && continue
    [ -d "$REPO/$sp/.git" ] || [ -f "$REPO/$sp/.git" ] || continue
    if [ -n "$(git -C "$sp" status --porcelain 2>/dev/null)" ]; then
      log "submodule changed: $sp"
      git -C "$sp" checkout -B "$BRANCH" >/dev/null 2>&1
      git -C "$sp" add -A
      if ! git -C "$sp" commit -m "$COMMIT_MSG" >/dev/null 2>&1; then
        ERROR="failed to commit submodule changes in $sp"
        log "FATAL: $ERROR"
        exit 1
      fi
      CHANGED_SUBMODULES+=("$sp")
    fi
  done < <(git config --file .gitmodules --get-regexp '\.path$' 2>/dev/null | awk '{print $2}')
fi

git checkout -B "$BRANCH" >/dev/null 2>&1
git add -A
if git diff --cached --quiet; then
  HAS_CHANGES=false
  log "no changes produced by the agent"
else
  HAS_CHANGES=true
  if ! git commit -m "$COMMIT_MSG" >/dev/null 2>&1; then
    ERROR="failed to commit sandbox changes"
    log "FATAL: $ERROR"
    exit 1
  fi
  COMMIT_SHA="$(git rev-parse HEAD 2>/dev/null || echo "")"
  CHANGED_FILES="$(git show --pretty=format: --name-only HEAD 2>/dev/null | sed '/^$/d')"
  log "committed $COMMIT_SHA on $BRANCH"
fi

# result.json is emitted by the EXIT trap.
exit 0
