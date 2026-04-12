---
description: Quick-start agent understanding of the codebase structure
---

# Purpose

Quickly orient an agent to understand this codebase by listing all tracked files, reading the README, and loading all Claude configuration files.

## Workflow

1. Run `git ls-files` to get the complete list of tracked files
2. Read `README.md`
3. Read `justfile`
4. Read `ai_docs/cc_hooks.md` if it exists
5. Read `.claude/settings.json`
6. Read all files in `.claude/hooks/`
7. Read all files in `.claude/commands/`
8. Read `systems.yaml` for system registry
9. Read `knowledge/graph.yaml` for dependency topology
10. If `graphify-out/GRAPH_REPORT.md` exists, read it for code architecture overview
11. Follow the `Report` section

## Report

Report your understanding of the codebase including:
- Project structure and systems
- Available skills, agents, and commands
- System dependencies and relationships
- Code architecture insights from graphify (if available): god nodes, communities, suggested queries
