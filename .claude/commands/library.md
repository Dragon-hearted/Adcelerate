---
description: Manage and query the Adcelerate library catalog
argument-hint: [list|search|sync|route] [query]
---

# Library

Manage the Adcelerate library catalog (`library.yaml`). Use this to list available skills/agents/commands, search for the right tool, sync the catalog, or route a task to the best tool.

## Variables

ACTION: $1
QUERY: $2

## Workflow

1. If ACTION is empty or "list":
   - Read `library.yaml`
   - Display a formatted summary table of all entries grouped by type (skills, agents, commands)
   - Show: name, type, trigger (truncated to 60 chars), source

2. If ACTION is "search":
   - Read `library.yaml`
   - Search all entries (name, description, trigger) for QUERY
   - Display matching entries with full details
   - If no matches, suggest `/find-skills {QUERY}` to search the external ecosystem

3. If ACTION is "sync":
   - Run `uv run .claude/hooks/library_sync.py` with a SessionStart event piped to stdin
   - Report whether library.yaml was updated or unchanged
   - Show the counts: X skills, Y agents, Z commands

4. If ACTION is "route":
   - Use the @task-router agent with QUERY as the prompt
   - The agent will read library.yaml and recommend the best skill/agent/command

## Report

- For "list": Display a clean markdown table
- For "search": Show matching entries with highlights
- For "sync": Show update status and counts
- For "route": Show the task-router's recommendation
