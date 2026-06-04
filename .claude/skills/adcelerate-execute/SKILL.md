---
name: adcelerate-execute
description: "Execute Mode — routes tasks to the correct registered system, manages staged output delivery with approval gates, and validates output against acceptance criteria. Use when the engineer assigns a task for execution."
invocation: user
---

# Adcelerate Execute Mode

Route a task to the correct system, execute it through staged delivery, and validate output against acceptance criteria.

## Trigger

Use this skill when the engineer wants to:
- Run a task through an existing system
- Execute a registered system capability
- Process input through the Adcelerate platform

## Usage

```
/adcelerate-execute Generate captions for client-video.mp4
/adcelerate-execute Create a visual board from these product images
```

## Drivers

Execute Mode is **driver-aware**: it reads each system's `knowledge/execution.md` manifest and branches on its `driver` instead of reconstructing stages itself.

- **`skill` (delegate, native gates)** — the system has its own skill (e.g. `scene-board`). Execute Mode invokes that skill via the Skill tool and lets it run its own natural flow and its own [A]/[M]/[R] approval gates. The executor only relays engineer input at the manifest's checkpoints; it does not reconstruct the stages.
- **`cli` (orchestrate, executor gates)** — the system is run via commands (justfile recipes / `bun run`). Execute Mode orchestrates staged delivery itself, running the manifest's per-stage command(s) with an approval gate after each stage.

Both paths end with the same validation against `knowledge/acceptance-criteria.md`.

## Workflow

Follow the detailed workflow in [workflow.md](workflow.md).
