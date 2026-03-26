# Step 2 — Domain Knowledge Capture

## Purpose

Extract the engineer's domain expertise through a structured conversational interview. This is NOT a form — it is an adaptive conversation that digs deeper based on responses.

## Interview Protocol

### Phase 1 — Process Walkthrough
Start broad. Understand the complete workflow.

Use prompts from `prompts/domain-elicitation.md`:
- "Walk me through the complete process from start to finish."
- "What are the key steps or stages? What does each one produce?"
- "What domain-specific terms or concepts should I understand?"

Write the first pass of `domain.md` after this phase. Do not wait until the end.

### Phase 2 — Quality Deep Dive
Shift to understanding what "good" looks like.

Use prompts from `prompts/quality-elicitation.md`:
- "When you look at the final output, what makes you say 'this is good'?"
- "What would make you reject output and redo it?"
- "What's the difference between 'acceptable' and 'excellent'?"

Append findings to `domain.md` after this phase.

### Phase 3 — Edge Cases & Gotchas
Dig into what goes wrong and what is non-obvious.

- "What goes wrong most often?"
- "What are the gotchas that trip people up?"
- "What edge cases do you handle that aren't obvious from the code?"
- "What have clients complained about in the past?"

Append findings to `domain.md` after this phase.

### Phase 4 — Tacit Knowledge Extraction
This is the most valuable phase. Extract knowledge that exists only in the engineer's head.

- "What do you know about this that isn't obvious from looking at the code?"
- "If you were handing this off to someone, what would you tell them that isn't written down?"
- "What decisions did you make that depend on experience rather than documentation?"
- "Are there any 'it depends' situations? Walk me through the decision tree."

Append findings to `domain.md` after this phase.

## For Migrations

Before interviewing, read the existing system first:
1. Read source code files to understand implementation
2. Read any existing documentation (README, comments, docs/)
3. Read tests to understand expected behavior
4. Read configuration to understand dependencies

Then interview to fill gaps:
- "I see the code does X — is that the full picture, or is there more context?"
- "The tests cover A and B — are there scenarios not covered?"
- "I noticed [specific pattern] — what's the reasoning behind that?"

## Progressive Write Strategy

Write incrementally to `[system]/knowledge/domain.md`. After EACH interview phase, append new knowledge. Never buffer the entire interview in memory.

### domain.md Structure

```markdown
# [System Name] — Domain Knowledge

## Process Overview
[Complete workflow description from Phase 1]

### Steps
1. [Step name] — [what it does, what it produces]
2. [Step name] — ...

## Domain Concepts
- **[Term]**: [Definition and context]

## Quality Standards
[What "good" looks like from Phase 2]

### Hard Requirements
- [Must be true]

### Quality Signals
- [Indicators of excellence]

## Edge Cases & Gotchas
[From Phase 3]

### Common Failures
- [What goes wrong and why]

### Non-Obvious Behaviors
- [Things that aren't apparent from code]

## Tacit Knowledge
[From Phase 4]

### Decision Heuristics
- [When to do X vs Y]

### Experience-Based Rules
- [Rules learned from experience]

## Dependencies
- [Tools, APIs, services this depends on]

## Input/Output Specifications
### Inputs
- [Format, source, variations]

### Outputs
- [Format, structure, delivery]
```

## Adaptive Behavior

- If the engineer gives short answers, ask follow-up questions to draw out more detail
- If the engineer gives long, detailed answers, summarize and confirm understanding before moving on
- If a topic seems critical, spend more time on it — do not rush through
- If the engineer says "it depends," always ask for the complete decision tree
- If the engineer references external resources, note them for later review

## Output

- Fully populated `[system]/knowledge/domain.md`
- All four interview phases completed
- Knowledge written incrementally (crash-safe)
