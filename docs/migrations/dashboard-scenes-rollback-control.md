# Dashboard-to-Scenes Rollback Control

**Technical owner:** Named in Jira
**Decision owner:** Named technical owner
**Status:** Human Review Required until Jira records an explicit restore-or-retire decision

## Purpose

Control the bounded decision and implementation for the `?scenes=false` Dashboard rollback path. This document does not authorize implementation by itself.

## Current contract and defect

`DashboardPageProxy` treats `queryParams.scenes === false` as a request for the legacy `DashboardPage`. The current branch constructs that element without returning it, then falls through to `DashboardScenePage`. Therefore the documented rollback parameter is ineffective.

The named technical owner must explicitly choose one outcome in Jira:

- **Restore:** return `DashboardPage` for `?scenes=false` and retain the rollback contract.
- **Retire:** remove the ineffective branch and formally retire the contract.

An agent must not choose between these outcomes.

## Approved implementation boundary

After explicit Jira approval, product changes are limited to:

- `public/app/features/dashboard/containers/DashboardPageProxy.tsx`
- `public/app/features/dashboard/containers/DashboardPageProxy.test.tsx`
- optionally, one focused browser or end-to-end test when supported by the existing harness

Any other product file requires a new human approval.

## Protected behavior

- With no `scenes` query parameter, `DashboardScenePage` remains the default.
- With `?scenes=true`, `DashboardScenePage` remains the selected path.
- Home, dashboard, new-dashboard, template, and snapshot routing outside the approved case must not change.
- Public-dashboard routing must not change.
- Existing dashboard identifiers and query parameters must be preserved.

If the approved decision is **restore**, `?scenes=false` must positively render `DashboardPage`. If the decision is **retire**, the Jira issue must identify the owner accepting removal of the rollback contract and the operational replacement.

## Required evidence

The review package must include:

1. the originating Datadog signal and bounded reproduction;
2. Jira approval actor, timestamp, decision, base branch, and scope;
3. a focused unit test that positively identifies the rendered page;
4. verification that omitted `scenes` and `?scenes=true` still select Scenes;
5. browser evidence for `?scenes=false` and the default route;
6. exact commands, results, retries, and failure classifications;
7. remaining risks, especially the absence of the former old-architecture e2e suite; and
8. rollback instructions tied to the feature-branch commit.

Absence of the Scenes loading marker is not proof that the legacy dashboard rendered.

## Stop conditions

Stop and return the issue to human review when:

- the Jira decision or named approver is missing;
- the legacy page cannot mount successfully;
- browser verification is unavailable or inconclusive;
- a fix requires files outside the approved boundary;
- a change-caused routing regression appears;
- the default Scenes path changes;
- restoring the path requires reviving the removed old-architecture test suite; or
- merge, deployment, policy exception, or risk acceptance is required.

## Non-goals

This slice must not:

- delete `DashboardPage`;
- remove or modify `CompatRouter`;
- change `PublicDashboardPageProxy`;
- change plugin router sharing or `sharedDependencies`;
- migrate unrelated routes;
- restore the full removed old-architecture e2e suite; or
- approve, merge, deploy, or mark Jira Done.

## Rollback

Ship the approved change as a bounded, revertible commit. Rollback is a revert of that commit. The default Scenes path must remain available before, during, and after rollback.
