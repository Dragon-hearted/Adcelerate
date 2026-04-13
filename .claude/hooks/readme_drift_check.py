#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Claude Code SessionEnd Hook: README Drift Check

Triggered by: SessionEnd event
Purpose: Check if changed files include knowledge sources that feed READMEs.
If drift detected, writes a .drift-flag file for later pickup.
Must complete in <1 second — no heavy parsing.
"""

import json
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path

# Knowledge source patterns to watch for drift
KNOWLEDGE_PATTERNS = [
    "systems.yaml",
    "library.yaml",
    "knowledge/graph.yaml",
]

KNOWLEDGE_PREFIXES = [
    "systems/",       # any systems/*/knowledge/* or systems/*/src/* or systems/*/package.json
]

KNOWLEDGE_SUFFIXES = [
    "/package.json",
    "/knowledge/",
]


def get_changed_files(project_dir: str) -> list[str]:
    """Get list of files changed in this session via git diff."""
    try:
        # Check staged + unstaged changes against HEAD
        result = subprocess.run(
            ["git", "diff", "--name-only", "HEAD"],
            capture_output=True,
            text=True,
            cwd=project_dir,
            timeout=5,
        )
        files = [f.strip() for f in result.stdout.strip().splitlines() if f.strip()]

        # Also check untracked files
        result2 = subprocess.run(
            ["git", "diff", "--name-only", "--cached"],
            capture_output=True,
            text=True,
            cwd=project_dir,
            timeout=5,
        )
        cached = [f.strip() for f in result2.stdout.strip().splitlines() if f.strip()]

        return list(set(files + cached))
    except Exception:
        return []


def is_knowledge_source(filepath: str) -> bool:
    """Check if a file path matches a knowledge source pattern."""
    # Exact matches
    for pattern in KNOWLEDGE_PATTERNS:
        if filepath == pattern or filepath.endswith("/" + pattern):
            return True

    # Prefix matches (files under systems/)
    for prefix in KNOWLEDGE_PREFIXES:
        if filepath.startswith(prefix):
            # Check for knowledge dirs, package.json, or src changes
            parts = filepath.split("/")
            if len(parts) >= 3:
                sub = parts[2]  # e.g., "knowledge", "package.json", "src"
                if sub in ("knowledge", "src") or sub == "package.json":
                    return True

    # Suffix matches
    for suffix in KNOWLEDGE_SUFFIXES:
        if suffix in filepath:
            return True

    return False


def determine_affected_scopes(changed_files: list[str]) -> list[str]:
    """Determine which README scopes are affected by the changes."""
    scopes = set()

    for filepath in changed_files:
        if not is_knowledge_source(filepath):
            continue

        # Root-level knowledge sources affect root scope
        if filepath in ("systems.yaml", "library.yaml", "knowledge/graph.yaml"):
            scopes.add("root")

        # System-specific changes
        if filepath.startswith("systems/"):
            parts = filepath.split("/")
            if len(parts) >= 2:
                system_name = parts[1]
                scopes.add(f"system:{system_name}")
                scopes.add("root")  # System changes also affect root

        # App-specific changes
        if filepath.startswith("apps/"):
            parts = filepath.split("/")
            if len(parts) >= 2:
                app_name = parts[1]
                scopes.add(f"app:{app_name}")
                scopes.add("root")

    return sorted(scopes)


def main() -> None:
    try:
        # Read JSON input from stdin (SessionEnd hook protocol)
        input_data = json.loads(sys.stdin.read())
    except (json.JSONDecodeError, Exception):
        input_data = {}

    project_dir = os.environ.get("CLAUDE_PROJECT_DIR", os.getcwd())
    drift_flag_path = Path(project_dir) / "systems" / "readme-engine" / ".drift-flag"

    # Get changed files
    changed_files = get_changed_files(project_dir)
    if not changed_files:
        sys.exit(0)

    # Filter to knowledge source changes
    knowledge_changes = [f for f in changed_files if is_knowledge_source(f)]
    if not knowledge_changes:
        sys.exit(0)

    # Determine affected scopes
    affected_scopes = determine_affected_scopes(knowledge_changes)
    if not affected_scopes:
        sys.exit(0)

    # Write drift flag
    drift_data = {
        "timestamp": datetime.now().isoformat(),
        "affected_scopes": affected_scopes,
        "changed_files": knowledge_changes,
    }

    drift_flag_path.parent.mkdir(parents=True, exist_ok=True)
    with open(drift_flag_path, "w") as f:
        json.dump(drift_data, f, indent=2)

    # Success — no stdout needed for SessionEnd hooks
    sys.exit(0)


if __name__ == "__main__":
    main()
