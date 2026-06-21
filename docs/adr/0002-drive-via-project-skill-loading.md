# Drive Flows by loading skills via the SDK `skills` option (not `settingSources`)

The Console must *launch* creative Flows (Drive), and the locked principle is that Drive means *invoking the existing skills*, never reimplementing flow logic. The orchestrator already embeds `@anthropic-ai/claude-agent-sdk` and spawns agent sessions, but it deliberately sets `settingSources: []` ("do not load the host's `~/.claude` settings"), which also blocks discovery of this repo's `.claude/skills/`. We will make skills discoverable by passing the SDK's **dedicated `skills` option** (`options.skills = [...]`) while **keeping `settingSources: []`**. A spawned Orchestration Agent can then invoke `adcelerate-execute` → the matched system's own skill — the exact same skills run from the CLI — with the `canUseTool` approval gate fully intact.

**Considered and rejected:**
- **`settingSources: ['project']`** (the original plan) — verified in code (`apps/command-center/orchestrator/src/agents/session.ts:202-231`, SDK `sdk.d.ts`): `settingSources` loads a source's settings *wholesale* (permissions, `defaultMode`, env, model, hooks) with **no skills-only scoping**. Any present-or-future `permissions`/`allow`/`defaultMode` in `.claude/settings.json` would pre-approve tools and silently bypass the `canUseTool` gate the human-in-the-loop loop depends on. The `skills` option is independent of `settingSources` and avoids this entirely.
- Spawning `claude -p` as a subprocess (heavier, no streaming/approval integration).
- Giving each system a non-skill HTTP/CLI entry point (more work, and scene-board is a skill-only submodule the workspace can't import).
- Reimplementing routing/flow logic in the orchestrator (violates the never-reimplement principle).

**Status:** open risk from the original draft is **resolved**. `canUseTool` is a programmatic always-fires callback for `RISKY_TOOLS` (`canUseTool.ts:40-73`), injected directly on the options object — not a rule a loaded settings file can override. The chosen mechanism (`skills` option, `settingSources: []`) never loads permissions, so the gate cannot be bypassed. The project's `.claude/settings.json` currently contains no `permissions` block, but we do not rely on that — we rely on never loading it.

---

## Amendment (2026-06-21, slice #39) — the `skills` option is a filter, not a discovery root

The mechanism above is **empirically wrong** and is superseded. During #39 the orchestrator builder spawned two real SDK sessions (`@anthropic-ai/claude-agent-sdk@0.3.168`, repo root, `env -u ANTHROPIC_API_KEY`, reading the authoritative `system/init` message — no model turn, ~zero spend):

- **`skills:['adcelerate-execute']` + `settingSources:[]`** → `adcelerate-execute` **NOT loaded**. Only `~/.claude/skills/` (global) + plugin skills appeared. Project `.claude/skills/` was invisible.
- **`skills:[…]` + `settingSources:['project']`** → loaded (`adcelerate-build`, `adcelerate-diagnose`, `adcelerate-execute` present).

**Root cause:** per `sdk.d.ts`, `skills` is *"a context filter, not a sandbox: unlisted skills are hidden"* — it filters **already-discovered** skills. The discovery roots are `~/.claude/skills/` (global) + plugins, **regardless of `settingSources`**; project `.claude/skills/` is discovered **only** when `settingSources` includes `'project'`. With `[]` the filter matches nothing because the skill was never discovered. The original ADR conflated "filter" with "discovery root."

**Corrected decision: load the skill as a SDK local plugin, keep `settingSources: []`.** Drive sessions pass `plugins: [{ type: 'local', path: <repo>/apps/command-center/orchestrator/drive-plugin }]` (a minimal in-repo plugin whose `skills/adcelerate-execute` symlinks the canonical `.claude/skills/adcelerate-execute`), with `skills: ['adcelerate-execute']` retained as the filter. This achieves the ADR's **actual intent** — make the project skill discoverable **without** loading project settings/permissions/`defaultMode`/hooks — so the `canUseTool` gate stays structurally uncircumventable. The skill body resolves `systems.yaml` relative to `cwd` (= repo root, unchanged), so discovery location does not affect routing.

**Why not the alternatives** (considered 2026-06-21):
- **`settingSources: ['project']` (Drive only)** — reintroduces the precise footgun this ADR exists to prevent: a *future* `allow`/`permissions` block in `.claude/settings.json` would silently pre-approve tools and bypass the gate (the gate is intact only because that block happens to be absent today). Also fires 6 project `SessionStart` hooks (log-rotation, maintenance, `send_event`, library-sync…) on **every** Drive spawn — those hooks target interactive top-level sessions, not per-command dispatch.
- **Symlink the skill into `~/.claude/skills/`** — keeps `[]` and loads, but pollutes the operator's global skill set (the skill leaks into all their unrelated Claude sessions) and adds an off-repo, per-machine setup step that drifts.
