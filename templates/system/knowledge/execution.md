---
system: "{{system-id}}"
type: execution
driver: "{{skill | cli}}"
skill: "{{skill-name (skill driver only — the skill Execute Mode invokes)}}"
entry: "{{command template (cli driver only — e.g. just <recipe> <args>)}}"
mode: "{{delegate | orchestrate}}"
gates: "{{native | executor}}"
version: 1
lastUpdated: "{{date}}"
lastUpdatedBy: build-mode
---

# Execution — {{system-name}}

How Execute Mode (`/adcelerate-execute`) runs this system. Execute Mode reads ONLY this manifest to decide how to run, then branches on `driver`.

## Invocation
{{For driver: skill — "Invoke the `{{skill-name}}` skill via the Skill tool, relaying the engineer's task input. Do NOT reconstruct its stages."}}
{{For driver: cli — the exact command(s) to run, one per stage, e.g. `just <recipe> <args>` or `bun run src/cli.ts <subcommand> <flags>`.}}

## Natural flow (awareness only — the system drives this on the skill path)
{{Ordered list of the system's stages. On the skill path this is FYI only: the skill runs its own flow and its own approval gates. On the cli path these map to the staged-delivery stages Execute Mode orchestrates.}}

## Where the agent must check / supply input
{{The checkpoints where Execute Mode must collect or relay engineer input — required arguments, file paths, selections, and (skill path) the points at which to relay the skill's [A]/[M]/[R] approval gates.}}

## Validation
After execution, validate the output against [acceptance-criteria.md](acceptance-criteria.md) (hard gates inline, soft criteria via the validator). Applies to both drivers.
