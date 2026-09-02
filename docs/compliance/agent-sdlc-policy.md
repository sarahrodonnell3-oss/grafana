# Agent-Assisted SDLC Policy

**Policy owner:** Engineering Governance
**Applies to:** Human-initiated agents, Cloud Agents, automations, and agent-authored pull requests
**Review cadence:** Quarterly and after any material incident
**Policy status:** Approved for the compliance demo; replace role names with the customer's accountable owners before production use

## 1. Purpose

This policy defines how agents may participate in software delivery while named people retain accountability for requirements, risk acceptance, approval, merge, release, and production operation.

Agents are execution tools. They may accelerate research, analysis, implementation, and evidence collection, but they are not accountable owners and cannot satisfy a required human approval.

## 2. Scope

This policy applies whenever an agent:

- reads production signals, tickets, source code, or internal documentation;
- creates or updates engineering work items;
- proposes or edits source code, tests, configuration, or documentation;
- runs build, test, browser, or analysis tools;
- creates a branch, commit, or pull request; or
- recommends that work is ready for approval, release, or deployment.

It does not authorize production access, deployment, approval, merge, destructive operations, or changes to security and compliance policy.

## 3. Governing principles

1. **Named accountability.** Every agent-assisted change must have a named technical owner. Changes classified as compliance-sensitive must also have a named compliance reviewer.
2. **Least authority.** Each agent receives only the repositories, tools, credentials, network routes, and write actions required for its current phase.
3. **Evidence before autonomy.** Human intervention may be reduced only after measured performance meets an approved reliability threshold for a representative set of runs.
4. **Authoritative sources remain authoritative.** Jira is the source for intake, approved scope, and ownership; the repository for code and versioned policy; CI for executed checks; and the pull request for review and approval. An observability system is authoritative only for evidence retrieved through an organization-approved integration.
5. **Smallest safe change.** Agents must prefer a bounded change that satisfies the approved acceptance criteria and preserves rollback.
6. **No silent policy changes.** An agent may identify a missing or conflicting policy, but only an authorized human may approve a policy exception or material change.
7. **Honest uncertainty.** A no-op, escalation, or inconclusive result is acceptable. Unsupported confidence or a misleading success claim is not.

## 4. Required lifecycle and gates

| Phase | Agent may do | Required evidence | Human gate |
| --- | --- | --- | --- |
| Intake triage | Read the Jira bug and any authorized evidence, inspect code and policy, search for duplicates, update Jira | Defect fingerprint, impact, reproduction, code references, hypothesis, confidence, proposed scope | Technical owner accepts or rejects the scope |
| Planning | Propose implementation, validation, compatibility, rollout, and rollback | Named files/symbols, decisions, test plan, risks, stop conditions | Technical owner records approval in Jira |
| Implementation | Edit an isolated feature branch within approved scope; add or update tests; run permitted tools | Diff, commands, focused results, broader CI status, deviations | None to continue inside the approved boundary |
| Review preparation | Open or update a **draft** pull request and assemble the review package | Jira link, intake evidence, run ID, tests, risks, rollback, unresolved items | CODEOWNER and compliance reviewer where required |
| Merge and release | Provide information or respond to review | Complete approval and CI record | Authorized human merges and releases |

An agent must not enter implementation merely because it produced a plausible plan. Jira must contain an explicit approval by the named technical owner.

## 5. Authorization matrix

| Action | Triage agent | Implementation agent | Human owner |
| --- | --- | --- | --- |
| Read approved repositories and policies | Allowed | Allowed | Allowed |
| Read approved observability evidence | Only when configured and authorized | Only when configured and needed | Allowed |
| Search Jira | Allowed | Allowed | Allowed |
| Create/update Jira investigation fields | Allowed | Allowed for progress and evidence | Allowed |
| Change Jira to Approved for Agent Implementation | Prohibited | Prohibited | Technical owner only |
| Edit source or tests | Prohibited | Allowed on feature branch within approved scope | Allowed |
| Push a feature branch | Prohibited | Allowed when requested | Allowed |
| Open a draft pull request | Prohibited | Allowed when requested | Allowed |
| Approve, merge, deploy, or waive checks | Prohibited | Prohibited | Authorized named human only |
| Change this policy or an approval requirement | Prohibited | Prohibited | Policy owner only |

Tool availability does not expand authorization. If a tool technically permits an action that this matrix prohibits, the agent must not take the action.

## 6. Approval requirements

The Jira issue must identify:

- the technical owner;
- the compliance reviewer when applicable;
- the approved repository and base branch;
- the exact implementation boundary;
- non-goals and protected behavior;
- required validation;
- rollout and rollback expectations; and
- the approval actor and timestamp.

Valid approval must be explicit. Assignment, silence, a meeting note, or an agent-generated recommendation is not approval.

## 7. Agent-authored code and responsibility

Agent-authored code is reviewed and governed like human-authored code, with additional provenance requirements. The accountable people and organization remain responsible for accepting, merging, releasing, and operating the change.

Required provenance:

- originating Jira bug and any authorized operational-evidence identifier;
- Jira issue key;
- agent conversation or Cloud run identifier;
- base branch and resulting feature branch;
- model/routing mode when available;
- Skills, Rules, and policy version used;
- files changed;
- commands and checks executed; and
- human approvals and final merge actor.

The Git commit and pull-request history are the authoritative record of the delivered code. Agent transcripts and hook telemetry supplement that record; they do not replace source control review.

## 8. Data handling

- Do not seek or connect an external data source that organization policy has not approved.
- When approved observability evidence is available, query the smallest useful time range and service scope.
- Aggregate and cluster before retrieving individual events, and inspect no more than three representative traces unless conflicting evidence justifies more.
- Do not copy credentials, access tokens, session values, personal data, or complete request payloads into prompts, Jira, or pull requests.
- Link to authoritative records instead of duplicating large logs.
- Log action metadata by default; retain prompt or code content only when an approved retention policy explicitly requires it.
- Store credentials in approved secret-management surfaces, never in repository files, prompts, or Jira descriptions.

## 9. Required stop and escalation conditions

Stop and request human direction when:

- Jira does not contain explicit implementation approval;
- the proposed change expands beyond the approved files, service, route family, interface, or data contract;
- evidence suggests multiple root causes rather than the approved hypothesis;
- a security, privacy, retention, schema, public API, or cross-service decision is required;
- required credentials or tools are missing;
- focused validation cannot distinguish regression from pre-existing or flaky behavior;
- rollback is not credible;
- a protected operation is required; or
- policies conflict or lack a clear precedence.

## 10. Exceptions

Exceptions require a recorded decision by the policy owner and the accountable technical owner. The record must state the scope, reason, duration, compensating controls, and expiration. Agents cannot approve or infer an exception.
