# Jira-First Demo Workflow Profile

**Jira site:** `fe-anysphere-demo.atlassian.net`
**Project:** `GRF` — GrafanaDev
**Issue type:** Task
**Required label:** `cursor-compliance-demo`
**Intake source:** Jira bug report; direct Datadog access is not used in this environment

## Purpose

This profile maps the existing GRF workflow to the human accountability gates required by the Agent-Assisted SDLC Policy. Jira status never substitutes for an explicit named approval comment.

## Status mapping and authority

| Jira status | Compliance meaning | Who may enter it |
| --- | --- | --- |
| `To Do` | New bug intake; no implementation authority | Human reporter or authorized intake automation |
| `In Progress` | Agent triage complete or underway; Human Review Required | Triage agent may enter after recording evidence |
| `Agent in Progress` | Approved for Agent Implementation | Named technical owner only, after posting the approval record |
| `In Review` | Draft PR prepared; Human Code Review required | Implementation agent may enter after linking the draft PR and evidence package |
| `Done` | Human acceptance and completion | Authorized human only |

Assignment, status alone, or an agent-authored approval statement is not approval. Implementation requires both `Agent in Progress` and a human-authored approval comment containing the required fields.

## Required Task content

The Jira Task must include:

- summary and stable defect fingerprint;
- expected and observed behavior;
- bounded reproduction;
- repository and base branch;
- impact and known uncertainty;
- technical owner;
- proposed file boundary and non-goals;
- required validation and stop conditions;
- rollout and rollback expectations; and
- links to agent evidence and the resulting draft PR.

## Required approval comment

The named technical owner must record:

- `Approved for Agent Implementation`;
- approver name and role;
- approval timestamp;
- exact repository and base branch;
- approved production and test files;
- protected behavior and non-goals;
- required validation;
- stopping conditions; and
- rollback boundary.

Only after that comment is posted may the same human move the Task to `Agent in Progress`.

## Demo defect classification

Because GRF has no Bug issue type, use Task with these labels:

- `cursor-compliance-demo`
- `defect`
- `dashboard-scenes`

The issue type limitation does not change the evidence or approval requirements.
