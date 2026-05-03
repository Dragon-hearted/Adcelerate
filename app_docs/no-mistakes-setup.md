# no-mistakes Setup

> Local Git proxy that validates code before pushing upstream. Used per spec
> `specs/fix-pr-10-review-findings.md` so commits land via
> `git push no-mistakes <branch>` and a local pipeline gates the push to origin.

## Status: INSTALLED

- **Binary:** `$HOME/go/bin/no-mistakes` (wherever `go install` places binaries on
  your machine — confirm via `go env GOBIN` / `go env GOPATH`)
- **Version:** run `no-mistakes --version` after install to confirm (verified at
  `v1.11.0` during initial setup)
- **Install method:** `go install github.com/kunchenguid/no-mistakes/cmd/no-mistakes@latest`
  - `go` toolchain must be available on `PATH` (verify with `go version`); the
    install script auto-detects your platform (`go env GOOS/GOARCH`)
  - This avoided the upstream `curl ... | sh` install path (denied by sandbox
    policy in this Claude Code session for piped-shell execution).

### PATH note (manual user step pending)

`$GOPATH/bin` (typically `$HOME/go/bin`) may not be on your shell `PATH`, so
bare invocations of `no-mistakes` in a fresh terminal will not resolve. Either
of these one-liners fixes it:

```sh
# Option A — add Go's bin to PATH (preferred; persists for all go-installed tools)
echo 'export PATH="$HOME/go/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc

# Option B — symlink into an existing PATH dir (no rc edit)
ln -s "$HOME/go/bin/no-mistakes" /usr/local/bin/no-mistakes
```

After either step, `which no-mistakes` and `no-mistakes --version` should
succeed.

### Alternative install (if `go` were unavailable)

The upstream README publishes a `curl ... | sh` installer at:

```text
https://raw.githubusercontent.com/kunchenguid/no-mistakes/main/docs/install.sh
```

This session refused both the piped form and a download-then-inspect approach.
**The user can run the installer interactively in their own shell** — the
permission prompt that appears in Claude Code (`! curl ... | sh`) goes through
the user's normal approval flow. Recommended manual command:

```sh
curl -fsSL https://raw.githubusercontent.com/kunchenguid/no-mistakes/main/docs/install.sh | sh
```

The `go install` path used here is cleaner and was successful, so the curl
installer is **not required**.

## Current Repo State

```text
$ git remote -v
origin	https://github.com/Dragon-hearted/Adcelerate.git (fetch)
origin	https://github.com/Dragon-hearted/Adcelerate.git (push)

$ git branch --show-current
claude/refine-local-plan-BYyga
```

There is **no** `no-mistakes` remote yet — `init` has not been run for this
repo. After `init` succeeds the expected output is:

```text
$ git remote -v
origin       https://github.com/Dragon-hearted/Adcelerate.git (fetch)
origin       https://github.com/Dragon-hearted/Adcelerate.git (push)
no-mistakes  <local-bare-gate-path>                            (fetch)
no-mistakes  <local-bare-gate-path>                            (push)
```

## Expected Setup Flow

Per `no-mistakes init --help`:

> Sets up a local bare repo as a gate, installs a post-receive hook,
> best-effort isolates the gate hook path from shared local git config writes
> when Git supports `config --worktree`, adds a "no-mistakes" git remote, and
> records the repo in the database.
>
> Run this from inside a git repository that has an "origin" remote.

The relevant subcommands surfaced by `no-mistakes --help`:

| Command | Purpose |
| --- | --- |
| `init` | Initialize the gate (creates local bare repo + hook + `no-mistakes` remote) |
| `daemon start` / `status` / `restart` / `stop` | Manage the background pipeline daemon |
| `doctor` | Health-check system + dependencies |
| `status` | Show current repo's gate status |
| `runs` | List pipeline runs |
| `attach` | Attach to the active pipeline run (live tail) |
| `rerun` | Rerun the pipeline for the current branch |
| `eject` | Remove the gate from the repo |

### Step-by-step (user runs these interactively)

```sh
# 0. Ensure no-mistakes is reachable (one-time, see PATH note above).
export PATH="$HOME/go/bin:$PATH"

# 1. Sanity-check the install + environment.
no-mistakes --version          # expect: v1.11.0
no-mistakes doctor             # expect: green checks

# 2. Start the daemon (one-time; service auto-starts on subsequent logins).
no-mistakes daemon start
no-mistakes daemon status      # expect: running

# 3. From inside this repo, initialize the gate.
cd <repo-root>                 # the repo root where this file lives
no-mistakes init               # adds the "no-mistakes" git remote
git remote -v                  # confirm the remote is present

# 4. Confirm gate is registered for this repo.
no-mistakes status             # expect: this repo listed, gate active
```

## Pushing PR #10 Branch Through the Gate

Once the steps above succeed, the spec's required push command is:

```sh
git push no-mistakes claude/refine-local-plan-BYyga
```

The local gate runs the configured pipeline; on success it forwards to
`origin`. To watch progress live in another terminal:

```sh
no-mistakes attach             # tails the active run
# or, after the fact:
no-mistakes runs               # list runs
```

If the pipeline fails and the issue is in the pipeline itself rather than the
code, `no-mistakes rerun` re-runs the same commit through the gate without
needing a new push.

## Pending User-Interactive Steps

The Claude Code session installed the binary but cannot complete the
user-environment-side work. The user should run, in order:

1. Add `$HOME/go/bin` to PATH (see "PATH note" above).
2. `no-mistakes daemon start`
3. `no-mistakes init` from the repo root (`<repo-root>`)
4. `git push no-mistakes claude/refine-local-plan-BYyga` once the spec's fixes
   are committed.
