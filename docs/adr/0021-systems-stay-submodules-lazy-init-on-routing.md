# Systems stay independently-versioned submodules; init is lazy via a routing pre-flight

Adcelerate is the orchestration repo; the 8 creative systems (image-engine, scene-board, post-board, auto-editor, …) are independent products. For public release we had to choose how systems are distributed: merge them all into the orchestration repo as folders, clone all of them upfront, or pull each one only when a Flow needs it. We keep them as **independently-versioned git submodules** (reject the merge) and make their **init lazy** — a system is `git submodule update --init`'d on first use, built on git's own submodule machinery rather than a net-new downloader.

**Grounding (Explore, 2026-06-21):**
- 8 systems are **public HTTPS submodules** under one org (`github.com/Dragon-hearted/*`, `.gitmodules:1-25`), unpinned branches. `scrape-engine` is still in-tree, pending extraction.
- **No on-demand mechanism exists today**: `just sub-init` = `git submodule update --init --recursive` (all 8); README tells cloners `git clone --recursive`. Execute Mode reads `systems.yaml` → matches task → reads `[system]/knowledge/execution.md` and **assumes the dir is on disk** — no absent-case handling (`adcelerate-execute/workflow.md:56-62`).
- `systems.yaml` carries `name/path/status/task_types/...` but **no version or remote field**; versions live only as submodule SHAs. Remotes live in `.gitmodules`.
- The sandbox already clones `--recurse-submodules`, so inside a sandbox run all systems are present regardless.

**Decision:**

1. **Reject the merge.** Systems stay separate repos. Merging is the one irreversible option here and it destroys independent per-system versioning — the exact property that update-propagation (a future ADR) depends on. Each system keeps its own repo, history, CI (auto-editor already has its own), and clean-room publish boundary.

2. **Submodule is the distribution unit.** A public cloner gets the orchestrator; systems are fetched as submodules. No parallel package manager is invented — the remotes are already declared in `.gitmodules` and git fetches one submodule by path.

3. **Init is lazy, via a routing pre-flight (net-new).** Before Execute Mode routes to a matched system, it checks whether `systems/<x>/` is populated; if empty, it runs `git submodule update --init --recursive systems/<x>` (public remote, no auth), then proceeds. Steps before and after this check already exist — the pre-flight is the only net-new piece. This realises the "agent sees scene-board absent → pulls it → runs the storyboard" use case without clone-all weight.

4. **Lazy-init is a local/first-touch affordance, not a sandbox concern.** Sandbox runs already recurse submodules, so the pre-flight is a no-op there; it matters for local/dev and the first time a cloner invokes a given system.

**Considered and rejected:**
- **Merge all systems into adcelerate** — single shippable artifact, zero submodule literacy required of cloners, but irreversible and it forecloses independent system updates. The cost lands precisely on the capability we most want to keep.
- **Clone-all-upfront (status quo)** — simplest, but forces every cloner to pull every system's weight (e.g. the video editor's ffmpeg/whisper toolchain) even to make a single carousel.
- **A net-new on-demand clone/package system** — redundant: git submodules already encode remotes and support per-path init. Building a downloader duplicates git for no gain.

**Consequence:** A net-new pre-flight check in `adcelerate-execute` routing (dir-populated? → `git submodule update --init --recursive systems/<x>`). README/setup docs gain a "clone light, systems fetch on first use" path alongside `--recursive`. Lazy-init assumes **git + network at runtime** and a **public** remote — a system going private later would need auth at the pre-flight, a reason to keep public systems public. Independent versioning is preserved, which sets up (and is depended on by) the update-propagation decision and the public face of envelope versioning (item 7 / ADR-0020).
