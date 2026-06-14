# Dragonhearted Labs — Brand Cheatsheet (never violate)

Condensed, agent-facing rules distilled from `client/dragonhearted_labs/brand-identity/brand.json` (the canonical source — when in doubt, read it). These are the lines a PostBoard creative must **never** cross.

## The Non-Negotiables

1. **Light-first, always-textured canvas.** Every composition sits on **Retro White `#F4F6F8`** carrying the ink-bleed effect **plus at least one texture**. **Flat untextured white is off-brand.** *(Exception: Hero Mode `01-chrome-hero` uses the dark **Void `#05070D`** starfield ground — the only dark-first canvas.)*

2. **Lime is NEVER text on the light canvas.** Neon Lime **`#C6FF00`** has ~1.1:1 contrast on canvas — illegible as type. Use it only as a **marker-block fill behind Graphite type**, an **underline**, or **stat-block fill**. Graphite text *on* a lime block = ~15:1 (great). Never lime-colored letters on light ground.

3. **Logo always sits in a Graphite container.** The chrome logo **always** lives inside a **Graphite `#111318` "ink-block" container panel** (riso bleed edges allowed). **Never place the chrome PNG directly on the light/textured ground.** Use the riso single-plate variants (`riso_graphite`, `riso_electric_blue`) for inline placement.

4. **Body copy stays clean.** Ink-bleed / glitch treatments apply to **backgrounds, display typography, graphic elements, and color blocks** — **not body text**. Body is always `treatment: "clean"`.

5. **≤ 1 glitch headline per composition.** Glitch is a spike, not a texture. At most one glitch-treated headline in a single slide; prefer `ink-bleed` for display, `clean` for everything else.

6. **System-tag voice device.** The mono tag `[DRGN.LAB//001]` (incrementing per slide) is the signature kicker — keep it. It reads as the "engineered" voice in visual form.

## Voice

- **Traits:** Engineered · Fearless · Crafted · Kinetic · Vivid.
- **Do-words:** build, ship, system, engineered, pipeline, automate, craft, deploy, output, real-world.
- **Don't-words (banned):** synergy, leverage, revolutionary, game-changer, cutting-edge, unlock, empower, seamless, disrupt, AI-powered.
- First-person, concrete, numbers over adjectives. Zero corporate filler.

## Typography

| Role | Family | Treatment | Use |
|---|---|---|---|
| Display | **PP Neue Machina** (`.otf`) | `ink-bleed` (or `clean`) | Hooks, headlines, stat values |
| Mono / tech | **IBM Plex Mono** (`.ttf`) | `clean` | System tags, labels, handles, stat labels |
| Body | **Inter** (Google fallback) | `clean` | Supporting copy |

## Palette (tokens)

| Token | Hex | Role |
|---|---|---|
| `canvas` | `#F4F6F8` | Default light canvas — always textured |
| `ink` | `#111318` | Primary ink: body, headlines, linework, logo container |
| `primary` | `#0B5FFF` | Hero/links/riso second plate (~4.8:1 — OK for large type/links) |
| `accent` | `#C6FF00` | Lime — marker-block fills / underlines / stat blocks **(never text on canvas)** |
| `accent2` | `#FF2A2A` | Urgency/alert — sparingly; large display / badges / misregistration plate |
| `metal` | `#C7CCD6` | Dividers, low-contrast texture linework (not for text) |
| `void` | `#05070D` | Hero Mode (`01-chrome-hero`) dark canvas ONLY |

## Tagline

**ENGINEERED INTELLIGENCE. REAL WORLD IMPACT.** — accent phrase **REAL WORLD** rendered as a Neon Lime marker-block behind Graphite type (or a lime underline) — **never lime-colored text**.

## Background System

- Always-on ink-bleed + ≥1 texture on the Retro White canvas.
- Bleed applies to: background fields, display typography, graphic elements, color blocks. **Not body text.**

---

**If a requested change would break any rule above:** flag it, explain the brand reason in one line, and offer an on-brand alternative. The brand bar is part of "scroll-stopping cover or it doesn't ship."
