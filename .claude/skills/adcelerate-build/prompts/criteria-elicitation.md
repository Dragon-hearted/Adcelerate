# Criteria Elicitation Prompts

Use these prompts during Step 3 (Criteria Formalization) to help the engineer formalize acceptance criteria. These prompts bridge the gap between informal domain knowledge and structured, actionable criteria.

## Hard Gate Identification

- "What MUST be true for any output? If this isn't true, the output is rejected no matter what."
- "What are the absolute deal-breakers? Things that are never acceptable?"
- "What would be a deal-breaker if missing?"
- "Are there regulatory, legal, or contractual requirements that must be met?"
- "What checks could be automated — things a script could verify?"

## Soft Criteria Identification

- "What SHOULD be true but depends on context?"
- "What are the 'it depends' quality factors?"
- "What requires a human eye to evaluate?"
- "What separates technically correct output from actually good output?"

## Measurability

- "What are the measurable checks? (File exists, format valid, timing correct, size within range)"
- "Can we put numbers on any quality standards? (Resolution, duration, word count, etc.)"
- "What can be checked programmatically vs. what needs human review?"
- "Are there reference outputs we can compare against?"

## Judgment Calls

- "What requires human judgment? (Tone, style, composition, 'feel')"
- "How do you make those judgment calls? Can you describe your mental checklist?"
- "Could you teach someone your judgment criteria, or is it pure intuition?"
- "Are there examples of 'I know it when I see it' quality factors?"

## Minimum Viability

- "What's the minimum viable quality for a client deliverable?"
- "What would you ship if you were under a tight deadline?"
- "What are the non-negotiable standards even under time pressure?"
- "What's the cost of shipping below your quality bar? (Client trust, rework, reputation)"

## Priority & Weighting

- "If you had to rank the criteria, what matters most?"
- "Which quality factors do clients notice first?"
- "What's the order of importance: accuracy, speed, polish, consistency?"
- "Are there criteria that are important but rarely fail? (Worth tracking but low risk)"
