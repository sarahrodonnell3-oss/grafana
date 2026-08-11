---
name: verify-datasource-change
description: Verify SQL datasource changes after edits. Identifies the affected package, inspects the git diff, runs focused tests, confirms macro happy-path behavior, and flags out-of-scope edits. Use after modifying a SQL datasource (PostgreSQL, MySQL, MSSQL, sqleng, sqlmacro) or when asked to verify a datasource change.
---

# Verify datasource change

Run this after modifying a SQL datasource. Keep the check procedural and concise.

## Procedure

1. **Identify** the affected datasource/package (from the task and changed paths under `pkg/tsdb/`).
2. **Inspect** the complete git diff (`git diff` and `git diff --cached`; include untracked files if relevant).
3. **Run** the nearest focused datasource tests for that package.
4. **Run** the specific changed behavior's tests where possible.
5. **Confirm** successful macro behavior remains unchanged (existing happy-path macro tests still pass; no intentional changes to successful expansion output unless requested).
6. **Flag** any changes outside the requested datasource.
7. **Return** a short verification summary (template below).

## PostgreSQL macro changes

For PostgreSQL macro changes in this repository, use:

```bash
go test ./pkg/tsdb/grafana-postgresql-datasource/ -run 'TestMacroEngine' -count=1
```

Widen only if the diff touches non-macro code in that package (then run the package tests or the matching `*_test.go` focus).

## Other SQL datasources

Prefer the nearest package test with a focused `-run` when one exists (for example macros tests under that datasource). If the package is missing from this checkout, report that and stop—do not expand into unrelated datasources.

## Summary template

```markdown
## Verification summary
- **Tests run:** …
- **Behavior verified:** …
- **Remaining risk:** …
- **Out of scope:** none | list flagged paths
```
