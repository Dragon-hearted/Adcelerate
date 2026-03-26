# Adcelerate Diagnose Workflow

Complete diagnosis workflow covering system inspection, root cause analysis, fix proposal/application, guard rail addition, and knowledge updates.

---

## 1. System Identification

- If the engineer provides a system name: look up directly in `systems.yaml`
- If the engineer describes symptoms: match against system descriptions and capabilities
- If ambiguous: present options and ask for confirmation
- Load system knowledge: read `[system]/knowledge/index.md`, `domain.md`, `dependencies.md`, `history.md`
- Check `knowledge/graph.yaml` for cross-system relationships that might be relevant

---

## 2. Pipeline Inspection (FR25)

Identify all components of the system's pipeline (from knowledge files and code) and test each component end-to-end:

- **Entry point**: Check entry point accessibility (scripts, commands, API endpoints)
- **Dependencies**: Verify dependencies are available and at expected versions
- **Pipeline stages**: Test each pipeline stage independently if possible
- **Environment**: Check for environment issues (missing env vars, permissions, disk space)
- **External services**: Verify connectivity and availability of external APIs/services

Record findings at each step. If a step cannot be tested automatically, note what manual verification is needed.

---

## 3. Root Cause Analysis

Cross-reference findings with:

- System's `knowledge/history.md` for previous similar issues
- `knowledge/graph.yaml` `failure_patterns` for known patterns
- System's `knowledge/dependencies.md` for version changes

Identify the specific failure point and root cause. Classify the issue:

| Classification | Description |
|---|---|
| **Dependency issue** | A dependency version changed, is missing, or is incompatible |
| **Configuration issue** | Environment variables, config files, or settings are wrong |
| **Code bug** | Logic error, regression, or unhandled edge case in system code |
| **External service failure** | Third-party API is down, rate-limited, or changed its contract |
| **Data issue** | Input data is malformed, missing, or outside expected parameters |

---

## 4. Fix Proposal (FR26-FR27)

Present the diagnosis report to the engineer using this format:

```
## Diagnosis Report

**System**: {{system-name}}
**Status**: {{current status from systems.yaml}}
**Investigated**: {{timestamp}}

### Findings
{{Step-by-step what was checked and what was found}}

### Root Cause
{{Clear explanation of what went wrong and why}}

### Proposed Fix
{{Specific changes to make}}

### Risk Assessment
- **Impact**: {{what this fix changes}}
- **Rollback**: {{how to undo if needed}}
- **Side effects**: {{other systems that might be affected}}

### Recommended Action
- [ ] Apply proposed fix
- [ ] Investigate further
- [ ] Manual intervention needed
```

**WAIT for engineer approval before applying any changes.**

Do not proceed to Step 5 until the engineer explicitly approves the proposed fix.

---

## 5. Fix Application (FR28)

Only proceed if the engineer approves.

1. Apply the proposed changes
2. Run validation against the system's acceptance criteria
3. Verify the fix resolves the original issue
4. If fix fails: report back, do NOT retry automatically -- return to diagnosis (Step 3)

---

## 6. Guard Rail Addition (FR29)

After a successful fix, propose a guard rail to prevent recurrence. Types of guard rails:

- **Dependency version pinning**: Lock specific versions that are known to work
- **Compatibility checks**: Pre-flight checks before pipeline execution
- **Input validation**: Validate inputs match expected formats and ranges
- **Health check additions**: Automated checks that catch this class of failure early

Present the proposed guard rail to the engineer. Engineer approves guard rail before it is added.

---

## 7. Knowledge Updates

After the fix is applied and verified, update the knowledge base:

### Update system history

Add an entry to `[system]/knowledge/history.md`:

```markdown
### {{date}} -- Diagnosis: {{brief description}}
- **Symptom**: {{what was observed}}
- **Root cause**: {{what was found}}
- **Fix applied**: {{what was changed}}
- **Guard rail**: {{what was added to prevent recurrence}}
```

### Update dependencies (if applicable)

If the issue was dependency-related, update `[system]/knowledge/dependencies.md` with the new version information or constraints.

### Add failure pattern to knowledge graph

Add a new entry to `knowledge/graph.yaml` under `failure_patterns`:

```yaml
- id: "fp-{{next-id}}"
  description: "{{pattern description}}"
  diagnosed: "{{date}}"
  resolution: "{{how it was fixed}}"
  affects: ["{{system-id}}"]
```

### Add cross-system pattern file (if applicable)

If the failure pattern could affect other systems, create a detailed pattern file in `knowledge/patterns/` describing the pattern, affected systems, and recommended mitigations.

### Update system status

Update the system's status in `systems.yaml` from `broken` or `degraded` back to `active` (or the appropriate status reflecting the current state).

---

## Important Principles

- **Engineer-as-CEO**: NEVER apply fixes without explicit approval. The engineer decides what gets changed.
- **No silent failures**: Every step of diagnosis is reported. If something cannot be checked, say so.
- **Pattern learning**: Every diagnosis enriches the knowledge graph for faster future diagnosis. The same issue should never require full re-diagnosis.
- **Cross-system awareness**: Check if the issue might affect related systems via `graph.yaml`. Proactively flag potential cascading failures.
