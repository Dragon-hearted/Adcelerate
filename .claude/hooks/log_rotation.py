#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Claude Code Hook: Log Rotation

Triggered by: SessionStart
Purpose: Prune old log files from logs/, .claude/hooks/logs/, and systems/*/logs/.

Environment variables:
  LOG_RETENTION_DAYS  — files older than N days are pruned (default: 7)
  LOG_RETENTION_MAX_MB — secondary cap; if a target dir exceeds this, prune
                         additional oldest files until under cap (default: 50)
  LOG_ROTATION_DRY_RUN — if set to "1", only report what would be deleted

Safety:
  - Files modified within the last 24 hours are NEVER deleted regardless of retention.
  - Operates only on configured target dirs; never recurses into .git or outside the project root.
  - Per-file errors are logged and skipped; never crashes the session-start chain.
"""

import json
import os
import sys
import time
from pathlib import Path

LOG_FILE = Path(__file__).parent / "log_rotation.log"

# 24-hour absolute safety floor; never delete anything newer than this.
SAFETY_FLOOR_SECONDS = 24 * 60 * 60


def log(msg: str) -> None:
    """Append message to log file (best-effort)."""
    try:
        with open(LOG_FILE, "a") as f:
            f.write(msg + "\n")
    except OSError:
        pass


def _human_size(nbytes: float) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if abs(nbytes) < 1024:
            return f"{nbytes:.1f} {unit}"
        nbytes /= 1024
    return f"{nbytes:.1f} TB"


def discover_targets(project: Path) -> list[Path]:
    """Return existing target directories for log rotation."""
    targets: list[Path] = []

    candidates = [
        project / "logs",
        project / ".claude" / "hooks" / "logs",
    ]

    systems_dir = project / "systems"
    if systems_dir.is_dir():
        for sub in sorted(systems_dir.iterdir()):
            if sub.is_dir() and sub.name != ".git":
                logs_sub = sub / "logs"
                if logs_sub.is_dir():
                    candidates.append(logs_sub)

    for c in candidates:
        if c.is_dir() and ".git" not in c.parts:
            targets.append(c)

    return targets


def collect_files(target: Path) -> list[Path]:
    """Return regular files under target, skipping anything under .git."""
    files: list[Path] = []
    try:
        for f in target.rglob("*"):
            if ".git" in f.parts:
                continue
            try:
                if f.is_file() and not f.is_symlink():
                    files.append(f)
            except OSError:
                continue
    except OSError as exc:
        log(f"WARN: rglob failed on {target}: {exc}")
    return files


def safe_delete(path: Path, dry_run: bool) -> tuple[bool, int]:
    """Try to delete path. Returns (deleted, size_freed_bytes)."""
    try:
        size = path.stat().st_size
    except OSError as exc:
        log(f"WARN: stat failed on {path}: {exc}")
        return False, 0

    if dry_run:
        return True, size

    try:
        path.unlink()
        return True, size
    except OSError as exc:
        log(f"WARN: delete failed on {path}: {exc}")
        return False, 0


def rotate_target(
    target: Path,
    retention_days: int,
    max_mb: int,
    dry_run: bool,
    now: float,
) -> tuple[int, int, int]:
    """Rotate one target dir.

    Returns (bytes_freed, files_deleted, files_kept).
    """
    age_cutoff = now - retention_days * 86400
    safety_cutoff = now - SAFETY_FLOOR_SECONDS

    files = collect_files(target)
    bytes_freed = 0
    files_deleted = 0

    # Phase A: age-based prune
    survivors: list[tuple[Path, float, int]] = []  # (path, mtime, size)
    for f in files:
        try:
            st = f.stat()
        except OSError as exc:
            log(f"WARN: stat failed during phase A on {f}: {exc}")
            continue

        mtime = st.st_mtime
        size = st.st_size

        # Safety floor: never delete files modified in the last 24h
        if mtime > safety_cutoff:
            survivors.append((f, mtime, size))
            continue

        if mtime < age_cutoff:
            ok, freed = safe_delete(f, dry_run)
            if ok:
                bytes_freed += freed
                files_deleted += 1
            else:
                survivors.append((f, mtime, size))
        else:
            survivors.append((f, mtime, size))

    # Phase B: size-cap prune (oldest-first), respecting safety floor
    cap_bytes = max_mb * 1024 * 1024
    current_size = sum(s for _, _, s in survivors)

    if current_size > cap_bytes:
        # Sort oldest first, but exclude files under safety floor entirely
        eligible = [t for t in survivors if t[1] <= safety_cutoff]
        protected = [t for t in survivors if t[1] > safety_cutoff]
        eligible.sort(key=lambda t: t[1])  # oldest first

        running = current_size
        new_survivors: list[tuple[Path, float, int]] = list(protected)

        for f, mtime, size in eligible:
            if running <= cap_bytes:
                new_survivors.append((f, mtime, size))
                continue
            ok, freed = safe_delete(f, dry_run)
            if ok:
                bytes_freed += freed
                files_deleted += 1
                running -= size
            else:
                new_survivors.append((f, mtime, size))

        survivors = new_survivors

    files_kept = len(survivors)
    return bytes_freed, files_deleted, files_kept


def main() -> None:
    # Drain hook stdin if present (ignored).
    try:
        if not sys.stdin.isatty():
            sys.stdin.read()
    except Exception:
        pass

    project_root = os.environ.get(
        "CLAUDE_PROJECT_DIR", str(Path(__file__).resolve().parents[2])
    )
    project = Path(project_root)

    try:
        retention_days = int(os.environ.get("LOG_RETENTION_DAYS", "7"))
    except ValueError:
        retention_days = 7
    try:
        max_mb = int(os.environ.get("LOG_RETENTION_MAX_MB", "50"))
    except ValueError:
        max_mb = 50
    dry_run = os.environ.get("LOG_ROTATION_DRY_RUN", "").strip() == "1"

    log(f"\n{'=' * 60}")
    log(f"=== Log Rotation: project={project} ===")
    log(
        f"retention_days={retention_days} max_mb={max_mb} dry_run={dry_run}"
    )

    targets = discover_targets(project)
    if not targets:
        print("[log-rotation] no target dirs found")
        log("No target dirs found.")
        sys.exit(0)

    now = time.time()
    grand_bytes = 0
    grand_files = 0

    for target in targets:
        try:
            freed, deleted, kept = rotate_target(
                target, retention_days, max_mb, dry_run, now
            )
        except Exception as exc:  # never break the session chain
            log(f"ERROR: rotate_target crashed on {target}: {exc}")
            print(f"[log-rotation] {target}: error: {exc}")
            continue

        grand_bytes += freed
        grand_files += deleted

        prefix = "[log-rotation]" + (" (dry-run)" if dry_run else "")
        msg = (
            f"{prefix} {target}: freed {_human_size(freed)} "
            f"across {deleted} files (kept {kept} files)"
        )
        print(msg)
        log(msg)

    grand_prefix = "[log-rotation]" + (" (dry-run)" if dry_run else "")
    grand = (
        f"{grand_prefix} total: freed {_human_size(grand_bytes)} "
        f"across {grand_files} files"
    )
    print(grand)
    log(grand)

    sys.exit(0)


if __name__ == "__main__":
    main()
