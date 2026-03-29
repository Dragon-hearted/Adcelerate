# Manage Client — Brand Profile Workflow

**Trigger:** User selects `[NC] New Client` from SKILL.md, or requests to create/update a client brand profile.
**Goal:** Create or update a client's brand profile and knowledge files in the SceneBoard client directory.

---

## Core Principles

- **Comprehensive but efficient.** Gather all essential brand information without overwhelming the user.
- **Structure for machine use.** The output files must be immediately usable by the Generate Storyboard workflow — no manual reformatting needed.
- **Update, don't duplicate.** When updating an existing client, modify existing files rather than creating new ones.

---

## Stage 1 — Client Identification

### Execution

1. **Check for existing clients** by listing `systems/scene-board/clients/` directories.
2. **Ask the user:**
   - "Are you creating a new client or updating an existing one?"
   - If new: "What's the brand name?" (derive the slug: lowercase, hyphenated)
   - If existing: "Which client?" (show the list)

3. **If updating an existing client**, load the current `brand.md` and present it for reference before asking what needs to change.

---

## Stage 2 — Brand Information Gathering

### For New Clients

Gather the following information through targeted conversation. Batch questions intelligently — don't ask everything at once.

**Essential (must have):**

| Category | Questions |
|---|---|
| **Brand Essence** | Style philosophy, target audience (age, demographics), brand promise/tagline |
| **Brand Voice** | Tone descriptors, vocabulary to use, vocabulary to avoid |
| **Visual Direction** | Preferred settings/environments, color preferences, photographic style, lighting mood |
| **Competitive Position** | Who are they NOT (competitors to differentiate from), closest comparisons |

**Valuable (ask if not provided):**

| Category | Questions |
|---|---|
| **Brand Values** | Core values (3-5) |
| **Brand Archetype** | Creator, Explorer, Sage, Hero, etc. |
| **Brand Manifesto** | A statement that captures the brand's philosophy |
| **Content Strategy** | Content types, social cadence, content buckets |
| **Contact** | Primary contact name and details |

### For Existing Clients

1. Present the current brand.md content.
2. Ask what needs to change.
3. Update only the specified sections.

### Approval Gate

```
--- Brand Information Gathered ---

Here's what I have so far:

**Brand Essence:** [summary]
**Brand Voice:** [summary]
**Visual Direction:** [summary]
**Competitive Position:** [summary]

[A] Approve — This captures the brand accurately
[M] Modify — Correct or add information
[R] Reject — Start over with different direction

Anything to adjust?
```

---

## Stage 3 — File Generation

### Execution

1. **Create the directory structure** (if new client):
   ```
   systems/scene-board/clients/{client-slug}/
     knowledge/
     storyboards/
   ```

2. **Generate brand.md** — The compiled quick-reference profile:
   - Brand Essence (philosophy, target, archetype, promise)
   - Brand Voice (tone, use/avoid vocabulary)
   - Style Philosophy (key attributes)
   - Brand Values
   - Visual Direction (summary)
   - Competitive Position
   - Brand Manifesto (if provided)
   - Contact info

3. **Generate knowledge/brand-positioning.md** — Detailed brand strategy:
   - Full brand positioning analysis
   - Target audience profile
   - Competitive landscape with comparison table
   - Brand voice guidelines with examples
   - Brand values with explanations

4. **Generate knowledge/visual-direction.md** — Detailed visual identity:
   - Photoshoot concepts and settings
   - Art direction principles (composition, color, lighting, model direction)
   - Content strategy and content buckets
   - Visual do's and don'ts

5. **Present the generated files** for review.

### Approval Gate

```
--- Client Profile Generated ---

Created files:
- brand.md — Compiled brand profile
- knowledge/brand-positioning.md — Full brand positioning
- knowledge/visual-direction.md — Visual identity & art direction

[A] Approve — Client profile is complete
[M] Modify — Adjust specific files or sections
[R] Reject — Rework from scratch

Ready to finalize?
```

---

## Stage 4 — Confirmation

1. **Save all files** to `systems/scene-board/clients/{client-slug}/`.
2. **Confirm to the user:**

```
--- Client Profile Complete ---

Client "{brand-name}" is ready for use in SceneBoard.

Directory: systems/scene-board/clients/{client-slug}/
Files:
  - brand.md (quick-reference profile)
  - knowledge/brand-positioning.md (detailed positioning)
  - knowledge/visual-direction.md (visual identity)
  - storyboards/ (ready for storyboard outputs)

You can now select this client when generating storyboards.
The brand context will be automatically loaded, skipping most brand-related questions.
```
