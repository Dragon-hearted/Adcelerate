#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["python-dotenv"]
# ///
"""
Claude Code SessionStart Hook: Load Environment Variables + Observability

Triggered by: Session start, resume, clear, or compact
Purpose:
  1. Load environment variables from .env file into CLAUDE_ENV_FILE
     so they persist across all bash commands in the session.
  2. Log session start for observability.
  3. Optionally load development context (--load-context).
"""

import argparse
import json
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path

from dotenv import dotenv_values

SCRIPT_DIR = Path(__file__).parent
LOG_FILE = SCRIPT_DIR / "session_start.log"


class Logger:
    """Simple logger that writes to both stderr and a log file (appends)."""

    def __init__(self, log_path: Path):
        self.log_path = log_path
        self.log_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self.log_path, "a") as f:
            f.write(f"\n{'='*60}\n")
            f.write(f"=== SessionStart Hook: {datetime.now().isoformat()} ===\n")
            f.write(f"{'='*60}\n")

    def log(self, message: str) -> None:
        """Append to log file."""
        with open(self.log_path, "a") as f:
            f.write(message + "\n")


logger = Logger(LOG_FILE)


def get_git_status():
    """Get current git status information."""
    try:
        branch_result = subprocess.run(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            capture_output=True, text=True, timeout=5,
        )
        current_branch = branch_result.stdout.strip() if branch_result.returncode == 0 else "unknown"

        status_result = subprocess.run(
            ["git", "status", "--porcelain"],
            capture_output=True, text=True, timeout=5,
        )
        if status_result.returncode == 0:
            changes = status_result.stdout.strip().split("\n") if status_result.stdout.strip() else []
            uncommitted_count = len(changes)
        else:
            uncommitted_count = 0

        return current_branch, uncommitted_count
    except Exception:
        return None, None


def load_development_context(source, agent_type=""):
    """Load relevant development context based on session source."""
    context_parts = []

    context_parts.append(f"Session started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    context_parts.append(f"Session source: {source}")
    if agent_type:
        context_parts.append(f"Agent type: {agent_type}")

    branch, changes = get_git_status()
    if branch:
        context_parts.append(f"Git branch: {branch}")
        if changes and changes > 0:
            context_parts.append(f"Uncommitted changes: {changes} files")

    context_files = [
        ".claude/CONTEXT.md",
        ".claude/TODO.md",
        "TODO.md",
        ".github/ISSUE_TEMPLATE.md",
    ]

    for file_path in context_files:
        if Path(file_path).exists():
            try:
                with open(file_path, "r") as f:
                    content = f.read().strip()
                    if content:
                        context_parts.append(f"\n--- Content from {file_path} ---")
                        context_parts.append(content[:1000])
            except Exception:
                pass

    return "\n".join(context_parts)


def log_session_start(input_data):
    """Log session start event to logs directory."""
    log_dir = Path("logs")
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = log_dir / "session_start.json"

    if log_file.exists():
        with open(log_file, "r") as f:
            try:
                log_data = json.load(f)
            except (json.JSONDecodeError, ValueError):
                log_data = []
    else:
        log_data = []

    log_entry = {
        "session_id": input_data.get("session_id", "unknown"),
        "hook_event_name": input_data.get("hook_event_name", "SessionStart"),
        "source": input_data.get("source", "unknown"),
        "model": input_data.get("model", ""),
        "agent_type": input_data.get("agent_type", ""),
    }
    log_data.append(log_entry)

    with open(log_file, "w") as f:
        json.dump(log_data, f, indent=2)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--load-context", action="store_true",
                        help="Load development context at session start")
    args = parser.parse_args()

    try:
        hook_input = json.load(sys.stdin)
    except (json.JSONDecodeError, EOFError):
        hook_input = {}

    logger.log("")
    logger.log("HOOK INPUT (JSON received via stdin from Claude Code):")
    logger.log("-" * 60)
    logger.log(json.dumps(hook_input, indent=2) if hook_input else "{}")
    logger.log("")

    project_dir = os.environ.get("CLAUDE_PROJECT_DIR", os.getcwd())
    env_file_path = os.environ.get("CLAUDE_ENV_FILE")
    source = hook_input.get("source", "unknown")
    session_id = hook_input.get("session_id", "unknown")
    agent_type = hook_input.get("agent_type", "")

    logger.log("Claude Code SessionStart Hook: Loading Environment")
    logger.log("-" * 60)
    logger.log(f"Source: {source}")
    logger.log(f"Session ID: {session_id}")
    logger.log(f"Project directory: {project_dir}")
    logger.log(f"CLAUDE_ENV_FILE: {env_file_path or 'not set'}")
    logger.log(f"Log file: {LOG_FILE}")

    # --- Phase 1: Load .env variables into CLAUDE_ENV_FILE ---
    dotenv_path = Path(project_dir) / ".env"
    loaded_vars = []

    if env_file_path:
        if dotenv_path.exists():
            logger.log(f"\n>>> Loading variables from {dotenv_path}...")
            env_vars = dotenv_values(dotenv_path)
            with open(env_file_path, "a") as f:
                for key, value in env_vars.items():
                    if value is not None:
                        escaped_value = value.replace("'", "'\"'\"'")
                        f.write(f"export {key}='{escaped_value}'\n")
                        loaded_vars.append(key)
                        logger.log(f"  Loaded: {key}")
        else:
            logger.log(f"\n>>> No .env file found at {dotenv_path}")
    else:
        logger.log("\n>>> CLAUDE_ENV_FILE not available - cannot persist variables")

    # --- Phase 2: Log session start for observability ---
    log_session_start(hook_input)

    logger.log("\n" + "-" * 60)
    logger.log("SessionStart Complete!")
    logger.log("-" * 60)

    # --- Phase 3: Build output context ---
    context_parts = [f"SessionStart hook ran (source: {source})."]

    if loaded_vars:
        context_parts.append(f"Loaded environment variables: {', '.join(loaded_vars)}")
    else:
        context_parts.append("No environment variables loaded.")

    # Load development context if requested
    if args.load_context:
        dev_context = load_development_context(source, agent_type)
        if dev_context:
            context_parts.append(dev_context)

    output = {
        "hookSpecificOutput": {
            "hookEventName": "SessionStart",
            "additionalContext": " ".join(context_parts),
        }
    }

    logger.log("")
    logger.log("HOOK OUTPUT (JSON returned via stdout to Claude Code):")
    logger.log("-" * 60)
    logger.log(json.dumps(output, indent=2))

    with open(LOG_FILE, "a") as f:
        f.write(f"\n=== SessionStart Hook Completed: {datetime.now().isoformat()} ===\n")

    print(json.dumps(output))
    sys.exit(0)


if __name__ == "__main__":
    main()
