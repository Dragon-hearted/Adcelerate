#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.8"
# ///

import json
import os
import shlex
import subprocess
import sys
from pathlib import Path
from utils.constants import ensure_session_log_dir


def get_transcript_path(session_id, agent_id):
    """
    Predict the subagent transcript path based on the pattern:
    {claude_projects_dir}/{session_id}/subagents/agent-{agent_id}.jsonl
    """
    # Try to find the transcript base from the parent transcript_path
    claude_projects_dir = Path.home() / ".claude" / "projects"
    # Find the project dir (there should be one matching current project)
    cwd = os.getcwd()
    project_slug = cwd.replace("/", "-")
    project_dir = claude_projects_dir / project_slug
    transcript = project_dir / session_id / "subagents" / f"agent-{agent_id}.jsonl"
    return transcript


def create_tmux_monitor_pane(agent_id, agent_type, session_id, log_dir):
    """
    Create a tmux split pane that monitors the subagent's activity.
    Shows agent info and tails the transcript file for real-time obs.
    """
    try:
        # Check if we're in tmux
        if not os.environ.get("TMUX"):
            return

        # Track pane mapping file so SubagentStop can find and close it
        pane_tracker = log_dir / "tmux_panes.json"

        # Predict transcript path
        transcript = get_transcript_path(session_id, agent_id)
        transcript_dir = transcript.parent

        # Sanitize all user-controlled values before shell interpolation
        safe_agent_type = shlex.quote(agent_type)
        safe_agent_id = shlex.quote(agent_id[:8])
        safe_session_id = shlex.quote(session_id[:12])
        safe_transcript = shlex.quote(str(transcript))
        safe_log_dir = shlex.quote(str(log_dir))

        # Build the monitoring script that runs in the new pane
        monitor_script = f"""
echo "\\033[1;36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\\033[0m"
echo "\\033[1;33m🔍 SUBAGENT MONITOR\\033[0m"
echo "\\033[1;36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\\033[0m"
echo "  Type:    \\033[1;32m"{safe_agent_type}"\\033[0m"
echo "  ID:      \\033[0;37m"{safe_agent_id}"...\\033[0m"
echo "  Session: \\033[0;37m"{safe_session_id}"...\\033[0m"
echo "\\033[1;36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\\033[0m"
echo ""
echo "\\033[0;90mWaiting for transcript...\\033[0m"

# Wait for transcript file to appear (max 30s)
TRANSCRIPT={safe_transcript}
COUNTER=0
while [ ! -f "$TRANSCRIPT" ] && [ $COUNTER -lt 30 ]; do
    sleep 1
    COUNTER=$((COUNTER + 1))
done

if [ -f "$TRANSCRIPT" ]; then
    echo "\\033[1;32m✓ Transcript found, tailing...\\033[0m"
    echo ""
    # Tail the transcript, extracting readable content
    tail -f "$TRANSCRIPT" 2>/dev/null | while IFS= read -r line; do
        # Extract type and role from JSONL
        TYPE=$(echo "$line" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('type',''))" 2>/dev/null)
        if [ "$TYPE" = "assistant" ]; then
            MSG=$(echo "$line" | python3 -c "
import json,sys
d=json.load(sys.stdin)
for block in d.get('message',{{}}).get('content',[]):
    if isinstance(block, dict) and block.get('type')=='text':
        text=block['text']
        # Truncate long text
        if len(text)>200: text=text[:200]+'...'
        print(text)
    elif isinstance(block, dict) and block.get('type')=='tool_use':
        print(f'🔧 {{block.get(\"name\",\"tool\")}}')
" 2>/dev/null)
            if [ -n "$MSG" ]; then
                echo "\\033[1;34m[assistant]\\033[0m $MSG"
            fi
        elif [ "$TYPE" = "tool_result" ]; then
            echo "\\033[0;90m  ↳ tool result received\\033[0m"
        fi
    done
else
    echo "\\033[1;33m⚠ No transcript found after 30s\\033[0m"
    echo "\\033[0;90mMonitoring log dir instead...\\033[0m"
    # Fallback: watch the log directory
    if command -v fswatch >/dev/null 2>&1; then
        fswatch -r {safe_log_dir} 2>/dev/null | while read -r f; do
            echo "\\033[0;90m[$(date +%H:%M:%S)]\\033[0m File changed: $(basename "$f")"
        done
    else
        # Simple polling fallback
        while true; do
            ls -lt {safe_log_dir} 2>/dev/null | head -5
            sleep 5
        done
    fi
fi
"""

        # Create a horizontal split (bottom pane) with 15 lines height
        result = subprocess.run(
            ["tmux", "split-window", "-v", "-l", "15", "-d", "-P", "-F", "#{pane_id}",
             "bash", "-c", monitor_script],
            capture_output=True, text=True, timeout=5
        )

        if result.returncode == 0:
            pane_id = result.stdout.strip()

            # Save pane mapping so SubagentStop can close it
            pane_data = {}
            if pane_tracker.exists():
                try:
                    with open(pane_tracker, "r") as f:
                        pane_data = json.load(f)
                except (json.JSONDecodeError, ValueError):
                    pane_data = {}

            pane_data[agent_id] = {
                "pane_id": pane_id,
                "agent_type": agent_type,
            }

            with open(pane_tracker, "w") as f:
                json.dump(pane_data, f, indent=2)

    except (subprocess.TimeoutExpired, subprocess.SubprocessError, FileNotFoundError):
        pass
    except Exception:
        pass


def main():
    try:
        # Read JSON input from stdin
        input_data = json.load(sys.stdin)

        # Extract fields
        session_id = input_data.get('session_id', 'unknown')
        agent_id = input_data.get('agent_id', 'unknown')
        agent_type = input_data.get('agent_type', 'unknown')

        # Ensure session log directory exists
        log_dir = ensure_session_log_dir(session_id)
        log_path = log_dir / 'subagent_start.json'

        # Read existing log data or initialize empty list
        if log_path.exists():
            with open(log_path, 'r') as f:
                try:
                    log_data = json.load(f)
                except (json.JSONDecodeError, ValueError):
                    log_data = []
        else:
            log_data = []

        # Append new data
        log_data.append(input_data)

        # Write back to file with formatting
        with open(log_path, 'w') as f:
            json.dump(log_data, f, indent=2)

        # Create tmux monitoring pane for observability
        create_tmux_monitor_pane(agent_id, agent_type, session_id, log_dir)

        sys.exit(0)

    except json.JSONDecodeError:
        sys.exit(0)
    except Exception:
        sys.exit(0)


if __name__ == '__main__':
    main()
