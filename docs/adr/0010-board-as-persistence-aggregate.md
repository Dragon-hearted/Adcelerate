# The Board is the unit of persistence, not the Run

The operator needs to *save a board for future use* and reopen it. A Run is already durable and replayable (it maps onto a `sessions` row + the event log; `GET /api/sessions/:id/replay` reconstructs its Step Graph), so saving a Run is nearly free — but a Run cannot hold the things that make a board a board: multiple Runs together, a canvas you started by dropping in uploads *before* running anything, and the user-authored material the Canvas already treats as first-class (uploads, notes, Reference Groups), none of which has an event-sourced home.

**Decision:** introduce a **Board** as the unit of persistence — a named, durable workspace that **references one-or-more Runs** (reusing their session/event-log replay verbatim) and **owns** the two things with no event-sourced home: the **canvas layout** (node positions, zoom, pins) and the **user-authored material** (uploads, notes, Reference Groups). Runs stay immutable event-sourced content; the Board is the savable/nameable/reopenable container layered on top.

- v1 default is **one-Run-per-board** (starting a Flow creates a Board wrapping it), but the schema is **many-Runs-per-board from day one** — many Runs per board is real, not hypothetical (e.g. a scene-board storyboard Run plus an image-engine batch Run launched off one of its frames, on the same canvas).

**Considered and rejected:**
- **Run is the unit + a sidecar layout table keyed by `sessionId`.** Cheaper, but a Run can't span multiple Runs, can't exist before its first Run, and forces user-authored material to hang off a session it may predate. It also re-introduces "board" as an implicit thing without naming it, which the operator's own mental model ("save *that board*") already rejects.

**Consequence:** net-new storage is required regardless — at minimum a `boards` table, a board↔run link, a layout store, and tables for user-authored material. The existing replay machinery is reused unchanged for Run content; only the Board envelope is new. Artifact durability for saved Boards is handled separately (ADR-0011).
