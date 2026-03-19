#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.8"
# dependencies = ["pyyaml"]
# ///

"""
Claude Code Hook: Library Sync

Auto-regenerates library.yaml whenever the codebase's skills, agents,
or commands change. Triggered as a post_tool_use hook.

Relevant triggers:
  - Write/Edit touching .agents/skills/, .claude/agents/, .claude/commands/
  - Bash running npx skills add/install/update
  - SessionStart events (always regenerate)
"""

import hashlib
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

try:
    import yaml
except ImportError:
    # If pyyaml is not available, exit gracefully
    sys.exit(0)

from utils.constants import ensure_session_log_dir


# ---------------------------------------------------------------------------
# Frontmatter parsing
# ---------------------------------------------------------------------------

def parse_frontmatter(text):
    """Parse YAML frontmatter from a markdown file (between --- delimiters)."""
    if not text.startswith("---"):
        return {}, text
    parts = text.split("---", 2)
    if len(parts) < 3:
        return {}, text
    try:
        fm = yaml.safe_load(parts[1])
        if not isinstance(fm, dict):
            fm = {}
    except yaml.YAMLError:
        # YAML parsing failed (e.g., bracket values that look like lists).
        # Fall back to simple regex extraction of key fields.
        fm = _regex_parse_frontmatter(parts[1])
    body = parts[2]
    return fm, body


def _regex_parse_frontmatter(raw_text):
    """Fallback frontmatter parser using regex for files with invalid YAML."""
    fm = {}
    for line in raw_text.strip().split("\n"):
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        match = re.match(r"^([\w-]+):\s*(.+)$", line)
        if match:
            key = match.group(1)
            value = match.group(2).strip()
            # Keep value as-is (string), don't try to parse YAML types
            fm[key] = value
    return fm


def read_frontmatter(file_path):
    """Read a file and return its parsed frontmatter and body."""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
        return parse_frontmatter(content)
    except Exception:
        return {}, ""


# ---------------------------------------------------------------------------
# Trigger phrase extraction
# ---------------------------------------------------------------------------

# Match the trigger phrase region in descriptions.
# The region starts with "Also use when the user mentions/says/asks for"
# and ends at a sentence boundary. Handles various quote+period orderings:
#   'phrase.' or 'phrase'.  or "phrase." etc.
_TRIGGER_PATTERN = re.compile(
    r"Also use when the user (?:mentions|says|asks for)\s+(.+?)"
    r"(?:"
    r"['\u2019\u201d\"]\.\s"        # quote then period then space: '. or ".
    r"|['\u2019\u201d\"]\.$"        # quote then period at end of string
    r"|\.['\u2019\u201d\"]\s"       # period then quote then space: .' or ."
    r"|\.['\u2019\u201d\"]$"        # period then quote at end of string
    r"|\.\s+(?:Use |For |Covers )"  # period then "Use this..." / "For X..." / "Covers..."
    r")",
    re.IGNORECASE | re.DOTALL,
)

# Match quoted strings using curly double quotes or straight double quotes.
# NOT straight single quotes (they are ambiguous with apostrophes).
_QUOTED_STRING_STRICT = re.compile(
    r'(?:'
    r'\u201c([^\u201d]+?)\u201d'     # curly double quotes
    r'|'
    r'"([^"]+?)"'                     # straight double quotes
    r')'
)

# Pattern to extract phrases from single-quote-delimited lists.
# Matches the entire block of 'phrase1,' 'phrase2,' or 'phrase3'
# and splits on the delimiter pattern.
_SINGLE_QUOTE_LIST = re.compile(
    r"'([^']*(?:'[^',]*)*)',?\s*(?:or\s+)?(?='|$)"
)

def _extract_single_quote_phrases(text):
    """Extract phrases from single-quote-delimited lists, handling apostrophes.

    Strategy: split the text on ,' or ,' or ' boundaries, then strip quotes.
    For the last part, truncate at the closing quote before any trailing text.
    """
    # Split on the boundary: ,' ' or ,' or '
    parts = re.split(r"['\u2019],?\s+(?:or\s+)?['\u2018]", text)
    if len(parts) <= 1:
        return []

    phrases = []
    for i, part in enumerate(parts):
        p = part
        if i == len(parts) - 1:
            # Last part: truncate at the closing quote
            # e.g., "customers are leaving.' Use this whenever..." -> "customers are leaving"
            close_match = re.search(r"['\u2019]\.\s", p)
            if close_match:
                p = p[:close_match.start()]
            else:
                # Try just closing quote followed by non-word
                close_match2 = re.search(r"['\u2019](?:\s|$)", p)
                if close_match2:
                    p = p[:close_match2.start()]

        # Strip leading/trailing quotes and punctuation
        p = p.strip("'\u2018\u2019.,;: ")
        if p and len(p) > 1:
            phrases.append(p)
    return phrases


def extract_trigger_phrases(description):
    """Extract trigger phrases from a skill description.

    Looks for patterns like:
      'Also use when the user mentions "X," "Y," "Z".'
    and extracts the quoted strings into a comma-separated string.
    If no explicit trigger phrases found, extracts key phrases from description.
    """
    if not description:
        return ""

    match = _TRIGGER_PATTERN.search(description)
    if match:
        trigger_text = match.group(1)
        phrases = _extract_quoted_phrases(trigger_text)
        if phrases:
            return ", ".join(phrases)

    # Fallback: try to extract quoted strings from the full description
    # (handles cases like 'when they ask questions like "X", "Y", "Z"')
    all_phrases = _extract_quoted_phrases(description)
    if all_phrases:
        return ", ".join(all_phrases)

    return ""


def _extract_quoted_phrases(text):
    """Extract and clean quoted phrases from text.

    Tries curly/straight double quotes first (unambiguous),
    then falls back to single-quote list splitting (handles apostrophes).
    """
    # Try strict double-quote matching first
    raw_matches = _QUOTED_STRING_STRICT.findall(text)
    if raw_matches:
        cleaned = []
        for groups in raw_matches:
            p = groups[0] or groups[1]  # whichever group matched
            p = p.rstrip(".,;:\u201d\u201c\"'")
            p = p.strip()
            if p and len(p) > 1:
                cleaned.append(p)
        if cleaned:
            return cleaned

    # Fall back to single-quote list extraction
    single_phrases = _extract_single_quote_phrases(text)
    if single_phrases:
        return single_phrases

    return []


# ---------------------------------------------------------------------------
# See-also extraction
# ---------------------------------------------------------------------------

_SEE_ALSO_PATTERN = re.compile(r"\bsee\s+([\w-]+)", re.IGNORECASE)


def extract_see_also(description):
    """Extract 'see <skill-name>' references from a description string."""
    if not description:
        return []
    matches = _SEE_ALSO_PATTERN.findall(description)
    # Filter words that are clearly not skill names
    skip = {"the", "if", "a", "an", "this", "that", "it", "how", "what", "also"}
    # Deduplicate while preserving order
    seen = set()
    result = []
    for m in matches:
        if m.lower() not in skip and m not in seen:
            seen.add(m)
            result.append(m)
    return result


# ---------------------------------------------------------------------------
# Source URL formatting
# ---------------------------------------------------------------------------

def format_source_url(lock_entry):
    """Format a source URL from a skills-lock.json entry.

    For GitHub sources, returns https://github.com/{source}.
    For other sources, returns the source as-is.
    """
    if not lock_entry:
        return "local"
    source = lock_entry.get("source", "")
    source_type = lock_entry.get("sourceType", "")
    if source and source_type == "github":
        return "https://github.com/{}".format(source)
    if source:
        return source
    return "local"


# ---------------------------------------------------------------------------
# Directory scanners
# ---------------------------------------------------------------------------

def scan_skills(project_dir):
    """Scan .agents/skills/*/SKILL.md and return skill entries."""
    skills_dir = project_dir / ".agents" / "skills"
    if not skills_dir.is_dir():
        return []

    # Load skills-lock.json for source info
    lock_data = {}
    lock_path = project_dir / "skills-lock.json"
    if lock_path.exists():
        try:
            with open(lock_path, "r", encoding="utf-8") as f:
                lock_json = json.load(f)
            lock_data = lock_json.get("skills", {})
        except Exception:
            pass

    entries = []
    for skill_dir in sorted(skills_dir.iterdir()):
        if not skill_dir.is_dir():
            continue
        skill_md = skill_dir / "SKILL.md"
        if not skill_md.exists():
            continue

        fm, _body = read_frontmatter(skill_md)
        skill_name = fm.get("name", skill_dir.name)
        description = fm.get("description", "")
        metadata = fm.get("metadata", {})

        # Clean description: strip trigger/usage suffixes for the description field
        clean_desc = description
        if description:
            # Strip everything from "Also use when" onwards
            also_match = re.search(r"\s*Also use when", description)
            if also_match:
                clean_desc = description[:also_match.start()].rstrip()
                if not clean_desc.endswith("."):
                    clean_desc = clean_desc + "."
            # Strip "Use when the user..." suffix
            use_when_match = re.search(r"\s*Use when the user", clean_desc)
            if use_when_match:
                clean_desc = clean_desc[:use_when_match.start()].rstrip()
                if not clean_desc.endswith("."):
                    clean_desc = clean_desc + "."
            # Strip "Use this whenever..." suffix
            use_match = re.search(r"\s*Use this whenever", clean_desc)
            if use_match:
                clean_desc = clean_desc[:use_match.start()].rstrip()
                if not clean_desc.endswith("."):
                    clean_desc = clean_desc + "."
            # Strip "This skill should be used..." suffix
            skill_match = re.search(r"\s*This skill should be used", clean_desc)
            if skill_match:
                clean_desc = clean_desc[:skill_match.start()].rstrip()
                if not clean_desc.endswith("."):
                    clean_desc = clean_desc + "."

        entry = {
            "name": skill_name,
            "description": clean_desc if clean_desc else description,
        }

        # Extract trigger phrases
        trigger = extract_trigger_phrases(description)
        entry["trigger"] = trigger if trigger else ""

        # Source from lock data
        lock_entry = lock_data.get(skill_dir.name, {})
        entry["source"] = format_source_url(lock_entry)

        # Path
        entry["path"] = str(skill_md.relative_to(project_dir))

        # Version from metadata
        version = None
        if isinstance(metadata, dict):
            version = metadata.get("version")
        entry["version"] = str(version) if version else None

        # See-also (rendered as flow-style list)
        see_also = extract_see_also(description)
        entry["see_also"] = _FlowList(see_also)

        entries.append(entry)

    return entries


def _generate_agent_trigger(description):
    """Generate a trigger description for an agent based on its description.

    Looks for "Use (proactively) to/when..." or "Use after..." patterns
    in any part of the description, not just the start.
    """
    if not description:
        return ""

    # Look for "Use after..." pattern anywhere in description
    after_match = re.search(r"Use after\s+(.+?)(?:\.|$)", description, re.IGNORECASE)
    if after_match:
        rest = after_match.group(1).strip().rstrip(".")
        return "After " + rest[0].lower() + rest[1:]

    # Look for "Use (proactively) when..." pattern -- "when" introduces a condition
    use_when_match = re.search(
        r"Use\s+(?:proactively\s+)?(?:this\s+)?when\s+(.+?)(?:\.|$)",
        description,
        re.IGNORECASE,
    )
    if use_when_match:
        rest = use_when_match.group(1).strip().rstrip(".")
        if rest:
            return "When " + rest[0].lower() + rest[1:]

    # Look for "Use (proactively) to..." pattern -- "to" introduces an action
    use_to_match = re.search(
        r"Use\s+(?:proactively\s+)?(?:this\s+)?to\s+(.+?)(?:\.|$)",
        description,
        re.IGNORECASE,
    )
    if use_to_match:
        rest = use_to_match.group(1).strip().rstrip(".")
        if rest:
            return "When you need to " + rest[0].lower() + rest[1:]

    # Default: construct from cleaned description
    cleaned = re.sub(
        r"^(?:Use this to|This agent)\s+", "", description,
        flags=re.IGNORECASE,
    )
    if cleaned:
        # Take first sentence
        first_sentence = cleaned.split(".")[0].strip()
        if first_sentence:
            return "When you need to " + first_sentence[0].lower() + first_sentence[1:]
    return ""


def scan_agents(project_dir):
    """Scan .claude/agents/*.md and .claude/agents/team/*.md."""
    agents_dir = project_dir / ".claude" / "agents"
    if not agents_dir.is_dir():
        return []

    entries = []
    # Collect agent files from agents/ and agents/team/
    agent_files = sorted(agents_dir.glob("*.md")) + sorted(
        (agents_dir / "team").glob("*.md") if (agents_dir / "team").is_dir() else []
    )

    for agent_md in agent_files:
        fm, _body = read_frontmatter(agent_md)

        # Determine the agent name, including team/ prefix for team agents
        if agent_md.parent.name == "team":
            agent_name = "team/" + fm.get("name", agent_md.stem)
        else:
            agent_name = fm.get("name", agent_md.stem)

        description = fm.get("description", "")

        # Clean description: strip "Use proactively to" prefix for cleaner display
        clean_desc = description
        if description:
            clean_desc = re.sub(
                r"^Use\s+(?:proactively\s+)?to\s+",
                "",
                description,
                flags=re.IGNORECASE,
            )
            if clean_desc != description:
                # Capitalize first letter
                clean_desc = clean_desc[0].upper() + clean_desc[1:] if clean_desc else clean_desc

            # Strip trailing "Use ..." suffix (Use this, Use after, Use when, Use proactively)
            use_suffix = re.search(r"\s*Use\s+(?:this\s+|after\s+|when\s+|proactively\s+)", clean_desc)
            if use_suffix:
                clean_desc = clean_desc[:use_suffix.start()].rstrip()
                if clean_desc and not clean_desc.endswith("."):
                    clean_desc += "."

        entry = {
            "name": agent_name,
            "description": clean_desc if clean_desc else description,
            "trigger": _generate_agent_trigger(description),
            "path": str(agent_md.relative_to(project_dir)),
            "model": fm.get("model") if fm.get("model") else None,
        }

        # Tools: parse comma-separated string into list (flow-style)
        tools_raw = fm.get("tools")
        if tools_raw:
            if isinstance(tools_raw, str):
                entry["tools"] = _FlowList([t.strip() for t in tools_raw.split(",")])
            elif isinstance(tools_raw, list):
                entry["tools"] = _FlowList(tools_raw)
            else:
                entry["tools"] = _FlowList([])
        else:
            entry["tools"] = _FlowList([])

        # Disallowed tools (flow-style)
        disallowed = fm.get("disallowedTools") or fm.get("disallowed-tools") or fm.get("disallowed_tools")
        if disallowed:
            if isinstance(disallowed, str):
                entry["disallowed_tools"] = _FlowList([t.strip() for t in disallowed.split(",")])
            elif isinstance(disallowed, list):
                entry["disallowed_tools"] = _FlowList(disallowed)

        entry["source"] = "local"

        entries.append(entry)

    return entries


def _generate_command_trigger(description):
    """Generate a trigger description for a command based on its description."""
    if not description:
        return ""
    desc_lower = description.lower()

    # If it already starts with "When", return as-is
    if desc_lower.startswith("when "):
        return description

    # Convert common patterns
    # "Run X" -> "When you want to run X"
    if desc_lower.startswith("run "):
        return "When you want to " + description[0].lower() + description[1:]

    # "Create X" -> "When you need a X"
    if desc_lower.startswith("create"):
        return "When you need to " + description[0].lower() + description[1:]

    # Default: "When you want to [description]"
    return "When you want to " + description[0].lower() + description[1:]


def _normalize_argument_hint(raw_hint):
    """Normalize argument_hint from frontmatter.

    YAML parses [foo] as a list and [foo] [bar] as a string.
    We want to preserve the original bracket notation as a string.
    """
    if raw_hint is None:
        return None
    if isinstance(raw_hint, list):
        # Convert list back to bracketed string: ['path-to-plan'] -> '[path-to-plan]'
        return " ".join("[{}]".format(item) for item in raw_hint)
    if isinstance(raw_hint, str) and raw_hint:
        return raw_hint
    return None


def scan_commands(project_dir):
    """Scan .claude/commands/*.md."""
    commands_dir = project_dir / ".claude" / "commands"
    if not commands_dir.is_dir():
        return []

    entries = []
    for cmd_md in sorted(commands_dir.glob("*.md")):
        fm, _body = read_frontmatter(cmd_md)
        cmd_name = cmd_md.stem
        description = fm.get("description", "")

        entry = {
            "name": cmd_name,
            "description": description,
            "trigger": _generate_command_trigger(description),
            "path": str(cmd_md.relative_to(project_dir)),
            "argument_hint": _normalize_argument_hint(fm.get("argument-hint")),
            "source": "local",
        }

        entries.append(entry)

    return entries


# ---------------------------------------------------------------------------
# Library generation
# ---------------------------------------------------------------------------

def build_library(project_dir):
    """Build the full library catalog dict."""
    return {
        "default_dirs": {
            "skills": [
                {"default": ".agents/skills/"},
                {"global": "~/.claude/skills/"},
            ],
            "agents": [
                {"default": ".claude/agents/"},
                {"global": "~/.claude/agents/"},
            ],
            "commands": [
                {"default": ".claude/commands/"},
                {"global": "~/.claude/commands/"},
            ],
        },
        "library": {
            "skills": scan_skills(project_dir),
            "agents": scan_agents(project_dir),
            "commands": scan_commands(project_dir),
        },
    }


class _FlowList(list):
    """A list subclass that signals it should be rendered in YAML flow style."""
    pass


class _LibraryDumper(yaml.Dumper):
    """Custom YAML dumper for library output."""
    pass


def _represent_none(dumper, data):
    """Represent None as ~ in YAML output."""
    return dumper.represent_scalar("tag:yaml.org,2002:null", "~")


def _represent_flow_list(dumper, data):
    """Represent _FlowList instances in flow style."""
    return dumper.represent_sequence("tag:yaml.org,2002:seq", data, flow_style=True)


_LibraryDumper.add_representer(type(None), _represent_none)
_LibraryDumper.add_representer(_FlowList, _represent_flow_list)


def render_yaml(library):
    """Render the library dict to a YAML string with a comment header."""
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    header_lines = [
        "# Adcelerate Library Catalog",
        "# Auto-generated by library_sync.py \u2014 do not edit manually",
        "# Last updated: {}".format(now),
        "",
    ]

    body = yaml.dump(
        library,
        Dumper=_LibraryDumper,
        default_flow_style=False,
        sort_keys=False,
        allow_unicode=True,
        width=200,
    )
    header_lines.append(body)
    return "\n".join(header_lines)


def _strip_timestamp_line(content):
    """Strip the 'Last updated' line for hash comparison purposes."""
    lines = content.split("\n")
    filtered = [line for line in lines if not line.startswith("# Last updated:")]
    return "\n".join(filtered)


def write_if_changed(output_path, content):
    """Write content to file only if the hash has changed (ignoring timestamp). Returns True if written."""
    new_hash = hashlib.sha256(
        _strip_timestamp_line(content).encode("utf-8")
    ).hexdigest()

    if output_path.exists():
        try:
            with open(output_path, "r", encoding="utf-8") as f:
                existing = f.read()
            old_hash = hashlib.sha256(
                _strip_timestamp_line(existing).encode("utf-8")
            ).hexdigest()
            if old_hash == new_hash:
                return False
        except Exception:
            pass

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(content)
    return True


# ---------------------------------------------------------------------------
# Change detection
# ---------------------------------------------------------------------------

_RELEVANT_PATHS = (
    ".agents/skills/",
    ".claude/agents/",
    ".claude/commands/",
)

_SKILL_COMMANDS = re.compile(
    r"npx\s+skills?\s+(add|install|update|remove|delete)", re.IGNORECASE
)


def is_relevant_change(input_data):
    """Determine if this hook event should trigger a library regeneration."""
    hook_event = input_data.get("hook_event_name", "")

    # Always regenerate on SessionStart
    if hook_event == "SessionStart":
        return True

    tool_name = input_data.get("tool_name", "")
    tool_input = input_data.get("tool_input", {})

    # Write or Edit touching relevant paths
    if tool_name in ("Write", "Edit", "MultiEdit"):
        file_path = tool_input.get("file_path", "")
        for prefix in _RELEVANT_PATHS:
            if prefix in file_path:
                return True
        return False

    # Bash running skills CLI commands
    if tool_name == "Bash":
        command = tool_input.get("command", "")
        if _SKILL_COMMANDS.search(command):
            return True
        return False

    return False


# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

def log_event(log_dir, message, data=None):
    """Append a log entry to the library_sync log file."""
    log_path = log_dir / "library_sync.json"

    if log_path.exists():
        try:
            with open(log_path, "r") as f:
                log_data = json.load(f)
        except (json.JSONDecodeError, ValueError):
            log_data = []
    else:
        log_data = []

    entry = {
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "message": message,
    }
    if data:
        entry["data"] = data

    log_data.append(entry)

    with open(log_path, "w") as f:
        json.dump(log_data, f, indent=2)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    try:
        # Read JSON input from stdin
        try:
            input_data = json.load(sys.stdin)
        except (json.JSONDecodeError, EOFError):
            input_data = {}

        # Check if this event is relevant
        if not is_relevant_change(input_data):
            sys.exit(0)

        # Resolve project directory
        project_dir = Path(
            os.environ.get("CLAUDE_PROJECT_DIR", os.getcwd())
        ).resolve()

        # Set up logging
        session_id = input_data.get("session_id", "unknown")
        log_dir = ensure_session_log_dir(session_id)

        log_event(log_dir, "library_sync triggered", {
            "hook_event": input_data.get("hook_event_name", ""),
            "tool_name": input_data.get("tool_name", ""),
        })

        # Build and render
        library = build_library(project_dir)
        content = render_yaml(library)

        # Write if changed
        output_path = project_dir / "library.yaml"
        written = write_if_changed(output_path, content)

        log_event(log_dir, "library_sync complete", {
            "written": written,
            "output": str(output_path),
        })

        sys.exit(0)

    except Exception:
        # Exit cleanly on any error
        sys.exit(0)


if __name__ == "__main__":
    main()
