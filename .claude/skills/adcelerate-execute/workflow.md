# Adcelerate Execute Mode — Workflow

This document defines the complete execution workflow for routing tasks to registered systems, managing staged delivery with approval gates, and validating output against acceptance criteria.

---

## 1. Task Receipt (FR14)

When the engineer invokes `/adcelerate-execute <task description>`:

1. **Parse the task description** — extract the natural language intent from the CLI input.
2. **Identify inputs** — detect any attached files, data references, or contextual information the engineer provided (file paths, URLs, inline data).
3. **Normalize the request** — produce a structured task object:
   ```yaml
   task:
     raw_input: "{{engineer's original text}}"
     parsed_intent: "{{what needs to be done}}"
     inputs: []        # list of file paths, data, or context
     timestamp: "{{ISO date}}"
   ```

If the task description is ambiguous or missing critical information, ask the engineer to clarify before proceeding.

---

## 2. System Matching (Decision 2b)

### 2a. Load the Registry

Read `systems.yaml` at the project root. Filter to systems where `status: active`.

### 2b. Structured Matching (scored)

Compare the parsed task against each active system's metadata. Score each system using the following priority:

| Match Type | Score | How |
|---|---|---|
| **Exact task_type match** | 100 | Task intent matches a value in the system's `task_types` list |
| **Input/output type match** | 75 | Attached input file types match `input_types`, or desired output matches `output_types` |
| **Domain tag match** | 50 | Keywords in the task align with the system's `domain_tags` |
| **Description similarity** | 25 | Natural language similarity between task and system `description` |

### 2c. Route Decision

- **Single clear match** (top score >= 75, and >= 25 points ahead of runner-up): Route directly to that system. Inform the engineer which system was selected and why.
- **Multiple competitive matches** (two or more systems within 25 points of each other): Present the top candidates to the engineer with their scores and a brief rationale. Ask the engineer to confirm which system to use.
- **No structured match** (all scores < 50): Fall back to natural language matching — compare the full task description against each system's `description` field using semantic similarity.
- **Still no match**: Report to the engineer that no registered system handles this task type. Suggest:
  - Checking available systems with `/adcelerate-list`
  - Registering a new system with `/adcelerate-register`

---

## 3. Routing

Once a system is matched, read **only** the system's execution manifest:

1. **Load the execution manifest** — read `[system]/knowledge/execution.md`. This single how-to-run manifest is the authoritative source for running the system. Do NOT read `index.md` for routing, and do NOT reconstruct stages from the `stages:` array in `systems.yaml` — the manifest tells the executor everything it needs.
2. **Read the manifest's frontmatter** to determine the execution strategy:
   - `driver` — `skill` or `cli`
   - `skill` — the skill to invoke (skill driver)
   - `entry` — the command template (cli driver)
   - `mode` — `delegate` or `orchestrate`
   - `gates` — `native` or `executor`
3. **Read the manifest body** — `## Invocation`, `## Natural flow`, and `## Where the agent must check / supply input` — to learn how to invoke the system and which checkpoints require engineer input.

Report to the engineer:
```
System: {{system.name}}
Driver: {{driver}} ({{mode}}, gates: {{gates}})
Starting execution...
```

Then proceed to the **Driver Branch**.

---

## 3.5 Driver Branch

Branch on the manifest's `driver`:

### `driver: skill` (mode: delegate, gates: native)

The system drives its own flow. The executor delegates and relays — it does NOT reconstruct or perform stages.

1. **Invoke the named skill** (`skill:` from the manifest frontmatter) via the **Skill tool**, passing the engineer's task input.
2. **Let the skill run its own natural flow and its own [A]/[M]/[R] approval gates.** The skill owns its pipeline and its gates end-to-end.
3. The executor's only job is to **relay engineer input at the checkpoints** listed in the manifest's "Where the agent must check / supply input" section (e.g. client selection, missing brand/platform/audience, the skill's generation/visual-direction/sheet approval gates).
4. **Skip section 4 (Staged Delivery)** entirely. Do NOT reconstruct or re-run the stages — the skill already did.
5. When the skill completes, proceed to **section 5 (Validation)**.

### `driver: cli` (mode: orchestrate, gates: executor)

The executor orchestrates staged delivery, running the command(s) from `execution.md`.

1. Use the per-stage command(s) from the manifest's `## Invocation` section and the stage list from `## Natural flow`.
2. Proceed to **section 4 (Staged Delivery)**, running each stage's command and gating after each.

---

## 4. Staged Delivery (Decision 4a, FR19-FR20)

> **Applies to the `cli` / `orchestrate` path only.** Skill-driven systems run their own flow and gates (see section 3.5) and skip this section entirely.

Execute the system's pipeline **one stage at a time**, with an approval gate after each stage. Run each stage using the command(s) from the manifest's `## Invocation` section.

### For each stage in the pipeline:

#### 4a. Execute the Stage

Run the stage using the system's knowledge and the accumulated context from prior stages. Produce the stage output.

#### 4b. Present Output to Engineer

Display the stage output with clear formatting:
```
--- Stage: {{stage_name}} ({{current}}/{{total}}) ---

{{stage output}}

--- End Stage ---
```

#### 4c. Approval Gate

Prompt the engineer for a decision:

- **APPROVE** — accept the stage output, proceed to the next stage.
- **MODIFY** — engineer provides feedback on what to change. Re-run the stage incorporating the feedback. Present the revised output and prompt again.
- **REJECT** — abort the entire execution. Report what stages were completed and what was produced so far.

#### 4d. Accumulate Context

On approval, add the stage output to the execution context so subsequent stages can build on it.

### Important rules:
- Never skip a stage.
- Never auto-approve. Every stage transition requires explicit engineer approval.
- If a stage is re-run after MODIFY feedback, count it as the same stage (do not increment the stage counter).

---

## 5. Validation (Decision 4b, FR21-FR23)

**This section applies to BOTH drivers.** Once the work is complete — after the skill finishes (skill path) or after all stages are approved (cli path) — validate the final output before delivery.

### 5a. Hard Gate Check (inline)

1. Read `[system]/knowledge/acceptance-criteria.md` for the matched system.
2. Evaluate the final output against each **hard gate** criterion. Hard gates are binary: pass or fail.
3. **If any hard gate fails**:
   - Report all failures to the engineer with specifics on what failed and why.
   - Do NOT proceed to soft criteria evaluation.
   - Ask the engineer how to proceed (re-run a stage, modify input, or abort).

### 5b. Soft Criteria Review

If all hard gates pass:

1. Delegate validation to the `adcelerate-validator` agent with a **fresh context window** to avoid bias. Pass:
   - The system ID
   - The final output
   - The acceptance criteria
2. The validator returns a structured report scoring each soft criterion.

### 5c. Present Validation Report

Show the combined validation report to the engineer:
```
--- Validation Report ---
System: {{system.name}}

Hard Gates: {{passed}}/{{total}} PASSED

Soft Criteria:
  - {{criterion_1}}: {{score}} — {{notes}}
  - {{criterion_2}}: {{score}} — {{notes}}

Overall: {{PASS / REVIEW RECOMMENDED}}
--- End Report ---
```

### 5d. Engineer Override (FR23)

The engineer can **override** any validation result. Their judgment is final. If the engineer approves despite validation warnings, proceed to delivery. Log the override.

---

## 6. Error Handling (Decision 4c)

Errors during execution are handled in three escalating tiers.

### Tier 1 — Inline Recovery

On transient or recoverable errors during any stage:

- Retry the operation automatically.
- **Retry budget: 3 attempts maximum.**
- Between retries, adjust approach if possible (e.g., simplify input, use alternate method).
- If retry succeeds, continue as normal — report the recovery to the engineer as an informational note.

### Tier 2 — Diagnostic Escalation

If the retry budget is exhausted and the error persists:

1. **Do not silently fail.** Produce a structured error report:

```yaml
---
type: error-report
system: "{{system-id}}"
stage: "{{stage-name}}"
timestamp: "{{ISO date}}"
retry_budget: 3
retries_used: "{{count}}"
---
## Error Summary
{{what failed}}

## What Was Tried
1. {{attempt 1 + result}}
2. {{attempt 2 + result}}
3. {{attempt 3 + result}}

## Suspected Root Cause
{{diagnosis}}

## Recommended Actions
- [ ] Retry with modified input
- [ ] Run /adcelerate-diagnose for full system diagnosis
- [ ] Abort task
```

2. Present the error report to the engineer and ask which action to take.

### Tier 3 — Full Diagnosis Handoff

If the engineer chooses to run a full diagnosis:
- Hand off to `/adcelerate-diagnose` with the error report as context.
- The diagnose skill will perform deep investigation and return findings.

---

## 7. Final Delivery

After all stages are approved and validation is complete:

### 7a. Present Final Output

Display the complete output alongside the validation report:
```
========================================
  FINAL DELIVERY — {{system.name}}
========================================

{{final output}}

--- Validation Summary ---
Hard Gates: {{passed}}/{{total}} PASSED
Soft Criteria: {{summary}}
{{any overrides noted}}
--- End Validation Summary ---
```

### 7b. Final Approval Gate

Ask the engineer for final approval of the complete delivery:
- **APPROVE** — accept delivery, proceed to logging.
- **REJECT** — abort. Ask if the engineer wants to re-run specific stages or start over.

### 7c. On Approval

1. **Emit event**: `adcelerate.execute.delivered` with payload:
   ```yaml
   event: adcelerate.execute.delivered
   system: "{{system-id}}"
   task: "{{parsed_intent}}"
   stages_completed: "{{count}}"
   validation: "{{PASS / OVERRIDE}}"
   timestamp: "{{ISO date}}"
   ```
2. **Log execution**: Append an entry to `[system]/knowledge/history.md`:
   ```markdown
   ## {{ISO date}} — {{parsed_intent}}
   - **System**: {{system.name}}
   - **Stages**: {{stage list with pass/modify counts}}
   - **Validation**: {{result + any overrides}}
   - **Delivered**: Yes
   ```

---

## Key Principles

- **Engineer-as-CEO**: Human approval is required at every stage transition and at final delivery. Never auto-approve. Never skip an approval gate.
- **No silent failures**: Every error produces a visible, actionable report. The engineer always knows what happened and what their options are.
- **Closed-loop error handling**: Agents handle errors internally within the retry budget before escalating. The engineer only sees errors that require their decision.
- **Fresh-context validation**: Soft criteria validation runs in a separate agent context to prevent bias from the execution context.
- **Override sovereignty**: The engineer can override any validation result. Their judgment is the final authority.
