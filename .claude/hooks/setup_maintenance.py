#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pyyaml"]
# ///
"""Claude Code Setup Hook: Maintenance Mode

Triggered by: claude --maintenance
Purpose: Run project health and maintenance checks for Adcelerate.
"""

import json
import os
import shutil
import sqlite3
import subprocess
import sys
from datetime import datetime
from pathlib import Path

LOG_FILE = Path(__file__).parent / "setup.maintenance.log"


def log(msg: str) -> None:
    """Append message to log file."""
    with open(LOG_FILE, "a") as f:
        f.write(msg + "\n")


# ---------------------------------------------------------------------------
# Check result helpers
# ---------------------------------------------------------------------------

class CheckResult:
    def __init__(self, name: str, status: str, message: str):
        self.name = name
        self.status = status  # "pass", "warn", "fail"
        self.message = message

    @property
    def icon(self) -> str:
        return {"pass": "\u2705", "warn": "\u26a0\ufe0f", "fail": "\u274c"}.get(
            self.status, "?"
        )

    def __str__(self) -> str:
        return f"{self.icon} [{self.status.upper()}] {self.name}: {self.message}"


def _human_size(nbytes: int | float) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if abs(nbytes) < 1024:
            return f"{nbytes:.1f} {unit}"
        nbytes /= 1024
    return f"{nbytes:.1f} TB"


def _dir_size(path: Path) -> int:
    total = 0
    if path.is_dir():
        for f in path.rglob("*"):
            if f.is_file():
                try:
                    total += f.stat().st_size
                except OSError:
                    pass
    return total


# ---------------------------------------------------------------------------
# Individual checks
# ---------------------------------------------------------------------------

def check_database_health(project: Path) -> list[CheckResult]:
    """Check SQLite database existence, integrity, row counts, WAL files."""
    results: list[CheckResult] = []
    db_path = project / "apps" / "server" / "events.db"

    if not db_path.exists():
        results.append(CheckResult("Database exists", "fail", f"{db_path} not found"))
        return results

    results.append(CheckResult("Database exists", "pass", str(db_path)))

    # Integrity check
    try:
        conn = sqlite3.connect(str(db_path))
        cur = conn.execute("PRAGMA integrity_check")
        integrity = cur.fetchone()[0]
        if integrity == "ok":
            results.append(CheckResult("Database integrity", "pass", "PRAGMA integrity_check = ok"))
        else:
            results.append(CheckResult("Database integrity", "fail", f"integrity_check returned: {integrity}"))
    except Exception as exc:
        results.append(CheckResult("Database integrity", "fail", f"Error running integrity check: {exc}"))
    else:
        # Row count in events table
        try:
            row_count = conn.execute("SELECT COUNT(*) FROM events").fetchone()[0]
            if row_count > 50_000:
                results.append(CheckResult("Events row count", "warn", f"{row_count:,} rows (> 50k threshold)"))
            else:
                results.append(CheckResult("Events row count", "pass", f"{row_count:,} rows"))
        except Exception as exc:
            results.append(CheckResult("Events row count", "warn", f"Could not query events table: {exc}"))
        finally:
            conn.close()

    # WAL / SHM files
    for suffix in ("-wal", "-shm"):
        wal_path = db_path.parent / f"events.db{suffix}"
        if wal_path.exists():
            size = wal_path.stat().st_size
            status = "warn" if size > 10 * 1024 * 1024 else "pass"
            results.append(CheckResult(f"WAL file {suffix}", status, f"{wal_path.name} exists ({_human_size(size)})"))

    return results


def check_log_hygiene(project: Path) -> list[CheckResult]:
    """Check log directory sizes, session dirs, hook log files."""
    results: list[CheckResult] = []
    logs_dir = project / "logs"

    if not logs_dir.is_dir():
        results.append(CheckResult("Logs directory", "pass", "logs/ does not exist (nothing to clean)"))
        return results

    total = _dir_size(logs_dir)
    status = "warn" if total > 50 * 1024 * 1024 else "pass"
    results.append(CheckResult("Logs directory size", status, f"{_human_size(total)}"))

    # Count session subdirectories
    session_dirs = [d for d in logs_dir.iterdir() if d.is_dir()]
    results.append(CheckResult("Session directories", "pass", f"{len(session_dirs)} session dir(s) in logs/"))

    # Check hook log files
    hooks_dir = project / ".claude" / "hooks"
    if hooks_dir.is_dir():
        hook_logs = list(hooks_dir.glob("*.log"))
        for lf in hook_logs:
            try:
                size = lf.stat().st_size
                status = "warn" if size > 5 * 1024 * 1024 else "pass"
                results.append(CheckResult(f"Hook log {lf.name}", status, _human_size(size)))
            except OSError:
                pass

    return results


def check_library_catalog(project: Path) -> list[CheckResult]:
    """Validate library.yaml existence, YAML parse, and sample file references."""
    results: list[CheckResult] = []
    catalog = project / "library.yaml"

    if not catalog.exists():
        results.append(CheckResult("Library catalog", "fail", "library.yaml not found"))
        return results

    results.append(CheckResult("Library catalog exists", "pass", str(catalog)))

    try:
        import yaml

        with open(catalog) as f:
            data = yaml.safe_load(f)
    except Exception as exc:
        results.append(CheckResult("Library catalog parse", "fail", f"YAML parse error: {exc}"))
        return results

    if not isinstance(data, dict):
        results.append(CheckResult("Library catalog parse", "warn", f"Top-level type is {type(data).__name__}, expected dict"))
        return results

    results.append(CheckResult("Library catalog parse", "pass", "Valid YAML"))

    # Count entries per category — support both top-level and nested under "library"
    library = data.get("library", data)
    for category in ("skills", "agents", "commands"):
        items = library.get(category)
        if isinstance(items, (list, dict)):
            count = len(items)
            results.append(CheckResult(f"Catalog {category}", "pass", f"{count} entries"))
        else:
            results.append(CheckResult(f"Catalog {category}", "warn", f"'{category}' key missing or unexpected type"))

    # Verify a sample of referenced file paths
    missing = []
    checked = 0
    for _category, items in library.items():
        if not isinstance(items, list):
            continue
        for item in items:
            if not isinstance(item, dict):
                continue
            file_ref = item.get("file") or item.get("path") or item.get("source")
            if file_ref:
                checked += 1
                ref_path = project / file_ref
                if not ref_path.exists():
                    missing.append(file_ref)
            if checked >= 10:
                break
        if checked >= 10:
            break

    if checked > 0:
        if missing:
            results.append(CheckResult(
                "Catalog file refs",
                "warn",
                f"{len(missing)}/{checked} sampled refs missing: {', '.join(missing[:3])}",
            ))
        else:
            results.append(CheckResult("Catalog file refs", "pass", f"All {checked} sampled refs exist"))

    return results


def check_git_submodule(project: Path) -> list[CheckResult]:
    """Check that the pinboard submodule is initialized."""
    results: list[CheckResult] = []

    try:
        proc = subprocess.run(
            ["git", "submodule", "status"],
            capture_output=True,
            text=True,
            cwd=str(project),
            timeout=10,
        )
        output = proc.stdout.strip()
        if not output:
            results.append(CheckResult("Git submodule", "warn", "No submodules found in git output"))
            return results

        for line in output.splitlines():
            line = line.strip()
            if "pinboard" in line:
                if line.startswith("-"):
                    results.append(CheckResult("Pinboard submodule", "fail", f"Not initialized: {line}"))
                elif line.startswith("+"):
                    results.append(CheckResult("Pinboard submodule", "warn", f"Out of sync: {line}"))
                else:
                    results.append(CheckResult("Pinboard submodule", "pass", f"Initialized: {line[:50]}"))
                break
        else:
            results.append(CheckResult("Pinboard submodule", "warn", "pinboard not found in submodule status"))

    except FileNotFoundError:
        results.append(CheckResult("Git submodule", "fail", "git not found on PATH"))
    except subprocess.TimeoutExpired:
        results.append(CheckResult("Git submodule", "warn", "git submodule status timed out"))
    except Exception as exc:
        results.append(CheckResult("Git submodule", "fail", f"Error: {exc}"))

    return results


def check_hook_scripts(project: Path) -> list[CheckResult]:
    """Verify all .py files in hooks dir are non-empty; check utils package."""
    results: list[CheckResult] = []
    hooks_dir = project / ".claude" / "hooks"

    if not hooks_dir.is_dir():
        results.append(CheckResult("Hooks directory", "fail", ".claude/hooks/ not found"))
        return results

    py_files = sorted(hooks_dir.glob("*.py"))
    empty = []
    for pf in py_files:
        try:
            if pf.stat().st_size == 0:
                empty.append(pf.name)
        except OSError:
            empty.append(f"{pf.name} (unreadable)")

    if empty:
        results.append(CheckResult("Hook scripts", "warn", f"{len(empty)} empty: {', '.join(empty)}"))
    else:
        results.append(CheckResult("Hook scripts", "pass", f"{len(py_files)} scripts, all non-empty"))

    # Utils package
    utils_dir = hooks_dir / "utils"
    utils_init = utils_dir / "__init__.py"
    if utils_dir.is_dir():
        if utils_init.exists():
            results.append(CheckResult("Utils package", "pass", "utils/__init__.py exists"))
        else:
            results.append(CheckResult("Utils package", "warn", "utils/ exists but missing __init__.py"))
    else:
        results.append(CheckResult("Utils package", "warn", "utils/ directory not found"))

    return results


def check_dependencies(project: Path) -> list[CheckResult]:
    """Check bun availability and node_modules directories."""
    results: list[CheckResult] = []

    # bun on PATH
    bun_path = shutil.which("bun")
    if bun_path:
        try:
            proc = subprocess.run(
                ["bun", "--version"],
                capture_output=True,
                text=True,
                timeout=5,
            )
            version = proc.stdout.strip()
            results.append(CheckResult("Bun runtime", "pass", f"v{version} at {bun_path}"))
        except Exception:
            results.append(CheckResult("Bun runtime", "pass", f"Found at {bun_path}"))
    else:
        results.append(CheckResult("Bun runtime", "fail", "bun not found on PATH"))

    # node_modules
    for app in ("server", "client"):
        nm = project / "apps" / app / "node_modules"
        if nm.is_dir():
            results.append(CheckResult(f"{app} node_modules", "pass", "Exists"))
        else:
            results.append(CheckResult(f"{app} node_modules", "warn", f"apps/{app}/node_modules not found -- run bun install"))

    return results


def check_readme_drift(project: Path) -> list[CheckResult]:
    """Check if README drift flag exists, indicating stale READMEs."""
    results: list[CheckResult] = []
    drift_flag = project / "systems" / "readme-engine" / ".drift-flag"

    if not drift_flag.exists():
        results.append(CheckResult("README drift", "pass", "No drift flag — READMEs appear current"))
        return results

    try:
        with open(drift_flag, "r") as f:
            drift_data = json.load(f)
        scopes = drift_data.get("affected_scopes", [])
        n = len(scopes)
        scope_list = ", ".join(scopes[:5])
        results.append(CheckResult(
            "README drift",
            "warn",
            f"{n} README(s) may be stale. Run /readme-update to refresh. Scopes: {scope_list}",
        ))
    except (json.JSONDecodeError, Exception):
        results.append(CheckResult(
            "README drift",
            "warn",
            "Drift flag exists but unreadable. Run /readme-update to refresh.",
        ))

    return results


def check_stale_artifacts(project: Path) -> list[CheckResult]:
    """Check for worktree dirs in trees/ and orphaned .env.* files."""
    results: list[CheckResult] = []

    # Worktrees
    trees_dir = project / "trees"
    if trees_dir.is_dir():
        worktrees = [d for d in trees_dir.iterdir() if d.is_dir()]
        if worktrees:
            names = [w.name for w in worktrees[:5]]
            suffix = f" (and {len(worktrees) - 5} more)" if len(worktrees) > 5 else ""
            results.append(CheckResult(
                "Worktree dirs",
                "warn",
                f"{len(worktrees)} worktree(s) in trees/: {', '.join(names)}{suffix}",
            ))
        else:
            results.append(CheckResult("Worktree dirs", "pass", "trees/ is empty"))
    else:
        results.append(CheckResult("Worktree dirs", "pass", "No trees/ directory"))

    # Orphaned .env.* files
    env_files = sorted(project.glob(".env.*"))
    if env_files:
        names = [f.name for f in env_files]
        results.append(CheckResult("Env files", "warn", f"Found: {', '.join(names)}"))
    else:
        results.append(CheckResult("Env files", "pass", "No orphaned .env.* files"))

    return results


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    try:
        hook_input = json.load(sys.stdin)
    except Exception:
        hook_input = {}

    project = Path(os.environ.get("CLAUDE_PROJECT_DIR", os.getcwd()))

    log(f"\n{'=' * 60}")
    log(f"=== Maintenance Hook: {datetime.now().isoformat()} ===")
    log(f"{'=' * 60}")
    log(f"INPUT: {json.dumps(hook_input, indent=2)}")
    log(f"Project: {project}")

    # Run all check groups
    check_groups = [
        ("Database Health", check_database_health),
        ("Log Hygiene", check_log_hygiene),
        ("Library Catalog", check_library_catalog),
        ("Git Submodule", check_git_submodule),
        ("Hook Scripts", check_hook_scripts),
        ("Dependencies", check_dependencies),
        ("Stale Artifacts", check_stale_artifacts),
        ("README Drift", check_readme_drift),
    ]

    grouped_results: list[tuple[str, list[CheckResult]]] = []

    for group_name, check_fn in check_groups:
        log(f"\n--- {group_name} ---")
        try:
            results = check_fn(project)
        except Exception as exc:
            results = [CheckResult(group_name, "fail", f"Check crashed: {exc}")]

        for r in results:
            log(f"  {r}")
        grouped_results.append((group_name, results))

    # Flatten for counting
    all_results = [r for _, group in grouped_results for r in group]
    passed = sum(1 for r in all_results if r.status == "pass")
    warned = sum(1 for r in all_results if r.status == "warn")
    failed = sum(1 for r in all_results if r.status == "fail")

    summary_line = f"{passed} passed, {warned} warnings, {failed} failures"
    log(f"\n{'=' * 60}")
    log(f"SUMMARY: {summary_line}")
    log(f"{'=' * 60}")

    # Build context string for Claude (concise: only show issues per group)
    context_lines = [f"Maintenance check results ({summary_line}):\n"]
    for group_name, results in grouped_results:
        issues = [r for r in results if r.status != "pass"]
        if issues:
            context_lines.append(f"[{group_name}]")
            for r in issues:
                context_lines.append(f"  {r.icon} {r.name}: {r.message}")
        else:
            context_lines.append(f"[{group_name}] All checks passed")

    context = "\n".join(context_lines)

    output = {
        "hookSpecificOutput": {
            "hookEventName": "SessionStart",
            "additionalContext": context,
        }
    }

    log(f"\nOUTPUT: {json.dumps(output, indent=2)}")
    log(f"=== Completed: {datetime.now().isoformat()} ===")

    print(json.dumps(output))
    sys.exit(0)


if __name__ == "__main__":
    main()
