# Step 6 — System Registration

## Purpose

Register the validated system into the Adcelerate platform so it is discoverable, runnable, and connected to the knowledge graph.

## Registration Process

### 1. Add Entry to systems.yaml

Add a new entry under the `systems` key in `systems.yaml`:

```yaml
- name: [system-name]
  path: systems/[system-name]
  status: active
  description: "[System description from Step 1]"
  task_types:
    - [task type 1]
    - [task type 2]
  knowledge_path: systems/[system-name]/knowledge
  input_types:
    - [input type and format]
  output_types:
    - [output type and format]
  domain_tags:
    - [relevant domain tag]
    - [relevant domain tag]
  entry_point: src/index.ts
  justfile: systems/[system-name]/justfile
  stages:
    - name: [stage name]
      description: "[what this stage does]"
  registered_at: [current date in YYYY-MM-DD format]
```

Field guidelines:
- **name**: kebab-case, matches directory name
- **path**: relative path from repo root
- **status**: always `active` for new registrations
- **description**: from Step 1 scope
- **task_types**: derived from domain knowledge — what kinds of tasks this system handles
- **knowledge_path**: path to the knowledge directory
- **input_types**: from scope definition — what the system consumes
- **output_types**: from scope definition — what the system produces
- **domain_tags**: keywords for discovery and grouping
- **entry_point**: main executable file
- **justfile**: path to the system's justfile
- **stages**: pipeline stages derived from domain knowledge process steps
- **registered_at**: today's date

### 2. Update knowledge/graph.yaml

Add the system to the knowledge graph:

```yaml
systems:
  [system-name]:
    depends_on:
      - [dependency system, if any]
    shared_models:
      - [shared data model, if any]
    related_systems:
      - [related system name, if any]
```

Also update:
- Any existing systems that now relate to this one (add reverse relationships)
- `metadata.systemCount`: increment by 1

If `knowledge/graph.yaml` does not exist yet, create it with the standard structure:

```yaml
metadata:
  lastUpdated: [current date]
  systemCount: 1

systems:
  [system-name]:
    depends_on: []
    shared_models: []
    related_systems: []
```

### 3. Engineer Confirmation

Present the registration to the engineer:

> "**[system-name]** has been registered into the Adcelerate platform."
>
> **systems.yaml entry:**
> [Show the YAML entry]
>
> **knowledge/graph.yaml update:**
> [Show the graph entry]
>
> "Does this look correct?"

### 4. Emit Registration Event

After engineer confirmation, emit the build completion event:

```
adcelerate.build.registration_complete
```

Event payload:
- system_name: [system-name]
- registration_date: [current date]
- mode: "new" or "migration"
- validation_status: "passed" or "passed_with_known_issues"

## Registration Verification

After writing, verify:
- [ ] `systems.yaml` is valid YAML (parse it)
- [ ] The new entry has all required fields
- [ ] `knowledge/graph.yaml` is valid YAML
- [ ] System count is correct
- [ ] No duplicate entries exist

## Error Handling

- If `systems.yaml` does not exist: create it with the system as the first entry
- If `systems.yaml` has a parse error: report the error, do not modify, ask engineer to fix manually
- If a duplicate entry exists: report the conflict, ask engineer whether to overwrite or abort
- If `knowledge/graph.yaml` has conflicts: report and ask engineer to resolve

## Output

- System entry added to `systems.yaml`
- Knowledge graph updated in `knowledge/graph.yaml`
- Engineer confirmation received
- `adcelerate.build.registration_complete` event emitted
- System is now discoverable and runnable within the Adcelerate platform
