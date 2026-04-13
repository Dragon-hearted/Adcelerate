Check for README drift and update stale READMEs.

## Workflow

1. Check if a drift flag exists at `systems/readme-engine/.drift-flag`
2. If the drift flag exists, read it and report which scopes are stale and which files changed
3. Run drift detection: `bun run systems/readme-engine/src/cli.ts detect --target all`
4. Present the drift report to the user showing which sections are current, stale, or unknown
5. Ask for approval before updating. Show which scopes will be updated.
6. On approval, run: `bun run systems/readme-engine/src/cli.ts update --target <scope>` for each stale scope
7. After updating, remove the drift flag file at `systems/readme-engine/.drift-flag`

## If No Drift Flag

If no drift flag exists, run a fresh detection anyway:
1. Run: `bun run systems/readme-engine/src/cli.ts detect --target all`
2. Present the report
3. If any sections are stale or unknown, offer to update them

## Notes

- The drift flag is written by the `readme_drift_check.py` SessionEnd hook whenever knowledge sources change
- Knowledge sources include: `systems.yaml`, `library.yaml`, `knowledge/graph.yaml`, per-system `knowledge/` files, and `package.json` files
- Valid scope targets: `root`, `system:<name>`, `app:<name>`, `all`
