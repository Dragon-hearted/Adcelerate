#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.8"
# dependencies = [
#     "anthropic",
#     "python-dotenv",
# ]
# ///

"""
Multi-Agent Observability Hook Script
Sends Claude Code hook events to the observability server.

Supported event types (12 total):
  SessionStart, SessionEnd, UserPromptSubmit, PreToolUse, PostToolUse,
  PostToolUseFailure, PermissionRequest, Notification, SubagentStart,
  SubagentStop, Stop, PreCompact

Adcelerate v1 events (17 total):
  adcelerate.build.* | adcelerate.execute.* | adcelerate.diagnose.* | adcelerate.error.*
"""

import json
import sys
import os
import argparse
import urllib.request
import urllib.error
from datetime import datetime
from pathlib import Path
from utils.summarizer import generate_event_summary
from utils.model_extractor import get_model_from_transcript


# ---------------------------------------------------------------------------
# Adcelerate v1 Event Definitions
# ---------------------------------------------------------------------------
# All valid adcelerate.* event names for the v1 pipeline. The dashboard can
# filter by the "adcelerate.*" prefix to isolate these from legacy hook events.

ADCELERATE_V1_EVENTS = frozenset([
    # Build events
    'adcelerate.build.started',
    'adcelerate.build.knowledge_captured',
    'adcelerate.build.scaffolding_started',
    'adcelerate.build.validation_passed',
    'adcelerate.build.registration_complete',

    # Execute events
    'adcelerate.execute.task_received',
    'adcelerate.execute.system_matched',
    'adcelerate.execute.stage_completed',
    'adcelerate.execute.validation_passed',
    'adcelerate.execute.delivered',

    # Diagnose events
    'adcelerate.diagnose.started',
    'adcelerate.diagnose.root_cause_found',
    'adcelerate.diagnose.fix_proposed',
    'adcelerate.diagnose.fix_applied',

    # Error events
    'adcelerate.error.inline_retry',
    'adcelerate.error.budget_exhausted',
    'adcelerate.error.escalated',
])


def create_adcelerate_event(event_name, system_id, session_id, **kwargs):
    """Build an adcelerate.* event payload with required fields.

    Every adcelerate.* event carries ``system_id``, ``timestamp``, and
    ``session_id`` as mandatory fields.  Action-specific data is merged in
    from *kwargs*.

    Parameters
    ----------
    event_name : str
        Must be one of the names listed in ``ADCELERATE_V1_EVENTS``.
    system_id : str
        Identifier for the Adcelerate system emitting the event.
    session_id : str
        Current session identifier.
    **kwargs
        Arbitrary action-specific data merged into the payload.

    Returns
    -------
    dict
        Ready-to-send event payload.

    Raises
    ------
    ValueError
        If *event_name* is not a recognised v1 event.
    """
    if event_name not in ADCELERATE_V1_EVENTS:
        raise ValueError(
            f"Unknown adcelerate v1 event: {event_name!r}. "
            f"Must be one of: {sorted(ADCELERATE_V1_EVENTS)}"
        )

    payload = {
        'event_name': event_name,
        'system_id': system_id,
        'session_id': session_id,
        'timestamp': int(datetime.now().timestamp() * 1000),
    }

    # Merge action-specific data (kwargs never overwrite required fields)
    for key, value in kwargs.items():
        if key not in payload:
            payload[key] = value

    return payload


def send_adcelerate_event(event_name, system_id, session_id,
                          server_url='http://localhost:4000/events', **kwargs):
    """Create and send an adcelerate.* event in one call.

    Convenience wrapper that builds the payload via
    ``create_adcelerate_event`` and dispatches it through
    ``send_event_to_server``.

    Returns
    -------
    bool
        True if the server accepted the event, False otherwise.
    """
    event_data = create_adcelerate_event(event_name, system_id, session_id, **kwargs)
    # Wrap in the same envelope the existing pipeline expects
    envelope = {
        'source_app': 'adcelerate',
        'session_id': session_id,
        'hook_event_type': event_name,
        'payload': event_data,
        'timestamp': event_data['timestamp'],
    }
    return send_event_to_server(envelope, server_url)


def send_event_to_server(event_data, server_url='http://localhost:4000/events'):
    """Send event data to the observability server."""
    try:
        # Prepare the request
        req = urllib.request.Request(
            server_url,
            data=json.dumps(event_data).encode('utf-8'),
            headers={
                'Content-Type': 'application/json',
                'User-Agent': 'Claude-Code-Hook/1.0'
            }
        )
        
        # Send the request
        with urllib.request.urlopen(req, timeout=5) as response:
            if response.status == 200:
                return True
            else:
                return False

    except urllib.error.URLError:
        return False
    except Exception:
        return False

# ---------------------------------------------------------------------------
# Team Membership Detection
# ---------------------------------------------------------------------------

def detect_team_membership(session_id):
    """Detect if this session belongs to a tmux teammate.

    Tmux teammates spawn as independent sessions — their SessionStart
    payload lacks team/agent metadata.  This function recovers that info
    by scanning active team configs and checking env vars.

    Returns a dict with team_name, teammate_name, teammate_type if found,
    or an empty dict otherwise.
    """
    result = {}

    # --- Strategy 1: env vars (Claude Code may set these for teammates) ---
    team_name = os.environ.get('CLAUDE_AGENT_TEAM_NAME') or os.environ.get('CLAUDE_TEAM_NAME', '')
    agent_name = os.environ.get('CLAUDE_AGENT_NAME', '')
    agent_type = os.environ.get('CLAUDE_AGENT_TYPE', '')

    if team_name:
        result['team_name'] = team_name
        if agent_name:
            result['teammate_name'] = agent_name
        if agent_type:
            result['teammate_type'] = agent_type
        return result

    # --- Strategy 2: scan ~/.claude/teams/*/config.json ---
    # Config schema:
    #   leadSessionId: str        — lead's session_id
    #   members[]:
    #     agentId: "name@team"    — unique identifier
    #     name: str               — human-readable name
    #     agentType: str          — e.g. "Explore", "team-lead"
    #     isActive: bool          — whether currently running
    #     tmuxPaneId: str         — tmux pane (e.g. "%39")
    teams_dir = Path.home() / '.claude' / 'teams'
    if not teams_dir.is_dir():
        return result

    try:
        for team_dir in teams_dir.iterdir():
            if not team_dir.is_dir():
                continue
            config_path = team_dir / 'config.json'
            if not config_path.exists():
                continue
            try:
                with open(config_path, 'r') as f:
                    config = json.load(f)
            except (json.JSONDecodeError, OSError):
                continue

            lead_session_id = config.get('leadSessionId', '')
            members = config.get('members', [])
            if not members:
                continue

            # If this session IS the lead, tag as team lead
            if lead_session_id == session_id:
                result['team_name'] = team_dir.name
                result['is_team_lead'] = True
                result['team_member_count'] = len([
                    m for m in members
                    if m.get('name') != 'team-lead'
                ])
                return result

            # If this session is NOT the lead, we're likely a teammate.
            # Try to identify which one by matching tmux pane ID.
            if lead_session_id and lead_session_id != session_id:
                # Try to get our tmux pane ID for matching
                our_pane = os.environ.get('TMUX_PANE', '')
                matched_member = None

                if our_pane:
                    for member in members:
                        if member.get('tmuxPaneId') == our_pane:
                            matched_member = member
                            break

                if matched_member:
                    result['team_name'] = team_dir.name
                    result['teammate_name'] = matched_member.get('name', '')
                    result['teammate_type'] = matched_member.get('agentType', '')
                    result['is_team_lead'] = False
                    return result

                # Pane match failed — still tag with team name.
                # This session started while a team is active and
                # it's not the lead, so it's almost certainly a teammate.
                # Try active members first, then all non-lead as fallback.
                non_lead_active = [
                    m for m in members
                    if m.get('name') != 'team-lead' and m.get('isActive')
                ]
                non_lead_all = [
                    m for m in members
                    if m.get('name') != 'team-lead'
                ]
                # Prefer active list, fall back to all non-lead
                candidates = non_lead_active if non_lead_active else non_lead_all
                if candidates:
                    result['team_name'] = team_dir.name
                    result['is_team_lead'] = False
                    result['team_member_count'] = len(candidates)
                    # If only one candidate, we can identify them
                    if len(candidates) == 1:
                        result['teammate_name'] = candidates[0].get('name', '')
                        result['teammate_type'] = candidates[0].get('agentType', '')
                    return result

    except OSError:
        pass

    return result


def main():
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Send Claude Code hook events to observability server')
    parser.add_argument('--source-app', required=True, help='Source application name')
    parser.add_argument('--event-type', required=True, help='Hook event type (PreToolUse, PostToolUse, etc.)')
    parser.add_argument('--server-url', default='http://localhost:4000/events', help='Server URL')
    parser.add_argument('--add-chat', action='store_true', help='Include chat transcript if available')
    parser.add_argument('--summarize', action='store_true', help='Generate AI summary of the event')
    
    args = parser.parse_args()
    
    try:
        # Read hook data from stdin
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError:
        sys.exit(1)
    
    # Extract model name from transcript (with caching)
    session_id = input_data.get('session_id', 'unknown')
    transcript_path = input_data.get('transcript_path', '')
    model_name = ''
    if transcript_path:
        model_name = get_model_from_transcript(session_id, transcript_path)

    # Prepare event data for server
    event_data = {
        'source_app': args.source_app,
        'session_id': session_id,
        'hook_event_type': args.event_type,
        'payload': input_data,
        'timestamp': int(datetime.now().timestamp() * 1000),
        'model_name': model_name
    }

    # Forward event-specific fields as top-level properties for easier querying.
    # These fields are only present for certain event types.

    # tool_name: PreToolUse, PostToolUse, PostToolUseFailure, PermissionRequest
    if 'tool_name' in input_data:
        event_data['tool_name'] = input_data['tool_name']

    # tool_use_id: PreToolUse, PostToolUse, PostToolUseFailure
    if 'tool_use_id' in input_data:
        event_data['tool_use_id'] = input_data['tool_use_id']

    # error, is_interrupt: PostToolUseFailure
    if 'error' in input_data:
        event_data['error'] = input_data['error']
    if 'is_interrupt' in input_data:
        event_data['is_interrupt'] = input_data['is_interrupt']

    # permission_suggestions: PermissionRequest
    if 'permission_suggestions' in input_data:
        event_data['permission_suggestions'] = input_data['permission_suggestions']

    # agent_id: SubagentStart, SubagentStop
    if 'agent_id' in input_data:
        event_data['agent_id'] = input_data['agent_id']

    # agent_type: SessionStart, SubagentStart, SubagentStop
    if 'agent_type' in input_data:
        event_data['agent_type'] = input_data['agent_type']

    # agent_transcript_path: SubagentStop
    if 'agent_transcript_path' in input_data:
        event_data['agent_transcript_path'] = input_data['agent_transcript_path']

    # stop_hook_active: Stop, SubagentStop
    if 'stop_hook_active' in input_data:
        event_data['stop_hook_active'] = input_data['stop_hook_active']

    # notification_type: Notification
    if 'notification_type' in input_data:
        event_data['notification_type'] = input_data['notification_type']

    # custom_instructions: PreCompact
    if 'custom_instructions' in input_data:
        event_data['custom_instructions'] = input_data['custom_instructions']

    # source: SessionStart
    if 'source' in input_data:
        event_data['source'] = input_data['source']

    # reason: SessionEnd
    if 'reason' in input_data:
        event_data['reason'] = input_data['reason']

    # Team membership detection: enrich ALL events for tmux teammates
    # (env-var path is instant; filesystem scan only runs as fallback)
    team_info = detect_team_membership(session_id)
    if team_info:
        event_data['team_info'] = team_info
        # Also inject into payload so it's queryable from the payload JSON
        input_data['team_info'] = team_info

    # For SubagentStart/SubagentStop: resolve spawned agent name from agent_id
    if args.event_type in ('SubagentStart', 'SubagentStop') and 'agent_id' in input_data:
        agent_id = input_data['agent_id']
        # Team agent IDs use "name@team" format
        if '@' in agent_id:
            parts = agent_id.split('@', 1)
            event_data['spawned_agent_name'] = parts[0]
            event_data['spawned_team_name'] = parts[1]
            input_data['spawned_agent_name'] = parts[0]
            input_data['spawned_team_name'] = parts[1]
    
    # Handle --add-chat option
    if args.add_chat and 'transcript_path' in input_data:
        transcript_path = input_data['transcript_path']
        if os.path.exists(transcript_path):
            # Read .jsonl file and convert to JSON array
            chat_data = []
            try:
                with open(transcript_path, 'r') as f:
                    for line in f:
                        line = line.strip()
                        if line:
                            try:
                                chat_data.append(json.loads(line))
                            except json.JSONDecodeError:
                                pass  # Skip invalid lines
                
                # Add chat to event data
                event_data['chat'] = chat_data
            except Exception:
                pass
    
    # Generate summary if requested
    if args.summarize:
        summary = generate_event_summary(event_data)
        if summary:
            event_data['summary'] = summary
        # Continue even if summary generation fails
    
    # Send to server
    success = send_event_to_server(event_data, args.server_url)
    
    # Always exit with 0 to not block Claude Code operations
    sys.exit(0)

if __name__ == '__main__':
    main()
