#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.8"
# ///

import json
import sys
import re
from pathlib import Path
from utils.constants import ensure_session_log_dir

# Allowed directories where rm -rf is permitted
ALLOWED_RM_DIRECTORIES = [
    'trees/',
]

def is_path_in_allowed_directory(command, allowed_dirs):
    """
    Check if the rm command targets paths exclusively within allowed directories.
    Returns True if all paths in the command are within allowed directories.
    """
    # Extract the path portion after rm and its flags
    # Pattern: rm [flags] path1 path2 ...
    path_pattern = r'rm\s+(?:-[\w]+\s+|--[\w-]+\s+)*(.+)$'
    match = re.search(path_pattern, command, re.IGNORECASE)

    if not match:
        return False

    path_str = match.group(1).strip()

    # Split by spaces to get individual paths (simple approach)
    # This might not handle all edge cases but works for common usage
    paths = path_str.split()

    if not paths:
        return False

    # Check if all paths are within allowed directories
    for path in paths:
        # Remove quotes
        path = path.strip('\'"')

        # Skip if empty
        if not path:
            continue

        # Check if this path is within any allowed directory
        is_allowed = False
        for allowed_dir in allowed_dirs:
            # Check various formats:
            # - trees/something
            # - ./trees/something
            if path.startswith(allowed_dir) or path.startswith('./' + allowed_dir):
                is_allowed = True
                break

        # If any path is not in allowed directories, return False
        if not is_allowed:
            return False

    # All paths are within allowed directories
    return True

def _strip_quotes(s):
    """Strip surrounding single or double quotes from a string."""
    if len(s) >= 2 and ((s[0] == '"' and s[-1] == '"') or (s[0] == "'" and s[-1] == "'")):
        return s[1:-1]
    return s


def _path_is_dangerous(path):
    """
    A single rm target path is dangerous if it can reach OUTSIDE the project
    tree or hit a catastrophic / unrecoverable target. Plain project-relative
    paths (e.g. logs/, graphify-out/) are SAFE — recoverable cleanup, which is
    explicitly allowed. The danger lives in the target, not in the -rf flag.
    """
    p = path.strip().strip('\'"')
    if not p:
        return False
    # Flags (e.g. -rf, --recursive), not paths
    if p.startswith('-'):
        return False
    # Absolute paths (e.g. /var/folders/.../Screenshot.png, /, /usr, /etc)
    if p.startswith('/'):
        return True
    # Home-directory targets
    if p.startswith('~'):
        return True
    # Variable / command expansion — can resolve anywhere
    if '$' in p or '`' in p:
        return True
    # Shell globs — scope is unpredictable, deny to be safe
    if any(ch in p for ch in ('*', '?', '[')):
        return True
    # Bare dangerous tokens
    if p in ('.', '..', '/'):
        return True
    # Parent-directory traversal can escape the project tree
    if p.startswith('../') or '/../' in p or p.endswith('/..'):
        return True
    # Never allow deleting the git database
    base = p[2:] if p.startswith('./') else p
    if base == '.git' or base.startswith('.git/'):
        return True
    return False


def _contains_dangerous_rm(segment, allowed_dirs=None):
    """
    Check a single command segment (no pipes/semicolons) for a dangerous rm.

    Policy: an rm is blocked only when one of its TARGET paths is dangerous
    (absolute, home, glob, parent-escape, .git, or shell expansion) — NOT
    merely because it uses -rf. Project-relative deletes are allowed so routine,
    recoverable cleanup works; deletes that can reach outside the tree or nuke
    the repo are denied.
    """
    normalized = segment.strip()

    # Locate an `rm` invocation (whole word; ignores rmdir, npm, term, etc.)
    m = re.search(r'(?:^|\s)rm\b(.*)$', normalized, re.IGNORECASE)
    if not m:
        return False

    targets = [t for t in m.group(1).split() if not t.startswith('-')]
    if not targets:
        return False  # `rm` with no operand — harmless

    for t in targets:
        if _path_is_dangerous(t):
            return True
    return False


def is_dangerous_rm_command(command, allowed_dirs=None):
    """
    Comprehensive detection of dangerous rm commands.
    Matches various forms of rm -rf and similar destructive patterns,
    including quoted paths, subshell invocations, backtick substitutions,
    and semicolon/pipe-chained commands.

    Args:
        command: The bash command to check
        allowed_dirs: List of directory paths where rm -rf is permitted

    Returns:
        True if the command is dangerous and should be blocked, False otherwise
    """
    if allowed_dirs is None:
        allowed_dirs = []

    # First, check for dangerous rm inside subshell $(...) or backtick `...` constructs
    # These can hide rm commands inside seemingly innocent commands
    subshell_patterns = [
        r'\$\([^)]*\brm\s+.*-[a-z]*r[a-z]*f',  # $(rm -rf ...)
        r'\$\([^)]*\brm\s+.*-[a-z]*f[a-z]*r',  # $(rm -fr ...)
        r'`[^`]*\brm\s+.*-[a-z]*r[a-z]*f',     # `rm -rf ...`
        r'`[^`]*\brm\s+.*-[a-z]*f[a-z]*r',     # `rm -fr ...`
    ]
    normalized_full = ' '.join(command.lower().split())
    for pattern in subshell_patterns:
        if re.search(pattern, normalized_full):
            return True

    # Strip quotes from the command to catch quoted path evasion like rm -rf "/"
    unquoted_command = command
    # Replace quoted strings with their unquoted content for rm detection
    unquoted_command = re.sub(r'"([^"]*)"', r'\1', unquoted_command)
    unquoted_command = re.sub(r"'([^']*)'", r'\1', unquoted_command)

    # Split on semicolons, &&, ||, and pipes to check each segment
    segments = re.split(r'\s*(?:;|&&|\|\||[|])\s*', command)
    unquoted_segments = re.split(r'\s*(?:;|&&|\|\||[|])\s*', unquoted_command)

    # Check each segment (both original and unquoted versions)
    for seg in segments + unquoted_segments:
        seg = seg.strip()
        if not seg:
            continue
        if _contains_dangerous_rm(seg, allowed_dirs):
            return True

    return False

def is_env_file_access(tool_name, tool_input):
    """
    Check if any tool is trying to access .env files containing sensitive data.
    """
    if tool_name in ['Read', 'Edit', 'MultiEdit', 'Write', 'Bash']:
        # Check file paths for file-based tools
        if tool_name in ['Read', 'Edit', 'MultiEdit', 'Write']:
            file_path = tool_input.get('file_path', '')
            if '.env' in file_path and not file_path.endswith('.env.sample'):
                return True
        
        # Check bash commands for .env file access
        elif tool_name == 'Bash':
            command = tool_input.get('command', '')
            # Pattern to detect .env file access (but allow .env.sample)
            env_patterns = [
                r'\b\.env\b(?!\.sample)',  # .env but not .env.sample
                r'cat\s+.*\.env\b(?!\.sample)',  # cat .env
                r'echo\s+.*>\s*\.env\b(?!\.sample)',  # echo > .env
                r'touch\s+.*\.env\b(?!\.sample)',  # touch .env
                r'cp\s+.*\.env\b(?!\.sample)',  # cp .env
                r'mv\s+.*\.env\b(?!\.sample)',  # mv .env
            ]
            
            for pattern in env_patterns:
                if re.search(pattern, command):
                    return True
    
    return False

def deny_tool(reason):
    """
    Deny a tool call using the JSON hookSpecificOutput.permissionDecision pattern.
    Prints JSON to stdout and exits with code 0.
    """
    output = {
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": reason
        }
    }
    print(json.dumps(output))
    sys.exit(0)


def summarize_tool_input(tool_name, tool_input):
    """
    Create a summary dict of key fields for the tool, for logging purposes.
    """
    summary = {"tool_name": tool_name}

    if tool_name == 'Bash':
        summary["command"] = tool_input.get("command", "")[:200]
        if tool_input.get("description"):
            summary["description"] = tool_input["description"][:100]
        if tool_input.get("timeout"):
            summary["timeout"] = tool_input["timeout"]
        if tool_input.get("run_in_background"):
            summary["run_in_background"] = True

    elif tool_name == 'Write':
        summary["file_path"] = tool_input.get("file_path", "")
        summary["content_length"] = len(tool_input.get("content", ""))

    elif tool_name == 'Edit':
        summary["file_path"] = tool_input.get("file_path", "")
        summary["replace_all"] = tool_input.get("replace_all", False)

    elif tool_name == 'Read':
        summary["file_path"] = tool_input.get("file_path", "")
        if tool_input.get("offset"):
            summary["offset"] = tool_input["offset"]
        if tool_input.get("limit"):
            summary["limit"] = tool_input["limit"]

    elif tool_name == 'Glob':
        summary["pattern"] = tool_input.get("pattern", "")
        if tool_input.get("path"):
            summary["path"] = tool_input["path"]

    elif tool_name == 'Grep':
        summary["pattern"] = tool_input.get("pattern", "")
        if tool_input.get("path"):
            summary["path"] = tool_input["path"]
        if tool_input.get("glob"):
            summary["glob"] = tool_input["glob"]

    elif tool_name == 'WebFetch':
        summary["url"] = tool_input.get("url", "")
        summary["prompt"] = tool_input.get("prompt", "")[:100]

    elif tool_name == 'WebSearch':
        summary["query"] = tool_input.get("query", "")
        if tool_input.get("allowed_domains"):
            summary["allowed_domains"] = tool_input["allowed_domains"]
        if tool_input.get("blocked_domains"):
            summary["blocked_domains"] = tool_input["blocked_domains"]

    elif tool_name == 'Task':
        summary["description"] = tool_input.get("description", "")[:100]
        summary["subagent_type"] = tool_input.get("subagent_type", "")
        if tool_input.get("model"):
            summary["model"] = tool_input["model"]
        if tool_input.get("run_in_background"):
            summary["run_in_background"] = True
        if tool_input.get("resume"):
            summary["resume"] = tool_input["resume"]

    elif tool_name == 'TaskOutput':
        summary["task_id"] = tool_input.get("task_id", "")
        summary["block"] = tool_input.get("block", True)
        if tool_input.get("timeout"):
            summary["timeout"] = tool_input["timeout"]

    elif tool_name == 'TaskStop':
        summary["task_id"] = tool_input.get("task_id", "")

    elif tool_name == 'SendMessage':
        summary["type"] = tool_input.get("type", "")
        if tool_input.get("recipient"):
            summary["recipient"] = tool_input["recipient"]
        if tool_input.get("summary"):
            summary["summary"] = tool_input["summary"]

    elif tool_name == 'TaskCreate':
        summary["subject"] = tool_input.get("subject", "")[:100]
        if tool_input.get("activeForm"):
            summary["activeForm"] = tool_input["activeForm"]

    elif tool_name == 'TaskGet':
        summary["taskId"] = tool_input.get("taskId", "")

    elif tool_name == 'TaskUpdate':
        summary["taskId"] = tool_input.get("taskId", "")
        if tool_input.get("status"):
            summary["status"] = tool_input["status"]
        if tool_input.get("owner"):
            summary["owner"] = tool_input["owner"]

    elif tool_name == 'TaskList':
        pass  # No params

    elif tool_name == 'TeamCreate':
        summary["team_name"] = tool_input.get("team_name", "")
        if tool_input.get("description"):
            summary["description"] = tool_input["description"][:100]

    elif tool_name == 'TeamDelete':
        pass  # No params

    elif tool_name == 'NotebookEdit':
        summary["notebook_path"] = tool_input.get("notebook_path", "")
        if tool_input.get("cell_type"):
            summary["cell_type"] = tool_input["cell_type"]
        if tool_input.get("edit_mode"):
            summary["edit_mode"] = tool_input["edit_mode"]

    elif tool_name == 'EnterPlanMode':
        pass  # No params

    elif tool_name == 'ExitPlanMode':
        if tool_input.get("allowedPrompts"):
            summary["allowedPrompts_count"] = len(tool_input["allowedPrompts"])

    elif tool_name == 'AskUserQuestion':
        if tool_input.get("questions"):
            summary["questions_count"] = len(tool_input["questions"])

    elif tool_name == 'Skill':
        summary["skill"] = tool_input.get("skill", "")
        if tool_input.get("args"):
            summary["args"] = tool_input["args"][:100]

    elif tool_name.startswith('mcp__'):
        # MCP tools - log the full tool name and available input keys
        summary["mcp_tool"] = tool_name
        summary["input_keys"] = list(tool_input.keys())[:10]

    return summary


def main():
    try:
        # Read JSON input from stdin
        input_data = json.load(sys.stdin)

        tool_name = input_data.get('tool_name', '')
        tool_input = input_data.get('tool_input', {})
        tool_use_id = input_data.get('tool_use_id', '')

        # Check for .env file access (blocks access to sensitive environment files)
        if is_env_file_access(tool_name, tool_input):
            deny_tool("Access to .env files containing sensitive data is prohibited. Use .env.sample for template files instead")

        # Check for dangerous rm -rf commands
        if tool_name == 'Bash':
            command = tool_input.get('command', '')

            # Block rm only when a target can escape the project tree or hit an
            # unrecoverable target (absolute path, ~, $/`, glob, .. escape, .git).
            # Project-relative deletes are allowed so routine cleanup works.
            if is_dangerous_rm_command(command, ALLOWED_RM_DIRECTORIES):
                deny_tool(
                    "Dangerous rm command detected and prevented. "
                    "rm is blocked when a target is an absolute path, a home (~) path, "
                    "a shell glob/expansion, a parent-directory escape, or the .git database. "
                    "Project-relative deletes (e.g. rm -rf logs/) are allowed."
                )

        # Extract session_id
        session_id = input_data.get('session_id', 'unknown')

        # Ensure session log directory exists
        log_dir = ensure_session_log_dir(session_id)
        log_path = log_dir / 'pre_tool_use.json'

        # Read existing log data or initialize empty list
        if log_path.exists():
            with open(log_path, 'r') as f:
                try:
                    log_data = json.load(f)
                except (json.JSONDecodeError, ValueError):
                    log_data = []
        else:
            log_data = []

        # Build log entry with tool_use_id and tool summary
        log_entry = {
            "tool_name": tool_name,
            "tool_use_id": tool_use_id,
            "session_id": session_id,
            "hook_event_name": input_data.get("hook_event_name", "PreToolUse"),
            "tool_summary": summarize_tool_input(tool_name, tool_input),
        }

        # Append log entry
        log_data.append(log_entry)

        # Write back to file with formatting
        with open(log_path, 'w') as f:
            json.dump(log_data, f, indent=2)

        sys.exit(0)

    except json.JSONDecodeError:
        # Gracefully handle JSON decode errors
        sys.exit(0)
    except Exception:
        # Handle any other errors gracefully
        sys.exit(0)

if __name__ == '__main__':
    main()