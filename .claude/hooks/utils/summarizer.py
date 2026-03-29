#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.8"
# dependencies = [
#     "python-dotenv",
# ]
# ///

import json
from typing import Optional, Dict, Any


def generate_event_summary(event_data: Dict[str, Any]) -> Optional[str]:
    """
    Generate a concise one-sentence summary of a hook event.

    Uses simple template extraction from event payload — no external API needed.

    Args:
        event_data: The hook event data containing event_type, payload, etc.

    Returns:
        str: A one-sentence summary, or None if generation fails
    """
    try:
        event_type = event_data.get("hook_event_type", "Unknown")
        payload = event_data.get("payload", {})

        # Extract key details from common payload shapes
        tool_name = payload.get("tool_name", "")
        tool_input = payload.get("tool_input", {})

        if tool_name:
            # Tool-based events: "Reads file src/index.ts", "Executes npm test"
            if tool_name == "Read":
                path = tool_input.get("file_path", "unknown file")
                return f"Reads {path.split('/')[-1]}"
            elif tool_name == "Write":
                path = tool_input.get("file_path", "unknown file")
                return f"Writes {path.split('/')[-1]}"
            elif tool_name == "Edit":
                path = tool_input.get("file_path", "unknown file")
                return f"Edits {path.split('/')[-1]}"
            elif tool_name == "Bash":
                cmd = tool_input.get("command", "")
                short_cmd = cmd[:60] + "..." if len(cmd) > 60 else cmd
                return f"Executes: {short_cmd}"
            elif tool_name == "Glob":
                pattern = tool_input.get("pattern", "")
                return f"Searches for files matching {pattern}"
            elif tool_name == "Grep":
                pattern = tool_input.get("pattern", "")
                return f"Searches code for '{pattern}'"
            elif tool_name == "WebSearch":
                query = tool_input.get("query", "")
                return f"Searches web for '{query}'"
            elif tool_name == "WebFetch":
                url = tool_input.get("url", "")
                return f"Fetches {url}"
            elif tool_name == "Agent":
                desc = tool_input.get("description", tool_name)
                return f"Spawns agent: {desc}"
            else:
                return f"Uses {tool_name}"

        # Non-tool events: use event type
        message = payload.get("message", "")
        if message:
            short_msg = message[:80] + "..." if len(message) > 80 else message
            return f"{event_type}: {short_msg}"

        return f"{event_type} event"

    except Exception:
        return None
