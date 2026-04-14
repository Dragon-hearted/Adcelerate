---
system: "prompt-writer"
type: dependencies
version: 1
lastUpdated: "2026-04-14"
lastUpdatedBy: build-mode
---

# Dependencies — PromptWriter

## Runtime Dependencies
_Required for the system to execute._

| Dependency | Version | Purpose |
|-----------|---------|---------|
| js-yaml | ^4.1.0 | Parse YAML frontmatter in model files and _registry.md |
| bun | ^1.0.0 | JavaScript runtime — file I/O, CLI execution |

## Build Dependencies
_Required for development and building._

| Dependency | Version | Purpose |
|-----------|---------|---------|
| typescript | ^5.7.0 | Type checking and compilation |
| @biomejs/biome | ^1.9.0 | Linting and formatting |
| @types/bun | latest | Bun runtime type definitions |
| @types/js-yaml | ^4.0.9 | TypeScript types for js-yaml |

## External Services
_APIs, models, or services the system depends on._

| Service | Purpose | Failure Impact |
|---------|---------|---------------|
| Local filesystem | Read model knowledge files, schema template, registry | System cannot operate without filesystem access |

## System Dependencies
_Other Adcelerate systems this system depends on or is depended on by._

| System | Relationship | Purpose |
|--------|-------------|---------|
| SceneBoard | depended-on-by | SceneBoard Stage 6 references prompt-writer model knowledge for prompt generation |
| ImageEngine | shared-dependency | Both systems reference model constraints; ImageEngine handles API calls, prompt-writer handles prompt composition |
| Pinboard | depended-on-by | Future consumer for image generation prompts |
