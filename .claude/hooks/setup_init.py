#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""
Claude Code Setup Hook: Repository Initialization

Triggered by: claude --init or claude --init-only
Purpose: Run first-time setup for the project
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path

# Log file in the same directory as this script
SCRIPT_DIR = Path(__file__).parent
LOG_FILE = SCRIPT_DIR / "setup.init.log"


class Logger:
    """Simple logger that writes to both stderr and a log file (appends)."""

    def __init__(self, log_path: Path):
        self.log_path = log_path
        self.log_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self.log_path, "a") as f:
            f.write(f"\n{'='*60}\n")
            f.write(f"=== Init Hook Started: {datetime.now().isoformat()} ===\n")
            f.write(f"{'='*60}\n")

    def log(self, message: str) -> None:
        """Print to stderr and append to log file."""
        print(message, file=sys.stderr)
        with open(self.log_path, "a") as f:
            f.write(message + "\n")


logger = Logger(LOG_FILE)


def read_hook_input() -> dict:
    """Read the JSON payload from stdin."""
    try:
        return json.load(sys.stdin)
    except (json.JSONDecodeError, EOFError):
        return {}


def output_result(context: str) -> dict:
    """Build and return structured JSON result."""
    return {
        "hookSpecificOutput": {"hookEventName": "Setup", "additionalContext": context}
    }


def main() -> None:
    hook_input = read_hook_input()

    logger.log("")
    logger.log("HOOK INPUT (JSON received via stdin from Claude Code):")
    logger.log("-" * 60)
    logger.log(json.dumps(hook_input, indent=2) if hook_input else "{}")
    logger.log("")

    trigger = hook_input.get("trigger", "init")
    session_id = hook_input.get("session_id", "unknown")

    project_dir = os.environ.get("CLAUDE_PROJECT_DIR", os.getcwd())
    env_file = os.environ.get("CLAUDE_ENV_FILE")

    logger.log("Claude Code Setup Hook: Initializing Repository")
    logger.log("-" * 60)
    logger.log(f"Trigger: --{trigger}")
    logger.log(f"Session ID: {session_id}")
    logger.log(f"Project directory: {project_dir}")
    logger.log(f"Log file: {LOG_FILE}")

    actions = []

    # Persist environment variables for Claude session
    if env_file:
        logger.log("\n>>> Setting up session environment variables...")
        with open(env_file, "a") as f:
            pass  # Add project-specific env vars here as needed
        actions.append("Checked session environment variables")

    logger.log("\n" + "-" * 60)
    logger.log("Setup Complete!")
    logger.log("-" * 60)

    summary = "Setup completed successfully!\n\n"
    summary += "What was done:\n"
    for action in actions:
        summary += f"  - {action}\n"
    summary += f"\nLog file: {LOG_FILE}"

    hook_output = output_result(summary)

    logger.log("")
    logger.log("HOOK OUTPUT (JSON returned via stdout to Claude Code):")
    logger.log("-" * 60)
    logger.log(json.dumps(hook_output, indent=2))

    with open(LOG_FILE, "a") as f:
        f.write(f"\n=== Init Hook Completed: {datetime.now().isoformat()} ===\n")

    print(json.dumps(hook_output, indent=2))
    sys.exit(0)


if __name__ == "__main__":
    main()
