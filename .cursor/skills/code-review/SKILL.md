---
name: code-review
description: Reviews Grafana code changes for correctness, security, tests, and project conventions. Use when the user asks for a code review, PR review, or review against Grafana standards.
disable-model-invocation: true
---

# Grafana Code Review

Review changes against Grafana conventions in `AGENTS.md`, `contribute/`, and directory-scoped `AGENTS.md` files. Focus on actionable findings, not style nits already enforced by linters.

## Scope

Determine what to review before reading code:

| User intent | Diff source |
|-------------|-------------|
| Branch / PR / "my changes" | `git diff <base>...HEAD` (default base: repo default branch) |
| Uncommitted / working tree | `git diff` + `git diff --cached` |
| Specific PR | `gh pr diff <number>` or checkout PR branch first |
| Specific files | Read files + nearby callers/tests |

Run in parallel when useful: `git status`, `git diff`, `git log --oneline -5`, and `gh pr view` when a PR number is known.

## Workflow

1. **Identify touched areas** — frontend (`public/app/`), backend (`pkg/`), shared packages (`packages/`), docs (`docs/`), config (`conf/`), unified storage (`pkg/storage/unified/`).
2. **Load area rules** — read the matching `AGENTS.md` when present (alerting, unified storage, docs, CUJ instrumentation).
3. **Review dimensions** — correctness, security, tests, API/contract compatibility, UX/a11y, scope/focus.
4. **Check PR hygiene** — title format, linked issue, tests included, docs/config updates when required.
5. **Report findings** — use the output format below. Do not fix code unless the user asks.

## Quick checklist

- [ ] Logic handles edge cases and error paths
- [ ] No XSS, SQL injection, or command injection at trust boundaries
- [ ] Tests cover new/changed behavior (not snapshot tests)
- [ ] Frontend/backend split respected when both are not required
- [ ] Feature toggles for pre-GA behavior
- [ ] Config changes update `conf/defaults.ini`, `conf/sample.ini`, and docs
- [ ] Unified storage changes follow client/server compatibility rules
- [ ] Comments explain non-obvious *why*, not obvious *what*
- [ ] No secrets, internal URLs, or Jira/Slack links in code comments

For detailed standards by area, see [STANDARDS.md](STANDARDS.md).

## Output format

Start with a one-line verdict: **Approve**, **Approve with nits**, **Request changes**, or **Block**.

Then list findings sorted by severity:

| Severity | Location | Finding | Suggestion |
|----------|----------|---------|------------|
| Critical | `path:line` | What is wrong | Concrete fix |
| Major | `path:line` | What is wrong | Concrete fix |
| Minor | `path:line` | What is wrong | Concrete fix |
| Nit | `path:line` | Optional improvement | Optional |

**Severity guide**

- **Critical** — bug, security issue, data loss, broken compatibility, missing tests on a risky path
- **Major** — convention violation, missing error handling, inadequate test coverage, scope creep
- **Minor** — maintainability, missing docs for user-facing change, a11y gap
- **Nit** — optional polish; linters or follow-up PR is fine

End with:

```markdown
## Summary
- N critical, N major, N minor, N nit

## Test plan gaps
- [ ] ...

## PR hygiene
- Title: `<Area>: <Summary>` — pass/fail + note
- Linked issue: pass/fail
- Docs/config: pass/fail/N/A
```

If no issues: say so explicitly and note any residual test-plan gaps.

## Optional deep review

For a second pass focused on regressions and acceptance criteria, launch one `code-skeptic` subagent after this review. Do not launch both in parallel on the same diff unless the user asks.

## References

- PR template: `.github/PULL_REQUEST_TEMPLATE.md`
- Contribution guide: `contribute/create-pull-request.md`
- Root agent guide: `AGENTS.md`
- Backend: `contribute/backend/style-guide.md`
- Frontend: `contribute/style-guides/frontend.md`
