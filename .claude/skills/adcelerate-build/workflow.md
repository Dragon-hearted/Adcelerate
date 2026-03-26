# Adcelerate Build — Master Workflow

This document defines how the 6-step Build Mode pipeline is orchestrated from intake through registration.

## Pipeline Overview

Each step produces an artifact that feeds into the next. The pipeline is sequential — no step can begin until its predecessor completes.

| Step | Name                  | Produces                                   | Depends On |
| :--- | :-------------------- | :----------------------------------------- | :--------- |
| 1    | Intake                | System name, description, scope definition | —          |
| 2    | Knowledge Capture     | `[system]/knowledge/domain.md`             | Step 1     |
| 3    | Criteria Formalization| `[system]/knowledge/acceptance-criteria.md` | Step 2     |
| 4    | Scaffolding           | Scaffolded project directory               | Steps 1–3  |
| 5    | Validation            | Validation report (pass/fail)              | Step 4     |
| 6    | Registration          | Entry in `systems.yaml`, updated `knowledge/graph.yaml` | Step 5 |

## State Management

All intermediate state is written progressively to the `[system]/knowledge/` directory. This design is **crash-safe**: if a session fails mid-pipeline, all captured work survives on disk.

### Write Strategy
- **Step 1**: Write scope to `[system]/knowledge/scope.md`
- **Step 2**: Write domain knowledge incrementally to `[system]/knowledge/domain.md` — append after each interview exchange, never buffer the whole interview in memory
- **Step 3**: Write formalized criteria to `[system]/knowledge/acceptance-criteria.md`
- **Steps 4–6**: Artifacts are the project itself and registry entries

### Resumption
If a session is interrupted, read the `[system]/knowledge/` directory to determine what was already captured and resume from the last incomplete step. Never re-ask questions whose answers are already written to disk.

## Engineer Approval Gates

The pipeline pauses at four explicit gates where the engineer must approve before continuing:

1. **After Step 1 (Intake)** — Scope confirmation: "Here is the system scope. Does this look right?"
2. **After Step 3 (Criteria)** — Criteria review: "Here are the formalized acceptance criteria. Approve, or tell me what to change."
3. **After Step 5 (Validation)** — Validation report: "Here is the validation report. Ready to register, or should we fix something?"
4. **After Step 6 (Registration)** — Registration confirmation: "System is registered. Here is what was added."

Never skip a gate. If the engineer requests changes, loop back within the current step until they approve.

## Agent Delegation

Three steps delegate specialized work to sub-agents for parallel execution and context isolation:

### Step 3 — Criteria Formalization
Delegate to the `adcelerate-formalizer` agent:
- Pass: captured `domain.md` content, elicitation prompts from `prompts/criteria-elicitation.md`
- Expect: structured `acceptance-criteria.md` with hard gates and soft criteria
- Review output before presenting to engineer

### Step 4 — Scaffolding
Delegate to the `adcelerate-scaffolder` agent:
- Pass: system name, description, knowledge summary, target directory path
- Expect: scaffolded project directory from `templates/system/`
- Verify: directory exists, `package.json` valid, `bun install` succeeds

### Step 5 — Validation
Delegate to the `adcelerate-validator` agent:
- Pass: system directory, `acceptance-criteria.md`, domain knowledge summary
- Expect: independent validation report with pass/fail on each criterion
- Combine with automated checks (tests, hard gates) for the full report

## Migration Mode

When invoked with `migrate <system-name>`:

1. **Step 1 (Intake)**: Locate the existing system. Read its code, docs, and configuration. Populate scope from what exists.
2. **Step 2 (Knowledge Capture)**: Read the existing codebase first to pre-populate knowledge. Then interview the engineer to fill gaps — focus on tacit knowledge not captured in code.
3. **Step 3 (Criteria Formalization)**: Same as new build.
4. **Step 4 (Scaffolding)**: **SKIP** — the system already exists. Instead, verify the existing directory structure is compatible with Adcelerate conventions. If adjustments are needed, propose them to the engineer.
5. **Step 5 (Validation)**: Run existing tests. Validate against formalized criteria. Flag any gaps.
6. **Step 6 (Registration)**: Same as new build.

## Error Recovery

If any step fails:
1. Report the failure clearly: what step, what happened, what was attempted
2. Preserve all state written so far (crash-safe writes mean nothing is lost)
3. Offer the engineer three options:
   - **Retry**: Re-run the failed step from its last checkpoint
   - **Skip**: Move to the next step (only if the failed step's output is not strictly required)
   - **Abort**: Stop the pipeline, preserving all progress for later resumption
4. Never silently swallow errors or continue past a failure without engineer acknowledgment

## Output

A successful pipeline run produces:
- A fully scaffolded (or migrated) system directory
- Populated `knowledge/` directory with `scope.md`, `domain.md`, `acceptance-criteria.md`
- A validated build that passes all hard gate criteria
- A registered entry in `systems.yaml` with all required fields
- Updated `knowledge/graph.yaml` with system relationships
- Engineer confirmation at every gate
