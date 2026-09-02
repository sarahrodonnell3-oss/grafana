---
name: incident-to-controlled-change
description: Investigate a Jira bug report or an approved operational signal and—only after explicit Jira approval—implement a bounded change and prepare a draft review package. Use for governed defects, legacy migrations, and compliance-sensitive fixes; do not use for unapproved production changes, merge, release, or deployment.
---

# Incident to Controlled Change

Move an approved intake record toward a reviewable change without crossing the human approval, merge, or release gates.

## Read authoritative guidance

Read only the references needed for the current phase:

- At intake and whenever sources disagree, read [Knowledge Source and Provenance Register](../../../docs/compliance/knowledge-source-register.md).
- Always read [Agent-Assisted SDLC Policy](../../../docs/compliance/agent-sdlc-policy.md).
- For this Jira-first demo, read [Jira-First Demo Workflow Profile](../../../docs/compliance/jira-first-demo-profile.md).
- Before preparing or reviewing a pull request, read [Code Review Standard](../../../docs/engineering/code-review-standard.md).
- Before running or interpreting tests, read [CI Reliability and Flaky-Test Policy](../../../docs/testing/ci-reliability-policy.md).
- For a router migration, read [Legacy Router Migration Control Document](../../../docs/migrations/legacy-router-migration.md).
- For the Dashboard-to-Scenes rollback path, read [Dashboard-to-Scenes Rollback Control](../../../docs/migrations/dashboard-scenes-rollback-control.md).

If Jira and a repository policy conflict, stop and ask the named technical owner and policy owner to resolve the conflict. Do not choose the less restrictive interpretation silently.

## Determine the operating mode

Use Jira status and explicit approval evidence to select one mode:

- **Triage mode:** Default. Use when the issue is absent, in `To Do`, in `In Progress`, or otherwise lacks explicit implementation approval.
- **Implementation mode:** For the GRF demo workflow, use only when Jira is `Agent in Progress` and contains a named technical owner's explicit approval of the exact repository, base branch, scope, validation, and rollback boundary.

Assignment to an agent, a plausible plan, or tool access is not approval.

## Triage mode

1. Read the Jira intake record and identify its stable defect fingerprint, reproduction, expected behavior, observed behavior, affected version, and stated impact.
2. Use external operational evidence only when organization policy approves that source and the integration is already configured. Bound any approved query by service, environment, fingerprint, version, and time window; otherwise continue from Jira without seeking new access.
3. Exclude credentials, tokens, personal data, and unnecessary payload content from durable outputs.
4. Correlate the reproduction, user impact, relevant history, code evidence, and any approved external evidence.
5. Map the intake record to exact repository paths and symbols. Verify semantic search results with direct reads or exact search.
6. Search Jira using the stable defect fingerprint before creating work. When the current Jira issue is the intake record, search for duplicates before updating it.
7. Create a Jira issue only when no matching active issue exists; otherwise update the existing issue without overwriting human decisions.
8. Record the source, impact, evidence, root-cause hypothesis, confidence, proposed smallest change, tests, risks, and rollback approach.
9. For GRF, set or leave the issue at `In Progress` to mean Human Review Required. Do not move it to `Agent in Progress`, approve it, or edit code.

### Triage output

Return a concise summary containing:

- intake record and stable defect fingerprint;
- impact and time window;
- root-cause cluster and confidence;
- exact code evidence;
- created or updated Jira key;
- proposed bounded scope and non-goals;
- required verification;
- unresolved risks; and
- the human decision required next.

Prefer links and identifiers over copied raw logs.

## Implementation mode

Before editing, quote the Jira approval actor, approved scope, base branch, protected behavior, and stopping conditions. If any is missing, return to triage mode.

1. Confirm the working tree and create or use an isolated feature branch from the approved base.
2. Revalidate the root-cause hypothesis against current code and the approved intake evidence. Stop if evidence now points elsewhere.
3. Produce a short implementation plan tied to exact files, tests, compatibility behavior, and rollback.
4. Implement the smallest coherent change inside the approved boundary.
5. Run the validation ladder from the CI Reliability Policy.
6. For a failing test, use no more than two unchanged retries, compare with the base branch when practical, and classify the result. Never hide the failure.
7. Verify user-visible routing or UI behavior in a browser when required and retain a screenshot or recording.
8. Inspect the final diff for unrelated edits, generated files, weakened tests, scope expansion, and sensitive data.
9. Create or update a **draft** pull request only when requested and permitted.
10. Update Jira with progress, branch or pull-request link, evidence, and unresolved risk. Do not mark it Done.

### Draft review package

Use the structure required by the Code Review Standard. Always include:

- Jira authorization and named approvers;
- originating Jira bug and any authorized operational-evidence reference;
- agent run identifier;
- root cause and approved scope;
- files changed and intentionally unchanged;
- compatibility evidence;
- exact commands and results;
- every retry and flaky/pre-existing classification;
- broader CI state;
- remaining risks;
- rollout and rollback; and
- the explicit human review required next.

## Stop and escalate

Stop without broadening the task when:

- Jira lacks explicit approval;
- the required edit exceeds the approved boundary;
- multiple root causes remain plausible;
- shared infrastructure, public APIs, schemas, security controls, data handling, or policy must change;
- a required tool, secret, service, or environment is unavailable;
- validation is inconclusive or shows a change-caused regression;
- rollback is not credible;
- a hook denies an action; or
- approval, merge, deploy, release, exception, or risk acceptance is required.

Explain the evidence, the blocked decision, the accountable role, and the smallest next action. Do not work around a denied action or weaken a control.
