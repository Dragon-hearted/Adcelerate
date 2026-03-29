#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "python-dotenv",
# ]
# ///

import argparse
import json
import os
import sys
from pathlib import Path
from datetime import datetime

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass  # dotenv is optional


def log_user_prompt(session_id, input_data):
    """Log user prompt to logs directory."""
    # Ensure logs directory exists
    log_dir = Path("logs")
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = log_dir / "user_prompt_submit.json"

    # Read existing log data or initialize empty list
    if log_file.exists():
        with open(log_file, "r") as f:
            try:
                log_data = json.load(f)
            except (json.JSONDecodeError, ValueError):
                log_data = []
    else:
        log_data = []

    # Append the entire input data
    log_data.append(input_data)

    # Write back to file with formatting
    with open(log_file, "w") as f:
        json.dump(log_data, f, indent=2)


def manage_session_data(session_id, prompt, name_agent=False):
    """Manage session data in the new JSON structure."""
    import random

    # Ensure sessions directory exists
    sessions_dir = Path(".claude/data/sessions")
    sessions_dir.mkdir(parents=True, exist_ok=True)

    # Load or create session file
    session_file = sessions_dir / f"{session_id}.json"

    if session_file.exists():
        try:
            with open(session_file, "r") as f:
                session_data = json.load(f)
        except (json.JSONDecodeError, ValueError):
            session_data = {"session_id": session_id, "prompts": []}
    else:
        session_data = {"session_id": session_id, "prompts": []}

    # Add the new prompt
    session_data["prompts"].append(prompt)

    # Generate agent name if requested and not already present
    if name_agent and "agent_name" not in session_data:
        agent_names = [
            "CodeNinja", "ByteBot", "PixelPro", "NexusAI", "SwiftDev",
            "CipherX", "Quantum", "Forge", "Nebula", "Axiom",
            "Helix", "Prism", "Vertex", "Zenith", "Stratos",
            "Cortex", "Pulsar", "Orbit", "Dynamo", "Flux",
            "Raven", "Spark", "Titan", "Onyx", "Echo",
        ]
        session_data["agent_name"] = random.choice(agent_names)

    # Save the updated session data
    try:
        with open(session_file, "w") as f:
            json.dump(session_data, f, indent=2)
    except Exception:
        # Silently fail if we can't write the file
        pass


DISCORD_INTERCEPTABLE_COMMANDS = {
    "/clear": {
        "action": "reset_session",
        "context": (
            "The user sent /clear from Discord. Session tracking data has been reset. "
            "Inform the user that session tracking data was cleared successfully. "
            "Note: Full conversation context window clear requires running /clear directly in the Claude Code terminal — "
            "this cannot be triggered remotely from Discord."
        ),
    },
    "/compact": {
        "action": "info_only",
        "context": (
            "The user sent /compact from Discord. This is a terminal-only command that triggers context compaction. "
            "Inform the user that /compact must be run directly in the Claude Code terminal. "
            "The context will auto-compact when it approaches limits."
        ),
    },
    "/help": {
        "action": "info_only",
        "context": (
            "The user sent /help from Discord. Respond with a helpful summary of what they can do from Discord: "
            "they can ask questions, run skills (e.g. /scene-board, /library), and have conversations. "
            "Terminal-only commands like /clear, /compact, /status require the Claude Code terminal directly."
        ),
    },
}


def handle_discord_commands(prompt, session_id):
    """Intercept terminal-only CLI commands from Discord with helpful responses."""
    try:
        command = prompt.strip().lower()
        if command not in DISCORD_INTERCEPTABLE_COMMANDS:
            return {"intercepted": False}

        cmd_config = DISCORD_INTERCEPTABLE_COMMANDS[command]

        # Handle session reset for /clear
        if cmd_config["action"] == "reset_session":
            try:
                session_file = Path(".claude/data/sessions") / f"{session_id}.json"
                if session_file.exists():
                    with open(session_file, "r") as f:
                        session_data = json.load(f)
                    # Reset prompts but preserve session_id and agent_name
                    reset_data = {
                        "session_id": session_data.get("session_id", session_id),
                        "prompts": [],
                    }
                    if "agent_name" in session_data:
                        reset_data["agent_name"] = session_data["agent_name"]
                    with open(session_file, "w") as f:
                        json.dump(reset_data, f, indent=2)
            except Exception:
                pass  # Continue even if session reset fails

        return {"intercepted": True, "context": cmd_config["context"]}
    except Exception:
        return {"intercepted": False}


def validate_prompt(prompt):
    """
    Validate the user prompt for security or policy violations.
    Returns tuple (is_valid, reason).
    """
    # Example validation rules (customize as needed)
    blocked_patterns = [
        # Add any patterns you want to block
        # Example: ('rm -rf /', 'Dangerous command detected'),
    ]

    prompt_lower = prompt.lower()

    for pattern, reason in blocked_patterns:
        if pattern.lower() in prompt_lower:
            return False, reason

    return True, None


def main():
    try:
        # Parse command line arguments
        parser = argparse.ArgumentParser()
        parser.add_argument(
            "--validate", action="store_true", help="Enable prompt validation"
        )
        parser.add_argument(
            "--log-only",
            action="store_true",
            help="Only log prompts, no validation or blocking",
        )
        parser.add_argument(
            "--store-last-prompt",
            action="store_true",
            help="Store the last prompt for status line display",
        )
        parser.add_argument(
            "--name-agent",
            action="store_true",
            help="Generate an agent name for the session",
        )
        parser.add_argument(
            "--discord-commands",
            action="store_true",
            help="Intercept terminal-only commands from Discord with helpful responses",
        )
        args = parser.parse_args()

        # Read JSON input from stdin
        input_data = json.loads(sys.stdin.read())

        # Extract session_id and prompt
        session_id = input_data.get("session_id", "unknown")
        prompt = input_data.get("prompt", "")

        # Log the user prompt
        log_user_prompt(session_id, input_data)

        # Manage session data with JSON structure
        if args.store_last_prompt or args.name_agent:
            manage_session_data(session_id, prompt, name_agent=args.name_agent)

        # Handle Discord CLI commands if enabled
        if args.discord_commands:
            cmd_result = handle_discord_commands(prompt, session_id)
            if cmd_result.get("intercepted"):
                output = {
                    "hookSpecificOutput": {
                        "additionalContext": cmd_result["context"]
                    }
                }
                print(json.dumps(output))
                sys.exit(0)

        # Validate prompt if requested and not in log-only mode
        if args.validate and not args.log_only:
            is_valid, reason = validate_prompt(prompt)
            if not is_valid:
                # Use JSON decision pattern to block prompts
                output = {
                    "decision": "block",
                    "reason": f"Prompt blocked: {reason}",
                }
                print(json.dumps(output))
                sys.exit(0)

        # Success - prompt will be processed
        sys.exit(0)

    except json.JSONDecodeError:
        # Handle JSON decode errors gracefully
        sys.exit(0)
    except Exception:
        # Handle any other errors gracefully
        sys.exit(0)


if __name__ == "__main__":
    main()
