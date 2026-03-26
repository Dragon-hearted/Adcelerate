# Step 1 — Intake & Scope Definition

## Purpose

Establish what system we are building, what it does, who it serves, and what is in and out of scope. This is the foundation for every subsequent step.

## For New Builds

Ask the engineer:

1. **What system are we building?**
   - What does it do in one sentence?
   - What problem does it solve?

2. **Who does it serve?**
   - Internal team use, client-facing, or both?
   - What role or workflow does it fit into?

3. **What does it produce?**
   - What are the outputs? (files, API responses, rendered media, etc.)
   - What format are they in?

4. **What are the inputs?**
   - What does the system consume? (files, parameters, API data, etc.)
   - What triggers a run?

5. **Scope boundaries**
   - What is explicitly IN scope for this build?
   - What is explicitly OUT of scope?
   - Are there future phases or features we are deferring?

## For Migrations

Ask the engineer:

1. **What existing tool are we migrating?**
   - Where does it live? (directory path, repo, external service)
   - What language/runtime is it written in?

2. **What state is it in?**
   - Working and in use? Prototype? Broken?
   - Are there existing tests?
   - Is there documentation?

3. **What changes are needed?**
   - Migrating as-is, or improving during migration?
   - Any known issues to fix?

4. **Scope boundaries** — same as new builds

## Derive System Identity

From the engineer's answers, derive:
- **System name**: kebab-case, concise, descriptive (e.g., `auto-caption`, `scene-detector`, `brand-kit`)
- **Description**: One to two sentences summarizing what the system does
- **Scope definition**: Bullet list of what is in scope and what is out

## Write State

Create the knowledge directory and write scope:

```
[system]/knowledge/scope.md
```

Contents:
```markdown
# [System Name] — Scope

## Description
[One to two sentence description]

## In Scope
- [item]
- [item]

## Out of Scope
- [item]
- [item]

## Inputs
- [input type and source]

## Outputs
- [output type and format]

## Target Users
- [who uses this]
```

## Engineer Approval Gate

Present the scope document to the engineer:

> "Here is the scope for **[system-name]**. Does this look right, or would you like to adjust anything before we move into knowledge capture?"

Do NOT proceed to Step 2 until the engineer explicitly approves.

## Output

- System name (kebab-case)
- System description
- Scope definition written to `[system]/knowledge/scope.md`
- Engineer approval to proceed
