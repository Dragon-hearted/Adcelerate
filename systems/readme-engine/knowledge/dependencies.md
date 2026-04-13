---
system: "readme-engine"
type: dependencies
version: 1
lastUpdated: "2026-04-13"
lastUpdatedBy: build-mode
---

# Dependencies — ReadmeEngine

## Runtime Dependencies
_Required for the system to execute._

| Dependency | Version | Purpose |
|-----------|---------|---------|
| js-yaml | ^4.1.0 | Parse YAML files (systems.yaml, graph.yaml, library.yaml) |
| bun | ^1.0.0 | JavaScript runtime — file I/O via Bun.file(), child processes via Bun.spawn() |

## Build Dependencies
_Required for development and building._

| Dependency | Version | Purpose |
|-----------|---------|---------|
| typescript | ^5.7.0 | Type checking and compilation |
| @biomejs/biome | ^1.9.0 | Linting and formatting |
| @types/bun | latest | Bun runtime type definitions |
| @types/js-yaml | ^4.0.9 | TypeScript types for js-yaml |

## Optional Dependencies
_Enhance functionality but not required._

| Dependency | Version | Purpose |
|-----------|---------|---------|
| glob | latest | Advanced file pattern matching (currently uses Bun.glob instead) |

## External Services
_APIs, models, or services the system depends on._

| Service | Purpose | Failure Impact |
|---------|---------|---------------|
| Local filesystem | Read knowledge sources, write README.md files | System cannot operate without filesystem access |
| Git CLI | Read commit history for changelog sections | Changelog sections will be empty if git unavailable |
