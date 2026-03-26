---
name: adcelerate-build
description: "Build Mode — captures domain expertise through a structured interview, formalizes quality criteria and acceptance standards, scaffolds a new system sub-project, validates it, and registers it into the Adcelerate platform. Use when creating a new system or migrating an existing one."
invocation: user
---

# Adcelerate Build Mode

Build a new system by capturing domain knowledge, formalizing acceptance criteria, scaffolding the project, and registering it into the platform.

## Trigger

Use this skill when the engineer wants to:
- Build a new system from domain expertise
- Migrate an existing tool into the Adcelerate framework
- Create a new capability for the platform

## Usage

```
/adcelerate-build
/adcelerate-build migrate autocaption
```

## Arguments

- No arguments: Start a new system build from scratch
- `migrate <system-name>`: Migrate an existing system into Adcelerate

## Workflow

This skill orchestrates a 6-step pipeline. Follow [workflow.md](workflow.md) for the master workflow, and individual step files in `steps/` for detailed instructions at each stage.

### Pipeline Overview
1. **Intake** — Scope the system ([step-01-intake.md](steps/step-01-intake.md))
2. **Knowledge Capture** — Extract domain expertise ([step-02-knowledge.md](steps/step-02-knowledge.md))
3. **Criteria Formalization** — Define acceptance standards ([step-03-criteria.md](steps/step-03-criteria.md))
4. **Scaffolding** — Create the project ([step-04-scaffold.md](steps/step-04-scaffold.md))
5. **Validation** — Verify the build ([step-05-validate.md](steps/step-05-validate.md))
6. **Registration** — Register into the platform ([step-06-register.md](steps/step-06-register.md))

## Elicitation Prompts

Prompt templates for knowledge capture are in `prompts/`.
