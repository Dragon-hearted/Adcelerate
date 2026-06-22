# Agent Sandboxes

Disposable, network-locked Docker containers that run a **headless Claude Code agent**
on a throwaway clone of a repo, commit the result, and hand it back to you as a
**reviewable Pull Request** — then destroy themselves. N sandboxes run in parallel
(A/B/C), each fully isolated. Nothing merges without your review.

> Replaces the host-level `claude --dangerously-skip-permissions` pattern
> (`just cldii` / `cldmm`), which gives an agent full reach over your machine,
> network, and live working tree. Here the blast radius of any single run is a
> destroyed container and an *unmerged* PR.

- **Source of truth:** `sandbox/config.ts` (image tag, network, allowlist, limits, target map).
- **Host orchestrator:** `sandbox/orchestrator.ts` (clone → `docker run` → teardown → push → `gh pr create`).
- **In-container lifecycle:** `sandbox/task-runner.sh` (firewall → install → agent → tests → commit → `result.json`).
- **Firewall:** `sandbox/init-firewall.sh` (deny-all egress + allowlist + `--self-test`).
- **Approved plan / threat model:** `specs/agent-sandboxes.md` (+ `specs/agent-sandboxes.html`).

---

## How it works

```text
You → host Claude Code:  "implement <task>"
  └─ just sandbox-run "<task>" --target pinboard --parallel 3
        │  HOST  (holds GitHub creds + gh auth — the container never does)
  1. git clone [--recurse-submodules] <target> → $TMPDIR/adcelerate-sandbox/<id>/repo
  2. docker run --name sb-<id> --network sandbox-net
        --cap-drop ALL --cap-add NET_ADMIN --user node
        --cpus 2 --memory 4g --pids-limit 512
        -e CLAUDE_CODE_OAUTH_TOKEN=***   (ANTHROPIC_API_KEY NOT passed)
        -v <per-run-clone>:/work  adcelerate-sandbox:latest  "<task>"
        │  INSIDE the container (ephemeral, unprivileged `node` user)
  3. init-firewall.sh  → DROP all egress; ACCEPT only Anthropic + GitHub + npm/PyPI; drop LAN/host
  4. bun install --frozen-lockfile  ·  uv sync --frozen   (only the touched system)
  5. env -u ANTHROPIC_API_KEY claude -p "<task>" --dangerously-skip-permissions \
        --output-format stream-json --model opus
  6. bun test  (or a system `just test` if present)
  7. git checkout -B sandbox/<id>-<slug>; git add -A; git commit   ← NO push (no creds)
  8. write /work/result.json
        │  HOST
  9. docker rm -f sb-<id>                 (teardown; guaranteed via finally/trap)
 10. git push origin sandbox/<id>-<slug>  (new branch only — never --force, never default branch)
 11. gh pr create → PR on <target>   [submodule changed ⇒ submodule PR + parent-pointer DRAFT PR]
 12. rm -rf the per-run dir              (prune)
```

The agent **commits but cannot push** — there are no GitHub credentials inside the
container. The host pushes a *fresh* `sandbox/*` branch and opens the PR.

---

## One-time setup

The in-sandbox agent is billed to your **Claude subscription (Pro/Max)**, not to
API credits. That requires an OAuth token and the API key to stay **unset**.

1. **Mint a subscription OAuth token on the host:**
   ```bash
   claude setup-token
   ```
2. **Store it in the gitignored `.env`** at the repo root (the `justfile` already has
   `set dotenv-load := true`, so it is auto-loaded into every recipe):
   ```dotenv
   CLAUDE_CODE_OAUTH_TOKEN=sk-ant-oat-...
   ```
3. **Never commit it.** It is passed to the container at runtime only (`-e`), never
   baked into the image, and scrubbed from all streamed logs and `result.json`.
4. **Keep `ANTHROPIC_API_KEY` UNSET.** If it is set, the agent would spend **API
   credits** instead of the subscription. The orchestrator deliberately never
   forwards it, and the runner additionally launches the agent with
   `env -u ANTHROPIC_API_KEY`. (See memory `project_moodboarder_claude_credit_auth`.)

> ⚠️ Parallel sandboxes share **one** subscription rate-limit pool — they throttle
> each other. Fan-out is capped at **3** (`CONCURRENCY_CAP` in `config.ts`)
> regardless of `--parallel`.

---

## Build the image

```bash
just sandbox-build     # base image → adcelerate-sandbox:latest
just sandbox-build 1   # + ffmpeg etc. (AutoEditor / MoodBoarder workloads)
```

`sandbox-build` takes a single **positional** arg (`just` lacks working named args).
The default (`0`) keeps the image lean: Debian-slim + `node` + `bun` + `uv` + `git` +
`iptables`/`ipset` + the headless `@anthropic-ai/claude-code` agent, all running as
the non-root `node` user. Passing `1` (`just sandbox-build 1`) adds the heavy media
stack via `--build-arg WITH_MEDIA=1`.

---

## Run a task

```bash
# Basic: one sandbox against the parent monorepo (default --target adcelerate).
just sandbox-run "add a one-line comment to README.md"

# Pick a target system and fan out into 3 isolated sandboxes → 3 PRs.
just sandbox-run "fix the broken import" --target pinboard --parallel 3

# Orchestrator flags pass straight through.
just sandbox-run "noop" --dry-run
just sandbox-run "try a refactor" --no-pr --keep
```

`just` has no working named-argument syntax (`target=…` binds positionally and
misroutes), so `sandbox-run` is a clean flag-passthrough recipe:

```text
sandbox-run *args:
  @bun run sandbox/orchestrator.ts "$@"
```

The first bare quoted positional is the **task** (the orchestrator picks it up); every
`--flag` after it goes straight to the orchestrator. So:

```bash
just sandbox-run "<task>" --target pinboard --parallel 3
```

invokes `bun run sandbox/orchestrator.ts "<task>" --target pinboard --parallel 3`.

### Orchestrator flags

| Flag | Default | Meaning |
|---|---|---|
| `--task <str>` | — (required) | The instruction handed to the in-sandbox agent. A bare positional arg also works. |
| `--target <name>` | `adcelerate` | Which repo to clone/scope to (see the target map below). |
| `--parallel <N>` | `1` | Run N independent sandboxes (volume + container + branch + PR each). Capped at 3. |
| `--model <name>` | `opus` | Model for the headless agent (`DEFAULT_MODEL`). |
| `--dry-run` | off | Print the exact clone + `docker run` argv (token redacted) and exit. Touches nothing. |
| `--no-pr` | off | Run the agent and commit on the branch, but skip push + `gh pr create`. |
| `--keep` | off | Do not tear down the container or prune the run dir (for debugging). |
| `--timeout-ms <N>` | `1800000` (30 min) | Wall-clock ceiling for a single run; on timeout the container is killed (exit 124). |
| `--doctor` | — | Run the firewall + threat-model self-check (see below). Same as `just sandbox-doctor`. |
| `--clean` | — | Remove stray sandbox containers/volumes + run dirs. Same as `just sandbox-clean`. |

### Verify the firewall + safety invariants

```bash
just sandbox-doctor
```

Runs a non-destructive audit and a **live in-container firewall self-test**, then
exits non-zero on any leak. It checks: Docker reachable, image + `sandbox-net`
present, caps = `drop ALL` + `add NET_ADMIN` only, non-root `--user node`,
cpu/mem/pid limits set, **no `docker.sock` mount**, **no host working-tree
bind-mount**, `ANTHROPIC_API_KEY` not forwarded, OAuth token forwarded + available,
and that the live firewall **allows `api.anthropic.com` while blocking
`example.com` and a LAN IP** (`192.168.0.1`).

### Clean up

```bash
just sandbox-clean
```

Force-removes any leftover `sb-*` containers and `sb-*` volumes, and prunes the
per-run staging dirs under `$TMPDIR/adcelerate-sandbox`.

---

## Targets

`--target` selects what gets cloned and how the resulting PR is routed
(`TARGETS` in `config.ts`):

| Target | Kind | Clone behavior | PR routing |
|---|---|---|---|
| `adcelerate` | **parent** | Parent monorepo, `--recurse-submodules` | PR on parent; a `systems/*` submodule edit also triggers submodule PR(s) + a parent-pointer DRAFT PR |
| `auto-editor` | standalone | `Dragon-hearted/auto-editor.git` | single PR on that repo |
| `pinboard` | standalone | `Dragon-hearted/pinboard.git` | single PR on that repo |
| `scene-board` | standalone | `Dragon-hearted/scene-board.git` | single PR on that repo |
| `instagram-scrapper` | standalone | `Dragon-hearted/instagram-scrapper.git` | single PR on that repo |
| `image-engine` | standalone | `Dragon-hearted/image-engine.git` | single PR on that repo |
| `readme-engine` | standalone | `Dragon-hearted/readme-engine.git` | single PR on that repo |
| `prompt-writer` | standalone | `Dragon-hearted/prompt-writer.git` | single PR on that repo |
| `moodboarder` | standalone | `Dragon-hearted/MoodBoarder.git` | single PR on that repo |
| `scrape-engine` | **subpath** | Parent clone, agent scoped to `systems/scrape-engine` | PR on the parent (it is **not** a git submodule — it lives in the parent tree) |

- **parent** — clones the monorepo with submodules; submodule-aware (see below).
- **standalone** — clones the system's own upstream repo directly; one PR.
- **subpath** — clones the parent but scopes the agent to a subdirectory and PRs
  the parent (for tree-resident systems that are not submodules).

Standalone URLs mirror `.gitmodules`; parent/subpath URLs are resolved from the
parent repo's `origin` at runtime.

---

## Isolation layers

Three independent boundaries, so no single failure exposes the host:

1. **Network** — an in-container `iptables` **deny-all egress** with a tiny
   allowlist (Anthropic, GitHub-no-creds, npm/PyPI/uv). RFC-1918 (`10/8`,
   `172.16/12`, `192.168/16`), link-local (`169.254/16`), and the host gateway are
   explicitly dropped *before* the allowlist — defeating DNS-rebind / LAN pivots and
   making host-local services (e.g. the Command Center orchestrator on `localhost:4100`) unreachable from the sandbox.
2. **Filesystem** — the agent works on a **throwaway per-run clone** staged in a host
   temp dir and bind-mounted to `/work`. It is **never** a bind-mount of your real
   working tree, and `/var/run/docker.sock` is never mounted.
3. **Privilege / credentials** — non-root `node` user, `--cap-drop ALL` with only
   `--cap-add NET_ADMIN` (granted to the firewall binaries via `setcap`, so no sudo
   or setuid is needed), `--cpus 2 --memory 4g --pids-limit 512`, and a
   **subscription OAuth token only** — no API key, no GitHub token.

---

## Threat model

The full 12-row red-team table lives in
[`specs/agent-sandboxes.md`](../specs/agent-sandboxes.md). Summary:

| # | Vulnerability / attack | Mitigation |
|---|---|---|
| 1 | Subscription-token exfiltration by a prompt-injected agent | Egress allowlist; OAuth (not API key); runtime-only env, never in the image; logs + `result.json` scrubbed; non-root. |
| 2 | `--dangerously-skip-permissions` lets the agent run anything | Deny-all network, non-root, `--cap-drop ALL` (only `NET_ADMIN`), cpu/mem/pid limits, ephemeral, no host bind-mount. |
| 3 | Container escape via the Docker socket | `/var/run/docker.sock` never mounted; no `--privileged`. |
| 4 | Supply-chain: a malicious dep executes at install | `--frozen-lockfile` / `uv sync --frozen`; install runs *after* the firewall; human-reviewed PR. |
| 5 | Prompt injection from task / repo content | Agent commits but cannot push or merge; the PR is the gate; the default branch is protected. |
| 6 | LAN / host pivot (`host.docker.internal`, `192.168.x`) | Firewall drops RFC-1918 + host gateway; custom bridge; obs server unreachable. |
| 7 | Data exfil via PR body / branch name | Host-side PR review; branch names are orchestrator-generated. |
| 8 | Resource exhaustion / crypto-mining | `--cpus` / `--memory` / `--pids-limit` + wall-clock timeout + guaranteed teardown. |
| 9 | Subscription rate-limit exhaustion (parallel) | Concurrency capped (default 3); shared-pool warning logged. |
| 10 | Cross-run leakage | Unique per-run clone + container; pruned after the PR; no shared writable mounts. |
| 11 | Destructive git on the host (force-push, wrong branch) | Host pushes only to a fresh `sandbox/*` branch, never `--force` / default branch; honored by `pre_tool_use.py`. |
| 12 | macOS Docker networking caveat | Firewall runs in the container netns (works under Desktop NAT); `sandbox-doctor` verifies allow/deny pre-run; OrbStack/colima differences documented below. |

---

## Submodule auto-sync

When a **parent** (or **subpath**) target run edits a `systems/*` git submodule, the
orchestrator does a two-step PR dance so nothing merges out of order:

1. **Submodule PR(s)** — for each changed submodule, push the same-named
   `sandbox/<id>-<slug>` branch to the submodule's own repo and open a PR there.
2. **Parent-pointer DRAFT PR** — push the parent branch (with the bumped gitlink) and
   open a **draft** PR on the parent that links the submodule PR(s) with a
   *"Blocked on submodule PR(s) — merge those first, then re-point"* note.

The parent PR is forced to **draft** while it references unmerged submodule SHAs.
This avoids the post-merge pointer-regression trap (see memory
`project_submodule_pointer_sync_after_merge`): merge the submodule PR first, then
re-point and un-draft the parent. PRs that have failing tests or a non-zero agent
exit are also opened as drafts.

---

## Engine notes (macOS)

- **Docker Desktop** is the primary, supported engine — the firewall runs inside the
  container's network namespace and works under Desktop's NAT.
- **OrbStack / colima** also work, but their Linux VMs can differ on `NET_ADMIN` /
  `iptables` behavior — **verify with `just sandbox-doctor`** before relying on a run
  (its live firewall self-test is the canary).
- A lighter alternative — Anthropic's `@anthropic-ai/sandbox-runtime` — is noted in
  the spec but intentionally not chosen here.

---

## Observability

The sandbox is intentionally cut off from `localhost:4100`, so the in-container agent
cannot reach the Command Center orchestrator. If you want dashboard visibility, the host orchestrator
streams the agent's `stream-json` output (token-scrubbed) and can forward it from the
host side.

---

## Quick reference

```bash
just sandbox-build                                       # build adcelerate-sandbox:latest
just sandbox-build 1                                      # + ffmpeg media stack
just sandbox-run "<task>"                                 # one PR against adcelerate
just sandbox-run "<task>" --target pinboard --parallel 3 # 3 isolated PRs
just sandbox-run "<task>" --dry-run                       # print the plan, run nothing
just sandbox-doctor                                      # firewall + safety self-check
just sandbox-clean                                       # remove stray containers/volumes/dirs
```
