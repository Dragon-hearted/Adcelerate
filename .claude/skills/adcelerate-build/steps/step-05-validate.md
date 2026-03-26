# Step 5 — Build Validation

## Purpose

Verify the build meets all acceptance criteria before registration. Combines automated checks, test execution, and independent agent review.

## Validation Process

### 1. Automated Checks — Hard Gates

Run each hard gate from `[system]/knowledge/acceptance-criteria.md` as a concrete check:

- **File existence checks**: Verify all expected files exist at their paths
- **Format validation**: Parse output files to verify correct format (JSON, YAML, etc.)
- **Dependency checks**: Confirm all required dependencies are installed and resolvable
- **Configuration checks**: Verify configuration files are valid and complete

Record pass/fail for each hard gate.

### 2. Test Execution

#### For New Builds
```bash
cd systems/[system-name]
bun test
```

Record:
- Number of tests run
- Number passed / failed / skipped
- Any error output from failures

#### For Migrations
Run the existing test suite using whatever test runner the system already uses:
- Verify existing tests still pass after any structural changes
- Note any tests that were already failing before migration

### 3. Independent Agent Review — Soft Criteria

Delegate to the `adcelerate-validator` agent with:
- System directory path
- Full `acceptance-criteria.md` (both hard gates and soft criteria)
- Domain knowledge summary from `domain.md`
- Any test output from step 2

The validator independently reviews:
- Does the code structure match the described domain model?
- Are the soft quality criteria evident in the implementation?
- Are there obvious gaps between what the domain knowledge describes and what exists?
- Are there potential issues not covered by the explicit criteria?

The validator produces a structured review with findings for each soft criterion.

### 4. Compile Validation Report

Compile all results into a single report:

```markdown
# Validation Report — [System Name]

## Date
[Current date]

## Summary
[One sentence: overall pass/fail and confidence level]

## Hard Gate Results
| # | Criterion | Status |
|---|-----------|--------|
| 1 | [criterion] | PASS / FAIL |
| 2 | [criterion] | PASS / FAIL |

**Hard Gates: [X/Y passed]**

## Test Results
- Tests run: [N]
- Passed: [N]
- Failed: [N]
- Skipped: [N]

[Details of any failures]

## Soft Criteria Review
### [Criterion Category]
**Assessment**: [Met / Partially Met / Not Met]
[Validator's assessment and reasoning]

### [Criterion Category]
**Assessment**: [Met / Partially Met / Not Met]
[Validator's assessment and reasoning]

## Issues Found
- [Issue 1 — severity, recommendation]
- [Issue 2 — severity, recommendation]

## Recommendation
[READY FOR REGISTRATION / NEEDS WORK — with specific items to address]
```

### 5. Present to Engineer

> "Here is the validation report for **[system-name]**:"
>
> [Show the full report]
>
> [If all passing]: "All checks pass. Ready to register this system. Proceed?"
>
> [If issues found]: "There are [N] issues to address. Would you like to fix them now, or register as-is with known issues?"

## Engineer Review Gate

The engineer must explicitly approve one of:
- **Proceed to registration** — all criteria met or known issues accepted
- **Fix and re-validate** — address specific issues, then re-run validation
- **Abort** — stop the pipeline (all progress preserved)

Do NOT proceed to Step 6 without engineer approval.

## Error Handling

- If tests fail to run (not test failures, but runner errors): report the runner error, do not treat as test failures
- If the validator agent fails: report the failure, present hard gate and test results without the soft criteria review, ask engineer how to proceed
- If the system directory is missing or corrupted: report and offer to re-run Step 4

## Output

- Complete validation report
- Hard gate results (all pass/fail)
- Test execution results
- Independent soft criteria review
- Engineer approval to proceed (or direction to fix)
