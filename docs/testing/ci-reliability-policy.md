# CI Reliability and Flaky-Test Policy

**Policy owner:** Developer Productivity
**Applies to:** Local agents, Cloud Agents, automations, and human-run CI for agent-assisted changes

## 1. Objective

Testing should provide credible evidence without wasting time on indiscriminate full-suite execution or hiding unreliable results. Agents must distinguish a regression from a pre-existing failure, an environment failure, and a potentially flaky test.

## 2. Validation ladder

Run validation in the following order unless the repository provides a more specific approved sequence:

1. Static inspection of the affected symbols, callers, and tests.
2. The smallest test that reproduces the original failure.
3. Focused unit tests for the affected module.
4. Package-level typecheck, lint, or static analysis.
5. Targeted integration or browser verification for the changed behavior.
6. Broader package or service suite.
7. Repository-wide CI asynchronously when policy requires it.

Moving outward requires a reason. A full suite does not replace a focused test that proves the failure mode.

## 3. Test-result classification

Classify each failure as one of:

| Classification | Meaning | Required action |
| --- | --- | --- |
| Change-caused regression | Reproducible on the feature branch and not the unchanged base | Correct the change before requesting review |
| Pre-existing deterministic failure | Reproducible on the unchanged base with the same inputs | Record it; do not claim a clean suite; create or link follow-up work when material |
| Potentially flaky | Result changes across identical runs without a code or input change | Apply the bounded retry and comparison protocol |
| Environment failure | Dependency, service, credential, network, resource, or runner problem prevents a valid result | Repair or escalate the environment; do not reinterpret as a test pass |
| Inconclusive | Available evidence cannot distinguish the cases above | Stop and request human direction |

## 4. Bounded flaky-test protocol

When an expected test fails:

1. Save the command, exit code, test name, failure signature, timestamp, branch, and commit.
2. Check whether the failure is logically related to the changed code.
3. Rerun the exact test no more than two additional times without changing code or inputs.
4. When practical, run the same command against the unchanged base commit in an isolated worktree or known-good run.
5. Compare failure signatures, not only pass/fail status.
6. Classify the result using the table above.
7. Report all attempts. Never report only the successful retry.

An agent must not:

- rerun indefinitely until a pass appears;
- increase retry counts to hide instability;
- delete, skip, quarantine, or weaken the test;
- relax assertions, timeouts, coverage, or required checks;
- alter random seeds without recording the change; or
- mark a flaky failure as unrelated without base-branch or historical evidence.

## 5. Large-suite policy

For suites that exceed the interactive task window:

- run the focused validation synchronously;
- start the required large suite asynchronously in CI;
- preserve the job URL and commit SHA;
- state clearly which checks are complete, running, failed, skipped, or unavailable;
- do not keep an interactive agent idle solely to watch a long job;
- allow a later event or reviewer to resume the workflow when CI completes; and
- retain the human review and merge gate even when all checks pass.

If the large suite is known to contain unrelated failures, maintain an approved baseline or failure allowlist owned by Developer Productivity. Agents may read it but may not add entries without approval.

## 6. Environment validation

Before judging code, confirm that the environment has:

- the repository's approved runtime and package-manager versions;
- dependencies installed from the lockfile;
- required services, ports, secrets, and network routes;
- sufficient CPU, memory, and disk for the selected checks; and
- the same relevant feature flags and test configuration as the approved baseline.

When environment setup fails, report it as an environment failure. Do not spend additional model capability attempting to reason around a missing executable dependency.

## 7. Required evidence in Jira and the pull request

Record:

- command and scope;
- branch and commit;
- start/end time or duration;
- attempt count;
- result and classification;
- base-branch comparison when performed;
- CI or artifact link;
- affected test names;
- relevant failure signature; and
- owner of any required follow-up.

Use a concise structured summary. Link to complete logs instead of copying them into the agent context, Jira, or the pull request.

## 8. Readiness rule

An agent may recommend `Ready for human review` only when focused validation passes and every broader failure is explicitly classified. It must recommend `Not ready` or `Human decision required` when evidence is inconclusive, a change-caused regression remains, or a required check has been waived without an approved exception.
