# Code Review Standard for Agent-Assisted Changes

**Standard owner:** Engineering
**Applies to:** Pull requests containing any agent-authored or agent-modified code
**Required review surface:** Source-control pull request with named reviewers

## 1. Objective

Review must establish that the change is authorized, correct, bounded, testable, reversible, and supported by evidence. A successful agent run or confident summary is not approval.

## 2. Required pull-request header

Every agent-assisted pull request must include:

```markdown
## Work authorization
- Jira issue:
- Approved scope:
- Technical owner:
- Compliance reviewer, if required:
- Approval record:

## Operational provenance
- Datadog signal or incident:
- Agent run ID:
- Base branch:
- Feature branch:
- Model/routing mode, when available:

## Change
- Root cause addressed:
- Files changed:
- Files intentionally left unchanged:
- Compatibility impact:

## Verification
- Focused checks:
- Broader CI:
- Browser or integration evidence:
- Flaky/pre-existing failures:

## Risk and recovery
- Remaining risks:
- Rollout:
- Rollback:
- Unresolved questions:
```

If a required value is unknown, write `Unknown — human decision required`; do not omit the field.

## 3. Review order

Reviewers should evaluate evidence in this order:

1. **Authorization:** Does Jira record the approved scope and named owner?
2. **Problem evidence:** Does the Datadog signal support the claimed failure mode and affected version?
3. **Scope:** Does the diff stay inside the approved migration boundary?
4. **Behavior:** Does the change preserve the stated compatibility contract?
5. **Tests:** Do focused tests prove the failure and the fix? Is broader CI reported honestly?
6. **Quality:** Does the implementation follow existing repository patterns and avoid unnecessary abstraction?
7. **Security and data:** Are inputs validated and sensitive data excluded from logs and artifacts?
8. **Operations:** Are rollout, observability, and rollback credible?
9. **Provenance:** Can the reviewer trace the signal, Jira issue, agent run, branch, checks, approvals, and merge actor?

## 4. Required reviewer decisions

### Technical owner

The technical owner must confirm:

- the root-cause hypothesis is adequately supported;
- the implementation matches the approved scope;
- the compatibility behavior is correct;
- focused validation is sufficient;
- any broader CI gaps are understood;
- rollback is practical; and
- unresolved risks are either accepted or returned for revision.

### Compliance reviewer

The compliance reviewer is required when the change affects authentication, authorization, audit logging, retention, regulated data, security controls, protected configuration, or an explicitly governed migration.

The compliance reviewer confirms:

- required evidence and provenance are present;
- approval segregation is maintained;
- the agent did not take prohibited actions;
- sensitive content is not unnecessarily copied into durable records; and
- any exception is documented and approved by the correct owner.

### Merge and release owner

The authorized human who merges or releases confirms that required reviews and checks are complete. An agent recommendation of `Ready` cannot substitute for this action.

## 5. Diff-quality requirements

The change should:

- be the smallest coherent implementation of the approved scope;
- avoid unrelated formatting, renaming, dependency, or cleanup changes;
- preserve public interfaces unless the approved plan explicitly changes them;
- prefer existing repository patterns over new abstractions;
- include comments only where they explain non-obvious constraints;
- update tests with the production change rather than weakening them; and
- keep generated artifacts out of the diff unless repository policy requires them.

Any unapproved scope expansion must be removed or returned to the technical owner for a new decision.

## 6. Validation requirements

At minimum, the review package must show:

- the exact focused test commands and results;
- a test that would fail under the original defect when feasible;
- typecheck, lint, or static-analysis results required by the affected package;
- integration or browser evidence when the failure is user-visible or routing-related;
- broader CI status, including checks still running;
- every retry of a failing test; and
- any pre-existing or potentially flaky failures classified under the CI Reliability Policy.

Do not summarize a partially passing suite as `tests passed`.

## 7. Review outcomes

Use one of these outcomes:

- **Approve:** Authorized, sufficiently proven, bounded, and ready for the next human-controlled gate.
- **Request changes:** A specific correctable issue exists.
- **Escalate:** The change requires a new product, architecture, security, compliance, or scope decision.
- **No decision:** Evidence is incomplete or unreliable.

The pull request remains draft until the required human reviewers agree the evidence is complete.
