# Manage Client — Brand Context Pointers

**Trigger:** User selects `[MC] Manage Client`, or asks to view/update which brand context PostBoard uses.
**Goal:** View and update the **pointers** PostBoard reads for a client — without ever regenerating the canonical brand definition.

> **`brand.json` is canonical and owned by the brand workstream.** PostBoard *reads* it via `loadBrand()`; it never writes or regenerates it. If brand tokens (fonts, palette, style modes, positioning, logo rules) need to change, that work happens in the brand-identity workstream, not here.

---

## What PostBoard Reads Per Client

```
client/{client}/
  brand-identity/
    brand.json        # CANONICAL tokens — loadBrand() source of truth (DO NOT regenerate here)
    brand.md          # Human brand profile (reference)
    fonts/            # Display (PP Neue Machina), mono (IBM Plex Mono); Inter via Google fallback
    assets/           # Logo variants, brand elements (barcodes, starbursts, …)
  strategy/
    positioning.md    # Angle, audience, offers — informs copy + style-mode choice
  post-board/         # Generated project outputs: <project-id>/project.json + assets/
```

Default client: **`dragonhearted_labs`**.

---

## Stage 1 — Identify the Client

1. **List known clients:**

```bash
ls client/
```

2. Ask whether to **view** current context or **point to a different client**.

---

## Stage 2 — View Current Context

Summarize what PostBoard will load for the selected client:

```bash
cd systems/post-board
bun -e 'import { loadBrand } from "./src/index"; const b = loadBrand({ silent: true }); console.log("brand:", b.brand, "| wordmark:", b.wordmark); console.log("style modes:", b.styleModes.map(s => s.id).join(", ")); console.log("voice:", b.voice.traits.join(", ")); console.log("positioning:", b.positioning.headlinePromise, "|", b.positioning.ctaBanner)'
```

Also read `client/{client}/strategy/positioning.md` for the angle/audience/offers, and present a one-screen summary:

```
## Client Context: [client]

**Wordmark:** [wordmark]
**Voice:** [traits] — do: [do-words] · avoid: [don't-words]
**Positioning:** [headline_promise] → [cta_banner]
**Style modes available:** [ids]
**Strategy:** [1–2 lines from positioning.md]
```

---

## Stage 3 — Update Pointers (not tokens)

PostBoard-side updates are limited to **pointers and strategy notes**, never `brand.json`:

- **Strategy note** — refine `client/{client}/strategy/positioning.md` (angle, audience, offers) so copy + style-mode selection improve. This is editable here.
- **Default client** — if the user wants a different default than `dragonhearted_labs`, confirm and use it for this session (the engine resolves the brand slug at call time).

**If the user asks to change brand tokens** (colors, fonts, logo rules, style modes, positioning banners):

```
That lives in brand.json, which is the canonical brand definition managed by the
brand-identity workstream — PostBoard reads it but never regenerates it. I can:
  [1] Note the requested change and hand it to the brand workstream
  [2] Proceed with the current brand.json for now
Which would you prefer?
```

Never edit or regenerate `brand.json` from this skill.

### Approval Gate (for any strategy-note edit)

```
--- Manage Client: [client] ---

[Proposed change to positioning.md / default pointer]

---
[A] Approve — Save the change
[M] Modify  — Adjust
[R] Reject  — Don't change

Anything else, or shall I save?
```

---

## Stage 4 — Confirm

```
--- Client Context Ready: [client] ---

PostBoard will load:
  - brand-identity/brand.json (canonical tokens — unchanged)
  - strategy/positioning.md (strategy)

Outputs save under client/[client]/post-board/<project-id>/.
You can now generate or iterate posts for this client.
```
