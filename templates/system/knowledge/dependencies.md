---
system: "{{system-id}}"
type: dependencies
version: 1
lastUpdated: "{{date}}"
lastUpdatedBy: build-mode
---

# Dependencies — {{system-name}}

## Runtime Dependencies
_Required for the system to execute._

| Dependency | Version | Purpose |
|-----------|---------|---------|
| {{dep}} | {{version}} | {{why}} |

## Build Dependencies
_Required for development and building._

| Dependency | Version | Purpose |
|-----------|---------|---------|
| {{dep}} | {{version}} | {{why}} |

## Optional Dependencies
_Enhance functionality but not required._

| Dependency | Version | Purpose |
|-----------|---------|---------|
| {{dep}} | {{version}} | {{why}} |

## External Services
_APIs, models, or services the system depends on._

| Service | Purpose | Failure Impact |
|---------|---------|---------------|
| {{service}} | {{why}} | {{what happens if unavailable}} |
