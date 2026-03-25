# Claude Code Hooks Reference - Complete Documentation

## Overview

Hooks are user-defined shell commands, HTTP endpoints, or LLM prompts that execute automatically at specific points in Claude Code's lifecycle. This reference covers event schemas, configuration options, JSON input/output formats, and advanced features.

## Hook Lifecycle

Hooks fire at specific points during a Claude Code session. When an event fires and a matcher matches, Claude Code passes JSON context to your hook handler. Some events fire once per session, others fire repeatedly in the agentic loop.

### Event Firing Points

| Event | When it fires |
|:------|:--------------|
| `SessionStart` | When a session begins or resumes |
| `UserPromptSubmit` | When you submit a prompt, before Claude processes it |
| `PreToolUse` | Before a tool call executes. Can block it |
| `PermissionRequest` | When a permission dialog appears |
| `PostToolUse` | After a tool call succeeds |
| `PostToolUseFailure` | After a tool call fails |
| `Notification` | When Claude Code sends a notification |
| `SubagentStart` | When a subagent is spawned |
| `SubagentStop` | When a subagent finishes |
| `Stop` | When Claude finishes responding |
| `StopFailure` | When the turn ends due to an API error |
| `TeammateIdle` | When an agent team teammate is about to go idle |
| `TaskCompleted` | When a task is being marked as completed |
| `InstructionsLoaded` | When a CLAUDE.md or `.claude/rules/*.md` file is loaded |
| `ConfigChange` | When a configuration file changes during a session |
| `WorktreeCreate` | When a worktree is being created |
| `WorktreeRemove` | When a worktree is being removed |
| `PreCompact` | Before context compaction |
| `PostCompact` | After context compaction completes |
| `Elicitation` | When an MCP server requests user input |
| `ElicitationResult` | After a user responds to an MCP elicitation |
| `SessionEnd` | When a session terminates |

## Hook Resolution Example

A `PreToolUse` hook that blocks destructive shell commands:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/block-rm.sh"
          }
        ]
      }
    ]
  }
}
```

Script that denies `rm -rf` commands:

```bash
#!/bin/bash
# .claude/hooks/block-rm.sh
COMMAND=$(jq -r '.tool_input.command')

if echo "$COMMAND" | grep -q 'rm -rf'; then
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: "Destructive command blocked by hook"
    }
  }'
else
  exit 0  # allow the command
fi
```

## Configuration

Hooks are defined in JSON settings files with three levels of nesting:

1. **Hook event** - the lifecycle point (e.g., `PreToolUse`)
2. **Matcher group** - filter when it fires (e.g., "only for Bash")
3. **Hook handlers** - the command/endpoint/prompt that runs

### Hook Locations

| Location | Scope | Shareable |
|:---------|:------|:----------|
| `~/.claude/settings.json` | All projects | No |
| `.claude/settings.json` | Single project | Yes, can be committed |
| `.claude/settings.local.json` | Single project | No, gitignored |
| Managed policy settings | Organization-wide | Yes, admin-controlled |
| Plugin `hooks/hooks.json` | When plugin enabled | Yes |
| Skill/agent frontmatter | Component lifetime | Yes |

### Matcher Patterns

The `matcher` field is a regex string filtering when hooks fire. Use `"*"`, `""`, or omit to match all occurrences.

| Event | Matches on | Example values |
|:------|:-----------|:----------------|
| `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `PermissionRequest` | tool name | `Bash`, `Edit\|Write`, `mcp__.*` |
| `SessionStart` | session start method | `startup`, `resume`, `clear`, `compact` |
| `SessionEnd` | session end reason | `clear`, `resume`, `logout`, `prompt_input_exit` |
| `Notification` | notification type | `permission_prompt`, `idle_prompt`, `auth_success` |
| `SubagentStart`, `SubagentStop` | agent type | `Bash`, `Explore`, `Plan`, custom names |
| `PreCompact`, `PostCompact` | compaction trigger | `manual`, `auto` |
| `ConfigChange` | configuration source | `user_settings`, `project_settings`, `local_settings`, `policy_settings`, `skills` |
| `StopFailure` | error type | `rate_limit`, `authentication_failed`, `billing_error`, `invalid_request`, `server_error`, `max_output_tokens`, `unknown` |
| `InstructionsLoaded` | load reason | `session_start`, `nested_traversal`, `path_glob_match`, `include`, `compact` |
| `Elicitation`, `ElicitationResult` | MCP server name | your configured MCP server names |

#### Match MCP Tools

MCP tools follow the naming pattern `mcp__<server>__<tool>`:

- `mcp__memory__create_entities`: Memory server's create entities tool
- `mcp__filesystem__read_file`: Filesystem server's read file tool
- `mcp__github__search_repositories`: GitHub server's search tool

Use regex patterns:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "mcp__memory__.*",
        "hooks": [
          {
            "type": "command",
            "command": "echo 'Memory operation initiated' >> ~/mcp-operations.log"
          }
        ]
      },
      {
        "matcher": "mcp__.*__write.*",
        "hooks": [
          {
            "type": "command",
            "command": "/home/user/scripts/validate-mcp-write.py"
          }
        ]
      }
    ]
  }
}
```

### Hook Handler Types

Four types of handlers:

#### Command Hooks (`type: "command"`)

Run a shell command. Script receives event JSON on stdin, communicates results via exit codes and stdout.

```json
{
  "type": "command",
  "command": "./scripts/security-check.sh",
  "timeout": 600,
  "async": false,
  "statusMessage": "Checking security..."
}
```

#### HTTP Hooks (`type: "http"`)

Send event JSON as HTTP POST request. Endpoint communicates results through response body.

```json
{
  "type": "http",
  "url": "http://localhost:8080/hooks/pre-tool-use",
  "timeout": 30,
  "headers": {
    "Authorization": "Bearer $MY_TOKEN"
  },
  "allowedEnvVars": ["MY_TOKEN"]
}
```

#### Prompt Hooks (`type: "prompt"`)

Send prompt to Claude model for single-turn evaluation.

```json
{
  "type": "prompt",
  "prompt": "Should this Bash command be allowed? $ARGUMENTS",
  "model": "claude-opus",
  "timeout": 30
}
```

#### Agent Hooks (`type: "agent"`)

Spawn subagent that can use tools to verify conditions.

```json
{
  "type": "agent",
  "prompt": "Verify this operation is safe: $ARGUMENTS",
  "timeout": 60
}
```

### Common Hook Fields

| Field | Required | Description |
|:------|:---------|:------------|
| `type` | yes | `"command"`, `"http"`, `"prompt"`, or `"agent"` |
| `timeout` | no | Seconds before canceling. Defaults: 600 (command), 30 (prompt), 60 (agent) |
| `statusMessage` | no | Custom spinner message |
| `once` | no | If `true`, runs only once per session then removed (skills only) |

### Reference Scripts by Path

Use environment variables to reference hook scripts:

- `$CLAUDE_PROJECT_DIR`: project root
- `${CLAUDE_PLUGIN_ROOT}`: plugin's installation directory
- `${CLAUDE_PLUGIN_DATA}`: plugin's persistent data directory

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/check-style.sh"
          }
        ]
      }
    ]
  }
}
```

### Hooks in Skills and Agents

Define hooks in skill/agent frontmatter:

```yaml
---
name: secure-operations
description: Perform operations with security checks
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/security-check.sh"
---
```

### The `/hooks` Menu

Type `/hooks` in Claude Code to open a read-only browser for your configured hooks. Shows every hook event with counts, lets you drill into matchers, and displays full details of each handler.

### Disable or Remove Hooks

- **Remove**: delete entry from settings JSON file
- **Temporarily disable**: set `"disableAllHooks": true` in settings file

Direct edits to hooks in settings files are normally picked up automatically by the file watcher.

## Hook Input and Output

Command hooks receive JSON on stdin and communicate results through exit codes, stdout, and stderr. HTTP hooks receive the same JSON as POST request body.

### Common Input Fields

All hook events receive:

| Field | Description |
|:------|:------------|
| `session_id` | Current session identifier |
| `transcript_path` | Path to conversation JSON |
| `cwd` | Current working directory |
| `permission_mode` | Current permission mode: `"default"`, `"plan"`, `"acceptEdits"`, `"dontAsk"`, or `"bypassPermissions"` |
| `hook_event_name` | Name of the event that fired |

When running with `--agent` or inside a subagent:

| Field | Description |
|:------|:------------|
| `agent_id` | Unique identifier for the subagent |
| `agent_type` | Agent name (e.g., `"Explore"`) |

Example `PreToolUse` input for Bash:

```json
{
  "session_id": "abc123",
  "transcript_path": "/home/user/.claude/projects/.../transcript.jsonl",
  "cwd": "/home/user/my-project",
  "permission_mode": "default",
  "hook_event_name": "PreToolUse",
  "tool_name": "Bash",
  "tool_input": {
    "command": "npm test"
  }
}
```

### Exit Code Output

- **Exit 0**: Success. Claude Code parses stdout for JSON output fields.
- **Exit 2**: Blocking error. Claude Code ignores stdout/JSON, uses stderr text as error message.
- **Any other exit code**: Non-blocking error. Stderr shown in verbose mode, execution continues.

Example blocking script:

```bash
#!/bin/bash
command=$(jq -r '.tool_input.command' < /dev/stdin)

if [[ "$command" == rm* ]]; then
  echo "Blocked: rm commands are not allowed" >&2
  exit 2  # Blocking error
fi

exit 0  # Success
```

### Exit Code 2 Behavior Per Event

| Hook event | Can block? | What happens on exit 2 |
|:-----------|:-----------|:----------------------|
| `PreToolUse` | Yes | Blocks the tool call |
| `PermissionRequest` | Yes | Denies the permission |
| `UserPromptSubmit` | Yes | Blocks prompt processing |
| `Stop` | Yes | Prevents Claude from stopping |
| `SubagentStop` | Yes | Prevents subagent from stopping |
| `TeammateIdle` | Yes | Prevents teammate from going idle |
| `TaskCompleted` | Yes | Prevents task from being marked complete |
| `ConfigChange` | Yes | Blocks configuration change |
| `StopFailure` | No | Output ignored |
| `PostToolUse` | No | Shows stderr to Claude |
| `PostToolUseFailure` | No | Shows stderr to Claude |
| `Notification` | No | Shows stderr to user only |
| `SubagentStart` | No | Shows stderr to user only |
| `SessionStart` | No | Shows stderr to user only |
| `SessionEnd` | No | Shows stderr to user only |
| `PreCompact` | No | Shows stderr to user only |
| `PostCompact` | No | Shows stderr to user only |
| `Elicitation` | Yes | Denies the elicitation |
| `ElicitationResult` | Yes | Blocks the response |
| `WorktreeCreate` | Yes | Worktree creation fails |
| `WorktreeRemove` | No | Failures logged in debug mode |
| `InstructionsLoaded` | No | Exit code ignored |

### HTTP Response Handling

- **2xx with empty body**: success (equivalent to exit 0)
- **2xx with plain text body**: success, text added as context
- **2xx with JSON body**: success, parsed using JSON output schema
- **Non-2xx status**: non-blocking error, execution continues
- **Connection failure or timeout**: non-blocking error, execution continues

To block a tool call or deny permission via HTTP, return 2xx with JSON containing appropriate decision fields.

### JSON Output

Exit codes allow or block, but JSON output gives finer control. Exit 0 and print JSON to stdout for structured control.

> **Note**: Choose one approach per hook: either use exit codes alone, or exit 0 with JSON. JSON is only processed on exit 0.

Universal fields work across all events:

| Field | Default | Description |
|:------|:--------|:------------|
| `continue` | `true` | If `false`, Claude stops processing entirely |
| `stopReason` | none | Message shown when `continue` is `false` |
| `suppressOutput` | `false` | If `true`, hides stdout from verbose mode |
| `systemMessage` | none | Warning message shown to user |

Stop entirely:

```json
{ "continue": false, "stopReason": "Build failed, fix errors before continuing" }
```

#### Decision Control Patterns

Different events use different patterns:

| Events | Pattern | Key fields |
|:-------|:--------|:-----------|
| `UserPromptSubmit`, `PostToolUse`, `PostToolUseFailure`, `Stop`, `SubagentStop`, `ConfigChange` | Top-level `decision` | `decision: "block"`, `reason` |
| `TeammateIdle`, `TaskCompleted` | Exit code or `continue: false` | Exit 2 or JSON |
| `PreToolUse` | `hookSpecificOutput` | `permissionDecision`, `permissionDecisionReason` |
| `PermissionRequest` | `hookSpecificOutput` | `decision.behavior` |
| `WorktreeCreate` | stdout path | Hook prints absolute path |
| `Elicitation` | `hookSpecificOutput` | `action`, `content` |
| `ElicitationResult` | `hookSpecificOutput` | `action`, `content` |
| `WorktreeRemove`, `Notification`, `SessionEnd`, `PreCompact`, `PostCompact`, `InstructionsLoaded`, `StopFailure` | None | No decision control |

**Top-level decision example:**

```json
{
  "decision": "block",
  "reason": "Test suite must pass before proceeding"
}
```

**PreToolUse example:**

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "Database writes are not allowed"
  }
}
```

**PermissionRequest example:**

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PermissionRequest",
    "decision": {
      "behavior": "allow",
      "updatedInput": {
        "command": "npm run lint"
      }
    }
  }
}
```

## Hook Events

### SessionStart

Runs when Claude Code starts a new session or resumes an existing session. Useful for loading development context or setting up environment variables. Only `type: "command"` hooks are supported.

Matcher values:

| Matcher | When it fires |
|:--------|:--------------|
| `startup` | New session |
| `resume` | `--resume`, `--continue`, or `/resume` |
| `clear` | `/clear` |
| `compact` | Auto or manual compaction |

**Input:**

```json
{
  "session_id": "abc123",
  "transcript_path": "/Users/.../.claude/projects/.../00893aaf-19fa-41d2-8238-13269b9b3ca0.jsonl",
  "cwd": "/Users/...",
  "hook_event_name": "SessionStart",
  "source": "startup",
  "model": "claude-sonnet-4-6"
}
```

**Decision control:**

Any text printed to stdout is added as context for Claude.

| Field | Description |
|:------|:------------|
| `additionalContext` | String added to Claude's context |

```json
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "My additional context here"
  }
}
```

**Persist environment variables:**

SessionStart hooks have access to `CLAUDE_ENV_FILE` environment variable:

```bash
#!/bin/bash

if [ -n "$CLAUDE_ENV_FILE" ]; then
  echo 'export NODE_ENV=production' >> "$CLAUDE_ENV_FILE"
  echo 'export DEBUG_LOG=true' >> "$CLAUDE_ENV_FILE"
  echo 'export PATH="$PATH:./node_modules/.bin"' >> "$CLAUDE_ENV_FILE"
fi

exit 0
```

Capture all environment changes:

```bash
#!/bin/bash

ENV_BEFORE=$(export -p | sort)

# Run setup commands
source ~/.nvm/nvm.sh
nvm use 20

if [ -n "$CLAUDE_ENV_FILE" ]; then
  ENV_AFTER=$(export -p | sort)
  comm -13 <(echo "$ENV_BEFORE") <(echo "$ENV_AFTER") >> "$CLAUDE_ENV_FILE"
fi

exit 0
```

> **Note**: `CLAUDE_ENV_FILE` is only available for SessionStart hooks.

### InstructionsLoaded

Fires when a `CLAUDE.md` or `.claude/rules/*.md` file is loaded. Fires at session start for eagerly-loaded files and later when files are lazily loaded. No blocking or decision control. Runs asynchronously.

Matcher example: `"matcher": "session_start"` fires only for files loaded at session start.

**Input:**

| Field | Description |
|:------|:------------|
| `file_path` | Absolute path to instruction file loaded |
| `memory_type` | Scope: `"User"`, `"Project"`, `"Local"`, or `"Managed"` |
| `load_reason` | Why loaded: `"session_start"`, `"nested_traversal"`, `"path_glob_match"`, `"include"`, or `"compact"` |
| `globs` | Path glob patterns from file's `paths:` frontmatter |
| `trigger_file_path` | Path that triggered this load (lazy loads) |
| `parent_file_path` | Parent instruction file that included this one |

```json
{
  "session_id": "abc123",
  "transcript_path": "/Users/.../.claude/projects/.../transcript.jsonl",
  "cwd": "/Users/my-project",
  "hook_event_name": "InstructionsLoaded",
  "file_path": "/Users/my-project/CLAUDE.md",
  "memory_type": "Project",
  "load_reason": "session_start"
}
```

**Decision control:**

No decision control. Cannot block or modify instruction loading. Use for audit logging or observability.

### UserPromptSubmit

Runs when the user submits a prompt, before Claude processes it. Allows adding context, validating prompts, or blocking certain types.

**Input:**

```json
{
  "session_id": "abc123",
  "transcript_path": "/Users/.../.claude/projects/.../00893aaf-19fa-41d2-8238-13269b9b3ca0.jsonl",
  "cwd": "/Users/...",
  "permission_mode": "default",
  "hook_event_name": "UserPromptSubmit",
  "prompt": "Write a function to calculate the factorial of a number"
}
```

**Decision control:**

Add context via plain text to stdout or JSON. Block prompts with `decision: "block"`.

| Field | Description |
|:------|:------------|
| `decision` | `"block"` prevents prompt processing. Omit to allow |
| `reason` | Shown to user when blocked |
| `additionalContext` | String added to Claude's context |

```json
{
  "decision": "block",
  "reason": "Explanation for decision",
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": "My additional context here"
  }
}
```

### PreToolUse

Runs after Claude creates tool parameters and before processing the tool call. Matches on tool name.

Supported tools: `Bash`, `Edit`, `Write`, `Read`, `Glob`, `Grep`, `Agent`, `WebFetch`, `WebSearch`, and MCP tools.

**Input - Tool-specific fields:**

**Bash:**
```json
{
  "tool_name": "Bash",
  "tool_input": {
    "command": "npm test",
    "description": "Run test suite",
    "timeout": 120000,
    "run_in_background": false
  }
}
```

**Write:**
```json
{
  "tool_name": "Write",
  "tool_input": {
    "file_path": "/path/to/file.txt",
    "content": "file content"
  }
}
```

**Edit:**
```json
{
  "tool_name": "Edit",
  "tool_input": {
    "file_path": "/path/to/file.txt",
    "old_string": "original text",
    "new_string": "replacement text",
    "replace_all": false
  }
}
```

**Read:**
```json
{
  "tool_name": "Read",
  "tool_input": {
    "file_path": "/path/to/file.txt",
    "offset": 10,
    "limit": 50
  }
}
```

**Glob:**
```json
{
  "tool_name": "Glob",
  "tool_input": {
    "pattern": "**/*.ts",
    "path": "/path/to/dir"
  }
}
```

**Grep:**
```json
{
  "tool_name": "Grep",
  "tool_input": {
    "pattern": "TODO.*fix",
    "path": "/path/to/dir",
    "glob": "*.ts",
    "output_mode": "content",
    "-i": true,
    "multiline": false
  }
}
```

**WebFetch:**
```json
{
  "tool_name": "WebFetch",
  "tool_input": {
    "url": "https://example.com/api",
    "prompt": "Extract the API endpoints"
  }
}
```

**WebSearch:**
```json
{
  "tool_name": "WebSearch",
  "tool_input": {
    "query": "react hooks best practices",
    "allowed_domains": ["docs.example.com"],
    "blocked_domains": ["spam.example.com"]
  }
}
```

**Agent:**
```json
{
  "tool_name": "Agent",
  "tool_input": {
    "prompt": "Find all API endpoints",
    "description": "Find API endpoints",
    "subagent_type": "Explore",
    "model": "sonnet"
  }
}
```

**Decision control:**

PreToolUse uses `hookSpecificOutput` for richer control: allow, deny, or ask. Can modify tool input before execution.

| Field | Description |
|:------|:------------|
| `permissionDecision` | `"allow"` skips permission prompt. `"deny"` prevents tool call. `"ask"` prompts user |
| `permissionDecisionReason` | Shown to user for allow/ask, to Claude for deny |
| `updatedInput` | Modifies tool input before execution |
| `additionalContext` | String added to Claude's context |

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",
    "permissionDecisionReason": "My reason here",
    "updatedInput": {
      "field_to_modify": "new value"
    },
    "additionalContext": "Current environment: production. Proceed with caution."
  }
}
```

### PermissionRequest

Runs when the user is shown a permission dialog. Use to allow or deny on behalf of the user.

Matches on tool name, same as PreToolUse.

**Input:**

```json
{
  "session_id": "abc123",
  "transcript_path": "/Users/.../.claude/projects/.../00893aaf-19fa-41d2-8238-13269b9b3ca0.jsonl",
  "cwd": "/Users/...",
  "permission_mode": "default",
  "hook_event_name": "PermissionRequest",
  "tool_name": "Bash",
  "tool_input": {
    "command": "rm -rf node_modules",
    "description": "Remove node_modules directory"
  },
  "permission_suggestions": [
    {
      "type": "addRules",
      "rules": [{ "toolName": "Bash", "ruleContent": "rm -rf node_modules" }],
      "behavior": "allow",
      "destination": "localSettings"
    }
  ]
}
```

**Decision control:**

| Field | Description |
|:------|:------------|
| `behavior` | `"allow"` or `"deny"` |
| `updatedInput` | For `"allow"` only: modifies tool input |
| `updatedPermissions` | For `"allow"` only: array of permission update entries |
| `message` | For `"deny"` only: tells Claude why denied |
| `interrupt` | For `"deny"` only: if `true`, stops Claude |

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PermissionRequest",
    "decision": {
      "behavior": "allow",
      "updatedInput": {
        "command": "npm run lint"
      }
    }
  }
}
```

**Permission update entries:**

| `type` | Fields | Effect |
|:------|:--------|:--------|
| `addRules` | `rules`, `behavior`, `destination` | Adds permission rules |
| `replaceRules` | `rules`, `behavior`, `destination` | Replaces rules |
| `removeRules` | `rules`, `behavior`, `destination` | Removes rules |
| `setMode` | `mode`, `destination` | Changes permission mode |
| `addDirectories` | `directories`, `destination` | Adds working directories |
| `removeDirectories` | `directories`, `destination` | Removes working directories |

Destination options:

| Destination | Writes to |
|:-----------|:----------|
| `session` | in-memory only |
| `localSettings` | `.claude/settings.local.json` |
| `projectSettings` | `.claude/settings.json` |
| `userSettings` | `~/.claude/settings.json` |

### PostToolUse

Runs immediately after a tool completes successfully.

Matches on tool name.

**Input:**

```json
{
  "session_id": "abc123",
  "transcript_path": "/Users/.../.claude/projects/.../00893aaf-19fa-41d2-8238-13269b9b3ca0.jsonl",
  "cwd": "/Users/...",
  "permission_mode": "default",
  "hook_event_name": "PostToolUse",
  "tool_name": "Write",
  "tool_input": {
    "file_path": "/path/to/file.txt",
    "content": "file content"
  },
  "tool_response": {
    "filePath": "/path/to/file.txt",
    "success": true
  },
  "tool_use_id": "toolu_01ABC123..."
}
```

**Decision control:**

| Field | Description |
|:------|:------------|
| `decision` | `"block"` prompts Claude with reason |
| `reason` | Explanation shown to Claude |
| `additionalContext` | Additional context for Claude |
| `updatedMCPToolOutput` | For MCP tools only: replaces tool output |

```json
{
  "decision": "block",
  "reason": "Explanation for decision",
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": "Additional information for Claude"
  }
}
```

### PostToolUseFailure

Runs when a tool execution fails.

Matches on tool name.

**Input:**

```json
{
  "session_id": "abc123",
  "transcript_path": "/Users/.../.claude/projects/.../00893aaf-19fa-41d2-8238-13269b9b3ca0.jsonl",
  "cwd": "/Users/...",
  "permission_mode": "default",
  "hook_event_name": "PostToolUseFailure",
  "tool_name": "Bash",
  "tool_input": {
    "command": "npm test",
    "description": "Run test suite"
  },
  "tool_use_id": "toolu_01ABC123...",
  "error": "Command exited with non-zero status code 1",
  "is_interrupt": false
}
```

**Decision control:**

| Field | Description |
|:------|:------------|
| `additionalContext` | Additional context for Claude |

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PostToolUseFailure",
    "additionalContext": "Additional information about the failure for Claude"
  }
}
```

### Notification

Runs when Claude Code sends notifications.

Matcher values: `permission_prompt`, `idle_prompt`, `auth_success`, `elicitation_dialog`.

**Input:**

```json
{
  "session_id": "abc123",
  "transcript_path": "/Users/.../.claude/projects/.../00893aaf-19fa-41d2-8238-13269b9b3ca0.jsonl",
  "cwd": "/Users/...",
  "hook_event_name": "Notification",
  "message": "Claude needs your permission to use Bash",
  "title": "Permission needed",
  "notification_type": "permission_prompt"
}
```

**Decision control:**

Cannot block notifications. Can add context:

| Field | Description |
|:------|:------------|
| `additionalContext` | String added to Claude's context |

### SubagentStart

Runs when a Claude Code subagent is spawned via the Agent tool.

Supports matchers for agent type: `Bash`, `Explore`, `Plan`, or custom agent names.

**Input:**

```json
{
  "session_id": "abc123",
  "transcript_path": "/Users/.../.claude/projects/.../00893aaf-19fa-41d2-8238-13269b9b3ca0.jsonl",
  "cwd": "/Users/...",
  "hook_event_name": "SubagentStart",
  "agent_id": "agent-abc123",
  "agent_type": "Explore"
}
```

**Decision control:**

Cannot block creation, but can inject context:

| Field | Description |
|:------|:------------|
| `additionalContext` | String added to subagent's context |

```json
{
  "hookSpecificOutput": {
    "hookEventName": "SubagentStart",
    "additionalContext": "Follow security guidelines for this task"
  }
}
```

### SubagentStop

Runs when a Claude Code subagent has finished responding.

Matches on agent type.

**Input:**

```json
{
  "session_id": "abc123",
  "transcript_path": "~/.claude/projects/.../abc123.jsonl",
  "cwd": "/Users/...",
  "permission_mode": "default",
  "hook_event_name": "SubagentStop",
  "stop_hook_active": false,
  "agent_id": "def456",
  "agent_type": "Explore",
  "agent_transcript_path": "~/.claude/projects/.../abc123/subagents/agent-def456.jsonl",
  "last_assistant_message": "Analysis complete. Found 3 potential issues..."
}
```

**Decision control:**

Same as Stop hooks.

### Stop

Runs when the main Claude Code agent has finished responding. Does not run on user interrupt.

**Input:**

```json
{
  "session_id": "abc123",
  "transcript_path": "~/.claude/projects/.../00893aaf-19fa-41d2-8238-13269b9b3ca0.jsonl",
  "cwd": "/Users/...",
  "permission_mode": "default",
  "hook_event_name": "Stop",
  "stop_hook_active": true,
  "last_assistant_message": "I've completed the refactoring. Here's a summary..."
}
```

**Decision control:**

| Field | Description |
|:------|:------------|
| `decision` | `"block"` prevents Claude from stopping |
| `reason` | Required when blocking. Tells Claude why continue |

```json
{
  "decision": "block",
  "reason": "Must be provided when Claude is blocked from stopping"
}
```

> **Note**: Check `stop_hook_active` to prevent infinite loops.

### StopFailure

Runs instead of Stop when the turn ends due to an API error. Output and exit code are ignored.

**Input:**

```json
{
  "session_id": "abc123",
  "transcript_path": "/Users/.../.claude/projects/.../00893aaf-19fa-41d2-8238-13269b9b3ca0.jsonl",
  "cwd": "/Users/...",
  "hook_event_name": "StopFailure",
  "error": "rate_limit",
  "error_details": "429 Too Many Requests",
  "last_assistant_message": "API Error: Rate limit reached"
}
```

Matcher values for `error`: `rate_limit`, `authentication_failed`, `billing_error`, `invalid_request`, `server_error`, `max_output_tokens`, `unknown`.

**Decision control:**

No decision control. For logging/notification only.

### TeammateIdle

Runs when an agent team teammate is about to go idle.

Use to enforce quality gates before teammate stops.

**Input:**

```json
{
  "session_id": "abc123",
  "transcript_path": "/Users/.../.claude/projects/.../00893aaf-19fa-41d2-8238-13269b9b3ca0.jsonl",
  "cwd": "/Users/...",
  "permission_mode": "default",
  "hook_event_name": "TeammateIdle",
  "teammate_name": "researcher",
  "team_name": "my-project"
}
```

**Decision control:**

Two approaches:

- **Exit code 2**: teammate receives stderr as feedback and continues
- **JSON `{"continue": false, "stopReason": "..."}`**: stops teammate entirely

Example checking for build artifact:

```bash
#!/bin/bash

if [ ! -f "./dist/output.js" ]; then
  echo "Build artifact missing. Run the build before stopping." >&2
  exit 2
fi

exit 0
```

### TaskCompleted

Runs when a task is being marked as completed.

**Input:**

```json
{
  "session_id": "abc123",
  "transcript_path": "/Users/.../.claude/projects/.../00893aaf-19fa-41d2-8238-13269b9b3ca0.jsonl",
  "cwd": "/Users/...",
  "permission_mode": "default",
  "hook_event_name": "TaskCompleted",
  "task_id": "task-001",
  "task_subject": "Implement user authentication",
  "task_description": "Add login and signup endpoints",
  "teammate_name": "implementer",
  "team_name": "my-project"
}
```

**Decision control:**

Two approaches:

- **Exit code 2**: task not marked complete, stderr as feedback
- **JSON `{"continue": false, "stopReason": "..."}`**: stops teammate

Example checking tests:

```bash
#!/bin/bash
INPUT=$(cat)
TASK_SUBJECT=$(echo "$INPUT" | jq -r '.task_subject')

if ! npm test 2>&1; then
  echo "Tests not passing. Fix failing tests before completing: $TASK_SUBJECT" >&2
  exit 2
fi

exit 0
```

### ConfigChange

Runs when a configuration file changes during a session.

Matcher values: `user_settings`, `project_settings`, `local_settings`, `policy_settings`, `skills`.

**Input:**

```json
{
  "session_id": "abc123",
  "transcript_path": "/Users/.../.claude/projects/.../00893aaf-19fa-41d2-8238-13269b9b3ca0.jsonl",
  "cwd": "/Users/...",
  "hook_event_name": "ConfigChange",
  "source": "project_settings",
  "file_path": "/Users/.../my-project/.claude/settings.json"
}
```

**Decision control:**

| Field | Description |
|:------|:------------|
| `decision` | `"block"` prevents configuration change |
| `reason` | Explanation shown to user |

```json
{
  "decision": "block",
  "reason": "Configuration changes to project settings require admin approval"
}
```

> **Note**: `policy_settings` changes cannot be blocked.

### WorktreeCreate

When you run `claude --worktree` or a subagent uses `isolation: "worktree"`, Claude Code creates an isolated working copy using `git worktree`. A WorktreeCreate hook replaces default git behavior, allowing custom version control systems.

Hook must print absolute path to created worktree directory on stdout.

**Input:**

```json
{
  "session_id": "abc123",
  "transcript_path": "/Users/.../.claude/projects/.../00893aaf-19fa-41d2-8238-13269b9b3ca0.jsonl",
  "cwd": "/Users/...",
  "hook_event_name": "WorktreeCreate",
  "name": "feature-auth"
}
```

**Output:**

Hook prints absolute path to created worktree on stdout.

Example SVN implementation:

```bash
bash -c 'NAME=$(jq -r .name); DIR="$HOME/.claude/worktrees/$NAME"; svn checkout https://svn.example.com/repo/trunk "$DIR" >&2 && echo "$DIR"'
```

### WorktreeRemove

Cleanup counterpart to WorktreeCreate. Fires when worktree is being removed.

**Input:**

```json
{
  "session_id": "abc123",
  "transcript_path": "/Users/.../.claude/projects/.../00893aaf-19fa-41d2-8238-13269b9b3ca0.jsonl",
  "cwd": "/Users/...",
  "hook_event_name": "WorktreeRemove",
  "worktree_path": "/Users/.../my-project/.claude/worktrees/feature-auth"
}
```

Example cleanup:

```bash
bash -c 'jq -r .worktree_path | xargs rm -rf'
```

**Decision control:**

No decision control. Cannot block removal. Used for cleanup only.

### PreCompact

Runs before Claude Code runs a compact operation.

Matcher values: `manual` (for `/compact`), `auto` (for auto-compact).

**Input:**

```json
{
  "session_id": "abc123",
  "transcript_path": "/Users/.../.claude/projects/.../00893aaf-19fa-41d2-8238-13269b9b3ca0.jsonl",
  "cwd": "/Users/...",
  "hook_event_name": "PreCompact",
  "trigger": "manual",
  "custom_instructions": ""
}
```

**Decision control:**

No decision control.

### PostCompact

Runs after Claude Code completes a compact operation.

Matcher values: `manual`, `auto`.

**Input:**

```json
{
  "session_id": "abc123",
  "transcript_path": "/Users/.../.claude/projects/.../00893aaf-19fa-41d2-8238-13269b9b3ca0.jsonl",
  "cwd": "/Users/...",
  "hook_event_name": "PostCompact",
  "trigger": "manual",
  "compact_summary": "Summary of the compacted conversation..."
}
```

**Decision control:**

No decision control. Cannot affect compaction result.

### SessionEnd

Runs when a Claude Code session ends. Useful for cleanup, logging, or saving state.

Matcher values for `reason`: `clear`, `resume`, `logout`, `prompt_input_exit`, `bypass_permissions_disabled`, `other`.

**Input:**

```json
{
  "session_id": "abc123",
  "transcript_path": "/Users/.../.claude/projects/.../00893aaf-19fa-41d2-8238-13269b9b3ca0.jsonl",
  "cwd": "/Users/...",
  "hook_event_name": "SessionEnd",
  "reason": "other"
}
```

**Decision control:**

No decision control. Cannot block session termination.

> **Note**: SessionEnd hooks have default timeout of 1.5 seconds. Set `CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS` environment variable for higher values.

### Elicitation

Runs when an MCP server requests user input mid-task. Hooks can intercept and respond programmatically.

Matcher matches MCP server name.

**Input:**

Form-mode elicitation:

```json
{
  "session_id": "abc123",
  "transcript_path": "/Users/.../.claude/projects/.../00893aaf-19fa-41d2-8238-13269b9b3ca0.jsonl",
  "cwd": "/Users/...",
  "permission_mode": "default",
  "hook_event_name": "Elicitation",
  "mcp_server_name": "my-mcp-server",
  "message": "Please provide your credentials",
  "mode": "form",
  "requested_schema": {
    "type": "object",
    "properties": {
      "username": { "type": "string", "title": "Username" }
    }
  }
}
```

URL-mode elicitation:

```json
{
  "session_id": "abc123",
  "transcript_path": "/Users/.../.claude/projects/.../00893aaf-19fa-41d2-8238-13269b9b3ca0.jsonl",
  "cwd": "/Users/...",
  "permission_mode": "default",
  "hook_event_name": "Elicitation",
  "mcp_server_name": "my-mcp-server",
  "message": "Please authenticate",
  "mode": "url",
  "url": "https://auth.example.com/login"
}
```

**Decision control:**

Respond programmatically without showing dialog:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "Elicitation",
    "action": "accept",
    "content": {
      "username": "alice"
    }
  }
}
```

### ElicitationResult

Runs after a user responds to an MCP elicitation, before the response is sent back to the server.

Matcher matches MCP server name.

**Decision control:**

Can override user's response or decline it.

```json
{
  "hookSpecificOutput": {
    "hookEventName": "ElicitationResult",
    "action": "accept",
    "content": {
      "field": "modified value"
    }
  }
}
```

---

## Additional Resources

For a quickstart guide with practical examples, see the [Automate workflows with hooks guide](https://code.claude.com/docs/en/hooks-guide).

For the complete documentation index, see: https://code.claude.com/docs/llms.txt
