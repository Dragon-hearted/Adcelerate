# Step 4 — Project Scaffolding

## Purpose

Create the system's project directory with all standard files, configuration, and structure needed to begin development.

## Migration Mode

**If this is a migration (`migrate <name>`), SKIP this step.** The system already exists. Instead:

1. Verify the existing directory structure
2. Check compatibility with Adcelerate conventions:
   - Does it have a `package.json`?
   - Does it have a `knowledge/` directory? (create if not)
   - Does it have a justfile or equivalent task runner?
   - Is the entry point identifiable?
3. If adjustments are needed, propose them to the engineer before making changes
4. Proceed to Step 5

## New Build — Scaffolding Process

### 1. Prepare Context for Scaffolder

Gather the following from prior steps:
- System name (kebab-case) from Step 1
- System description from Step 1
- Domain knowledge summary from Step 2 (key points, not the full document)
- Target directory path: `systems/[system-name]/`

### 2. Delegate to Scaffolder Agent

Delegate to the `adcelerate-scaffolder` agent with:
- System name and description
- Captured knowledge summary
- Target directory path
- Reference to `templates/system/` for the base template

The scaffolder will:
1. Copy `templates/system/` to `systems/[system-name]/`
2. Customize template files:
   - Replace placeholder values with system-specific content
   - Update `package.json` with system name, description, dependencies
   - Create initial source files based on domain knowledge
   - Set up the `knowledge/` directory (already populated from Steps 1-3)
3. Create system-specific files as needed based on the domain

### 3. Verify Scaffolded Project

After the scaffolder completes, verify:

```
Verification Checklist:
- [ ] Directory exists at systems/[system-name]/
- [ ] package.json exists and is valid JSON
- [ ] package.json has correct name and description
- [ ] knowledge/ directory exists with scope.md, domain.md, acceptance-criteria.md
- [ ] Entry point file exists (e.g., src/index.ts)
- [ ] bun install succeeds without errors
- [ ] justfile exists with standard targets
```

Run `bun install` in the system directory to verify dependencies resolve.

### 4. Report to Engineer

Show the scaffolded structure:

> "Here is the scaffolded project for **[system-name]**:"
>
> ```
> systems/[system-name]/
> ├── package.json
> ├── justfile
> ├── src/
> │   └── index.ts
> ├── knowledge/
> │   ├── scope.md
> │   ├── domain.md
> │   └── acceptance-criteria.md
> └── ...
> ```
>
> "`bun install` completed successfully. Ready for validation."

## Error Handling

- If the template directory is missing, report the error and ask the engineer how to proceed
- If `bun install` fails, report the specific error (missing dependency, version conflict, etc.)
- If the scaffolder produces invalid output, report what is wrong and retry

## Output

- Scaffolded project directory at `systems/[system-name]/`
- Valid `package.json` with resolved dependencies
- Knowledge directory with all files from previous steps
- Verification checklist all passing
