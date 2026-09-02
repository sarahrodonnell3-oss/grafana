# Legacy Router Migration Control Document

**Migration owner:** Frontend Platform
**Technical approver:** Assign a named owner in Jira
**Compliance reviewer:** Assign when the route affects authentication, authorization, auditability, or regulated data
**Status:** Planning template; implementation is prohibited until Jira records an approved slice

## 1. Objective

Migrate one approved route family from legacy React Router v5-compatible behavior to the repository's supported v6 pattern without changing user-visible navigation, authorization, deep links, query strings, redirect state, or browser-history behavior.

This document defines the migration contract. The Jira issue defines the exact approved route family and files for each slice.

## 2. Required discovery before approval

The planning agent must identify:

- remaining v5 imports, APIs, wrappers, and compatibility shims in the candidate path;
- route declarations and nesting;
- redirect and navigation behavior;
- authentication and authorization wrappers;
- deep-link and query-string behavior;
- test helpers that encode legacy assumptions;
- callers outside the immediate directory;
- telemetry associated with the Datadog signal; and
- the smallest independently testable slice.

The plan must cite exact paths and symbols. A generic migration checklist is insufficient.

## 3. Per-slice Jira configuration

Before implementation, the Jira issue must contain:

```text
Approved route family:
Approved production files:
Approved test files:
Base branch:
Protected behaviors:
Known Datadog fingerprint:
Expected focused commands:
Rollout mechanism:
Rollback mechanism:
Technical owner:
Approval comment and timestamp:
```

Blank fields mean the slice is not approved.

## 4. Compatibility contract

Unless Jira explicitly authorizes a change, preserve:

- existing public URLs;
- direct navigation and bookmarked deep links;
- route parameters and query strings;
- nested route composition;
- redirects, including preserved destination and state;
- browser back/forward behavior;
- authenticated and unauthorized outcomes;
- feature-flag behavior;
- analytics and error instrumentation; and
- existing public component or helper APIs.

Compilation alone does not prove this contract.

## 5. Implementation constraints

- Change only the approved route family and its focused tests.
- Prefer existing v6 patterns already established in the repository.
- Keep the compatibility layer until all known callers are migrated or its removal is separately approved.
- Do not combine the migration with formatting, dependency upgrades, component redesign, or unrelated cleanup.
- Do not alter authentication, authorization, logging, or retention semantics without a separate approval.
- Keep each slice independently revertible.
- If a shared wrapper must change, stop and obtain expanded approval before editing it.

## 6. Required verification matrix

| Behavior | Required evidence |
| --- | --- |
| Direct deep link | Browser or integration test opens the approved route directly |
| Nested rendering | Expected child content renders under the correct parent route |
| Redirect | Source route reaches the same destination and preserves required state |
| Route parameters | Existing parameter values reach the same component behavior |
| Query strings | Required query values are preserved and interpreted consistently |
| Back/forward | Browser history returns to the expected location and state |
| Authorized access | Permitted user reaches the expected page |
| Unauthorized access | Existing denial or login redirect remains unchanged |
| Error telemetry | The known failure is absent in the test path and instrumentation remains intact |
| Static correctness | Focused tests plus required typecheck/lint complete successfully |

Apply the CI Reliability and Flaky-Test Policy to every failure.

## 7. Rollout

Prefer the smallest available rollout mechanism:

1. feature flag or route-level switch when already supported;
2. canary or limited cohort;
3. monitored release with a defined observation window; or
4. direct release only when the technical owner documents why staged rollout is unavailable and accepts the risk.

During the observation window, monitor:

- the original Datadog error fingerprint;
- route-level error and 404 rates;
- redirect loops;
- authentication failures;
- navigation latency; and
- support or user reports tied to the migrated route.

## 8. Rollback

Rollback must be possible by reverting the migration commit or disabling the approved rollout switch without reverting unrelated work.

Trigger rollback or escalation when:

- the original signal worsens;
- a new route, redirect, authorization, or history regression appears;
- required telemetry disappears;
- focused verification cannot be reproduced; or
- the change must expand beyond the approved slice to remain functional.

Agents may recommend rollback and prepare a revert for review when authorized. Only the named release owner may execute production rollback or deployment.

## 9. Completion criteria

A slice is complete only when:

- Jira records technical approval;
- implementation stays within the approved boundary;
- focused and required broader checks are reported accurately;
- browser or integration evidence covers the compatibility contract;
- the draft pull request contains the required review package;
- required named reviewers approve;
- the authorized human merges and releases; and
- post-release monitoring completes without an unaccepted regression.

Removal of the final compatibility layer is a separate change requiring proof that no callers remain.
