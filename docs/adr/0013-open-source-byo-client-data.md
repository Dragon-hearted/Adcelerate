# Adcelerate ships open-source as a bring-your-own-client-data template

The goal is to open-source the monorepo so anyone can clone it, drop in their *own* client data, and run it — including the optional Obsidian view over their reference vault. A release-readiness audit (2026-06-20) found the architecture already suited to this: `client/` is git-ignored and was **never committed** (`git log --all -- client/` = 0), there are **no secrets in history or tracked**, secrets are **env-var-only** with `.env.sample` templates, all **8 submodules are already public**, and `.gitignore` properly anchors `/client/`, `.env*`, keys, and `*.sqlite/*.db`. So no `git-filter-repo` scrub is required and this repo can be flipped public directly (plan **(a)**), rather than carving out a fresh template repo **(b)**.

**Decision:** open-source as a **single clone-and-run repo with bring-your-own-client-data**:
- **Client data never ships.** `client/{slug}/` stays git-ignored and is backed up out-of-band (`~/scene-board-clients-backup-*`); each user populates their own locally. The repo is multi-tenant *by directory*, empty of content on clone.
- **Secrets stay env-only.** All providers (WisGate, Higgsfield, Apify, Anthropic, Google AI, fal, IG) are read from env via `.env.sample` contracts; never hardcoded, never committed.
- **The Substrate is per-install and local** (SQLite + local artifact store); nothing phones home.
- **On-ramp = an example client + an Obsidian vault template** (committed `.obsidian/` config + dummy data), so a stranger has something to model their own `client/` on, and opening the repo in Obsidian works immediately.

**Considered and rejected:**
- **(b) fresh public template repo / vendored submodules.** Cleaner-history guarantee, but the audit shows history is already clean and submodules already public, so (b) only adds two-repo maintenance and a heavier "make-your-own" story for no leak-prevention gain.

**Consequence — pre-publish checklist (must pass before `gh repo edit --visibility public`):**
1. **Same-day human leak re-check** — one automated audit pass is not the sole gate for an irreversible flip; run `git ls-files` + `git log --all --reverse | head` / `git-filter-repo --analyze` on push day (per standing memory rule).
2. **~~Verify `systems/pinboard/.legacy/client/`~~ — DONE (2026-06-20): cleared.** Verified *not* a sensitive leak: `.legacy/client/` is client-*side* code (retired React/Vite web UI) + `.legacy/server/`, tracked on public `origin/master` but containing no secrets, keys, `.env`, brand assets, or customer data. The "client" folder name was a false alarm. Optional housekeeping only: add `.legacy/` to the pinboard `.gitignore` (+ optional `git-filter-repo` for a tidy history). Not a blocker.
3. **Add a LICENSE** — without one the repo is merely visible, not open-source.
4. **`.gitignore` hygiene** — add `uploads/` and `cookies.json` at root (belt-and-suspenders; systems already ignore them locally), and ensure the new Substrate DB + artifact store paths are ignored when built.
5. **Ship the example client + `.obsidian/` template + setup docs** so "clone → feed data → run" actually works on a fresh machine.
