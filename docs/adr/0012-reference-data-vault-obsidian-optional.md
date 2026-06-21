# Reference data lives in a plain markdown/JSON file tree; Obsidian is an optional viewer, not a dependency

Storage splits into two natures: **operational data** (Runs, Steps, Branches, Boards, Artifacts, token ledger) is hot, machine-emitted, concurrent, ordered, and queried — it belongs in the event-sourced **Substrate** (ADR-0005/0009/0010/0011). **Reference data** (brand briefs, prompt libraries, client dossiers, positioning/voice/research) is cold, human-authored, and cross-linkable. The question was whether to host the reference half in Obsidian (the proposal was "Obsidian for all data storage").

**Decision:** reference data stays in the **existing on-disk markdown/JSON file tree** — which is *already* a de-facto vault (`client/{slug}/` with `brand.md`, `knowledge/*.md`, `strategy/*.md`, `brand-identity/`; plus root `knowledge/` and per-system `knowledge/`). **Obsidian is an optional viewer** the operator may open over that folder for backlinks/graph/editing — it is **never a runtime dependency and never the system-of-record**. No system imports an Obsidian API; nothing breaks if Obsidian isn't installed. Operational data never goes in the vault; it stays in the Substrate.

- `brand.json` stays **canonical machine-readable JSON** (read-only by post-board's `loadBrand()`, owned by the brand workstream); its `brand.md` twin is the human companion. Obsidian may *show* the twin but is never the editor-of-record for the tokens.
- For open-source (ADR-0013), the repo ships an **example vault template** — a committed `.obsidian/` default config + a dummy example client — *not* real content. Real `client/` stays git-ignored.

**Considered and rejected:**
- **Obsidian as the storage layer for everything** (including Runs/Boards/Artifacts) — Obsidian is a desktop GUI app over flat markdown with no atomic append, locking, dedup index, relational query, or HTTP-served binary store. It structurally cannot meet the Substrate's concurrency (ADR-0005 active-flip), idempotent-ingest (ordering), or artifact-serving (ADR-0011) requirements. Coupling a server to it would undo those decisions.
- **A single unified store** (push reference data into the Substrate DB too) — loses the human-navigable, git-diffable, Obsidian-openable nature that makes reference data useful, for no operational gain.

**Consequence:** the "Obsidian integration" requires **zero storage work** — the files are already a vault; integration is just opening them (optionally with a shipped `.obsidian/` config). The reference/operational boundary is drawn by **nature** (curated vs machine-generated), not by folder — notably, scene-board's generated storyboard output is *operational* even though it currently sits under `client/{slug}/storyboards/`.
