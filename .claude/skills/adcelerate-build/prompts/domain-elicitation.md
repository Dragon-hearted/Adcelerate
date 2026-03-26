# Domain Elicitation Prompts

Use these prompts during Step 2 (Knowledge Capture) to extract domain expertise from the engineer. These are conversation starters — adapt and follow up based on responses.

## Process Understanding

- "Walk me through the complete process from start to finish. If you were doing this manually right now, what would you do first?"
- "What are the key steps or stages? What does each one produce?"
- "Is this a linear pipeline, or are there branches and decision points?"
- "What triggers this process? How does work arrive?"
- "How long does a typical run take? What about edge cases?"

## Domain Vocabulary

- "What domain-specific terms or concepts should I understand?"
- "Are there any terms that mean something different in this context than they normally would?"
- "What acronyms or shorthand does your team use?"

## Context & Purpose

- "How does this connect to your clients' needs?"
- "Where does this fit in the broader workflow? What comes before and after?"
- "Who are the stakeholders? Who cares about the output?"
- "What business value does this provide?"

## Dependencies & Infrastructure

- "What tools, APIs, or services does this depend on?"
- "Are there external services that could go down or change?"
- "What environment or configuration does this need to run?"
- "Are there rate limits, quotas, or resource constraints?"

## Input Specifications

- "What's the typical input? Walk me through a concrete example."
- "What variations exist in the input? What's the range of what you see?"
- "What makes an input 'difficult' or unusual?"
- "How do you handle bad or incomplete input?"

## Output Specifications

- "What's the expected output format and structure?"
- "Show me an example of good output. What makes it good?"
- "What are the constraints on the output? (size, format, timing, etc.)"
- "How is the output delivered or consumed downstream?"
