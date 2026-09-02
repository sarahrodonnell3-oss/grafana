# Knowledge Source and Provenance Register

**Owner:** Engineering Governance
**Review cadence:** Quarterly and whenever an integration, repository, or approval workflow changes
**Status:** Demo baseline; replace example roles, URLs, retention periods, and access groups before production use

## 1. Purpose

This register defines which systems are authoritative, what the team must configure, what agents may derive, and what agents must never infer. It prevents a fluent agent response from being mistaken for approved policy or scope.

## 2. Source precedence

When sources disagree, use this order and escalate the conflict rather than silently reconciling it:

1. approved law, regulation, and organization policy;
2. versioned repository policy and control documents;
3. explicit human approval recorded in Jira;
4. current repository code and configuration;
5. executed CI and test evidence;
6. approved external operational evidence, when configured;
7. agent-generated hypotheses and summaries.

Lower-ranked evidence may reveal that a higher-ranked source is stale or incomplete, but it does not amend that source.

## 3. Source register

| Source | Authoritative for | Team must configure | Agent may derive | Agent must not infer |
| --- | --- | --- | --- | --- |
| Repository policy | Required controls, review rules, migration constraints | Approved documents, owners, review cadence, protected paths | Applicable requirements and conflicts | That an absent control is optional |
| Jira | Work identity, approved scope, accountable people, status, acceptance criteria | Project, issue type, required fields, workflow statuses, approval field or comment convention | Whether the issue is authorized for implementation from explicit evidence | Approval from assignment, silence, or an agent-authored statement |
| Observability system (optional) | Signal occurrence, time window, affected service/environment, telemetry | Organization approval, read-only credentials, allowed indexes/services, redaction rules, query limits, stable links | Clusters, impact estimates, correlations, representative traces | Root cause from correlation alone, permission to change code, or permission to connect a prohibited source |
| Source repository | Current implementation, ownership metadata, history | Repository and branch allowlist, CODEOWNERS, protected branches, agent write boundary | Candidate symbols, dependencies, smallest coherent change | Business intent not represented in approved requirements |
| CI and test systems | Checks that actually ran and their results | Required checks, environments, timeouts, retention, flaky-test registry | Failure classification and change/base comparison | Success for skipped, timed-out, cancelled, or inconclusive checks |
| Pull request platform | Proposed diff, review discussion, recorded approval, merge status | Branch protection, required reviewers, check policy, merge permissions | Review package completeness and unresolved comments | Approval, risk acceptance, or merge authority |
| Agent run telemetry | Agent actions, tool calls, evidence references, cost and duration | Run-ID format, retention, redaction, access controls, export destination | Traceability and quality metrics | That tool access implies policy authorization |

## 4. Minimum configuration before a run

The team must provide all of the following:

- repository, default branch, and allowed write branch pattern;
- policy owner, technical owner, and compliance-review role;
- Jira project, issue type, workflow statuses, required fields, and approval convention;
- for each approved optional observability source, its site, service/environment allowlist, time-window limit, and redaction rules;
- protected paths, CODEOWNERS, required CI checks, and merge protections;
- log and artifact retention periods plus the location of the audit record;
- migration scope, protected behavior, supported versions, rollout, and rollback owner; and
- escalation channel for missing access, conflicting evidence, or policy exceptions.

If any required value is missing, the agent may identify the gap and prepare a question. It must not invent a production value.

## 5. Derived context rules

Agents may derive summaries, clusters, likely code ownership, candidate root causes, risk flags, and proposed tests when they:

- cite the originating source with a stable link or identifier;
- distinguish observation from inference;
- include confidence and competing explanations when material;
- preserve the original human decision record;
- refresh volatile evidence at the start of an implementation run; and
- stop when the derived conclusion would expand scope or weaken a control.

Derived context is advisory until a named person approves the decision required by policy.

## 6. Retrieval and token controls

- For an approved observability source, filter by service, environment, error fingerprint, version, and bounded time window before retrieving event details.
- Prefer counts, facets, and clusters to raw event streams.
- Read at most three representative traces unless they conflict or are insufficient.
- Retrieve only the policy sections applicable to the current phase.
- Use exact file and symbol search to verify semantic retrieval.
- Store durable links, query parameters, hashes, and concise findings; do not copy full logs into Jira or pull requests.
- Redact credentials, tokens, personal data, and unrelated payload fields before any durable write.

## 7. Provenance record

Every material agent conclusion must be reconstructable from:

- agent run ID and agent or workflow version;
- source system and stable record or query link;
- retrieval timestamp and bounded query parameters;
- repository commit or branch SHA;
- Jira key, status, approval actor, and approval timestamp;
- tools or checks executed and their results; and
- explicit labels for observation, inference, human decision, and unresolved uncertainty.

The audit record should contain references and summaries sufficient to reproduce the decision without retaining unnecessary sensitive content.
