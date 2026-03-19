#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Claude Code Setup Hook: Maintenance Mode

Triggered by: claude --maintenance
Purpose: Run project maintenance tasks
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path

LOG_FILE = Path(__file__).parent / "setup.maintenance.log"


def log(msg: str) -> None:
    """Append message to log file."""
    with open(LOG_FILE, "a") as f:
        f.write(msg + "\n")


def main() -> None:
    try:
        hook_input = json.load(sys.stdin)
    except:
        hook_input = {}

    project_dir = os.environ.get("CLAUDE_PROJECT_DIR", os.getcwd())

    log(f"\n{'='*60}")
    log(f"=== Maintenance Hook: {datetime.now().isoformat()} ===")
    log(f"{'='*60}")
    log(f"INPUT: {json.dumps(hook_input, indent=2)}")
    log(f"Project: {project_dir}")

    actions = []

    # Add project-specific maintenance tasks here
    log("\n>>> Running maintenance checks...")
    actions.append("Ran maintenance checks")

    summary = "Maintenance completed!\n\nActions:\n"
    for action in actions:
        summary += f"  - {action}\n"

    output = {
        "hookSpecificOutput": {
            "hookEventName": "Setup",
            "additionalContext": summary
        }
    }

    log(f"\nOUTPUT: {json.dumps(output, indent=2)}")
    log(f"=== Completed: {datetime.now().isoformat()} ===")

    print(json.dumps(output))
    sys.exit(0)


if __name__ == "__main__":
    main()
