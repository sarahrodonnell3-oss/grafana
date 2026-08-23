---
name: linear-ticket-to-pr
description: Implement a Linear issue in the Grafana UI repository, then open a draft PR. Use when asked to implement a Linear issue, Linear ticket, Linear ID, or issue in Grafana UI, @grafana/ui, packages/grafana-ui, or this Grafana frontend repo.
---

# Linear ticket to PR

Implement the specified Linear issue in this Grafana UI repository. Follow the workflow in order. Do not skip steps.

## Hard stops

- Stop if the Linear issue cannot be retrieved.
- Never merge the PR.
- Never mark the Linear issue Done.
- Never modify unrelated files.
- Never use Slack.

## Repository and base branch

Confirm the repository is `sarahrodonnell3-oss/grafana`. Use `cursor-201-base` as the base branch unless explicitly overridden.

## Workflow

1. Retrieve the specified Linear issue using the Linear integration or MCP. Stop if the issue cannot be retrieved.
2. Treat the issue description, acceptance criteria, and comments as requirements.
3. Confirm the repository is sarahrodonnell3-oss/grafana and use cursor-201-base as the base branch unless explicitly overridden.
4. Inspect the affected component, focused tests, nearby stories, and public exports before editing.
5. Produce a concise implementation plan before making changes.
6. Make the smallest compatible change and preserve the public API.
7. Add or update focused tests for the requested behavior and relevant regression case.
8. Run the focused test and the narrowest applicable typecheck.
9. Produce a final report containing files changed, design decisions, commands run, results, and remaining risks.
10. Open a draft PR targeting cursor-201-base and add the PR link and validation summary to the Linear issue.

## Grafana UI Alert component

For changes to the Grafana UI Alert component, run:

```
yarn jest --no-watch packages/grafana-ui/src/components/Alert/Alert.test.tsx

yarn workspace @grafana/ui typecheck
```

## Final report

After validation, report:

- Files changed
- Design decisions
- Commands run
- Results
- Remaining risks
- Draft PR URL
- Linear issue update (PR link and validation summary)
