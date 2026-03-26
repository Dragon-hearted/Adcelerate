# Step 3 — Acceptance Criteria Formalization

## Purpose

Convert the captured domain knowledge into structured, actionable acceptance criteria that can be used for automated and human validation.

## Process

### 1. Review Captured Knowledge

Read `[system]/knowledge/domain.md` in full. Identify:
- Statements about what MUST be true (hard requirements)
- Statements about what SHOULD be true (quality signals)
- Measurable checks vs. subjective judgments
- Anything the engineer emphasized or repeated

### 2. Delegate to Formalizer Agent

Delegate to the `adcelerate-formalizer` agent with:
- Full contents of `[system]/knowledge/domain.md`
- Elicitation prompts from `prompts/criteria-elicitation.md`
- System name and description from `[system]/knowledge/scope.md`

The formalizer produces a structured `acceptance-criteria.md` with two categories:

#### Hard Gates
Binary, checklist-format criteria. These are pass/fail — no gray area.

Format:
```markdown
## Hard Gates

- [ ] [Criterion description — must be verifiable]
- [ ] [Criterion description]
- [ ] [Criterion description]
```

Examples:
- `[ ] Output file exists at the expected path`
- `[ ] Output format matches the declared schema`
- `[ ] Processing completes within the configured timeout`
- `[ ] No unhandled errors in the execution log`

#### Soft Criteria
Prose-format criteria with **bold** quality signals. These require human judgment.

Format:
```markdown
## Soft Criteria

### [Category Name]
[Description of what quality looks like in this area. **Key quality signal** should be evident. The output should feel **polished and intentional**, not mechanical.]

### [Category Name]
[Description. **Another quality signal** to look for.]
```

Examples:
- "Captions should read **naturally and conversationally**, not like machine-generated text. They should match the **brand voice** of the client."
- "Scene transitions should feel **smooth and intentional**. Hard cuts are acceptable when the content calls for it, but jarring transitions indicate a quality issue."

### 3. Review Formalizer Output

Before presenting to the engineer, review the formalizer's output:
- Are all hard gates actually binary/verifiable?
- Do soft criteria capture the engineer's stated quality standards?
- Is anything from `domain.md` missing?
- Are criteria specific enough to be actionable?

If the output is insufficient, provide feedback to the formalizer and request a revision.

### 4. Write to Disk

Write the approved criteria to `[system]/knowledge/acceptance-criteria.md`:

```markdown
# [System Name] — Acceptance Criteria

## Overview
[Brief summary of what these criteria cover]

## Hard Gates
[Checklist items from formalizer]

## Soft Criteria
[Prose items from formalizer]

## Validation Notes
[Any special instructions for how to validate these criteria]
```

## Engineer Review Gate

Present the formalized criteria to the engineer:

> "Here are the formalized acceptance criteria for **[system-name]**. Hard gates are binary pass/fail checks. Soft criteria describe quality standards that need human judgment."
>
> [Show the full criteria document]
>
> "Does this capture your standards? Anything to add, remove, or adjust?"

### Iteration Loop

If the engineer requests changes:
1. Note the requested changes
2. Update `acceptance-criteria.md` directly (do not re-run the full formalizer unless the changes are extensive)
3. Present the updated criteria
4. Repeat until the engineer explicitly approves

Do NOT proceed to Step 4 until the engineer explicitly approves the criteria.

## Output

- Approved `[system]/knowledge/acceptance-criteria.md`
- Hard gates: binary checklist
- Soft criteria: prose with bold quality signals
- Engineer approval to proceed
