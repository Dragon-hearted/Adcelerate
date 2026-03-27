#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.8"
# ///

"""
Constants for Claude Code Hooks.
"""

import os
import re
from pathlib import Path

# Base directory for all logs
# Default is 'logs' in the current working directory
LOG_BASE_DIR = os.environ.get("CLAUDE_HOOKS_LOG_DIR", "logs")

# Pattern for valid session IDs: alphanumeric, hyphens, underscores only
_VALID_SESSION_ID_RE = re.compile(r'^[a-zA-Z0-9_-]+$')


def validate_session_id(session_id: str) -> str:
    """
    Validate that a session_id is safe for use as a directory name.
    Prevents path traversal attacks (e.g. '../../etc/passwd').

    Args:
        session_id: The Claude session ID to validate

    Returns:
        The validated session_id

    Raises:
        ValueError: If session_id contains invalid characters
    """
    if not session_id or not _VALID_SESSION_ID_RE.match(session_id):
        raise ValueError(
            f"Invalid session_id: must match [a-zA-Z0-9_-]+, got {session_id!r}"
        )
    return session_id


def get_session_log_dir(session_id: str) -> Path:
    """
    Get the log directory for a specific session.

    Args:
        session_id: The Claude session ID

    Returns:
        Path object for the session's log directory
    """
    validate_session_id(session_id)
    return Path(LOG_BASE_DIR) / session_id

def ensure_session_log_dir(session_id: str) -> Path:
    """
    Ensure the log directory for a session exists.

    Args:
        session_id: The Claude session ID

    Returns:
        Path object for the session's log directory
    """
    log_dir = get_session_log_dir(session_id)
    log_dir.mkdir(parents=True, exist_ok=True)
    return log_dir