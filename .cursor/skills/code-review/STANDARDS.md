# Grafana review standards

Use this reference during code review. Prefer linking to source docs over repeating them.

## Cross-cutting

From `AGENTS.md` and contribution docs:

- Match surrounding patterns before introducing new abstractions
- Keep PRs focused; split frontend and backend when they deploy independently
- Wire DI changes need `make gen-go`; CUE schema changes need `make gen-cue`
- Feature toggle changes need `make gen-feature-toggles`
- Human review gate: do not suggest pushing without explicit user approval

### Security

- Validate/sanitize at trust boundaries
- Parameterize SQL and shell usage
- Prevent XSS in rendered HTML and panel content
- Do not log secrets or credentials

### Comments

- Explain *why* for non-obvious logic only
- No Slack, GitHub, Jira, or other links in code comments

## Pull request hygiene

**Title:** `<Area>: <Summary>` — both parts start with a capital letter. Examples: `Alerting: Fix rule list pagination`, `Docs: Change url to URL`.

**Bug fixes:** description includes `Fixes #<issue>` or `Closes #<issue>` and a regression test.

**Pre-GA features:** behind a feature toggle.

**Config changes:** update all of:

- `conf/defaults.ini`
- `conf/sample.ini`
- `docs/sources/administration/configuration.md`

**Changelog / What's New:** user-impactful fixes and features need appropriate labels per `.github/PULL_REQUEST_TEMPLATE.md`.

## Frontend (`public/app/`, `packages/`)

From `contribute/create-pull-request.md` and style guides:

| Rule | Review for |
|------|------------|
| Styling | Emotion via `useStyles2`; theme palette for colors |
| Components | Small, composable; no large monolith components |
| Data fetching | RTK Query or Redux actions — not raw backend calls from components |
| Redux | `actionCreatorFactory` / `reducerFactory`; no state mutation; use selectors |
| TypeScript | Avoid `any` and `{}` without reason |
| Angular | Do not increase Angular codebase |
| Tests | React Testing Library; `userEvent.setup()`; prefer `*ByRole` queries |
| Snapshots | Do not add snapshot tests |
| Enzyme | Migrate to RTL when touching tests (except minimal bugfix-only PRs) |
| a11y | Semantic HTML; ARIA only when semantics are insufficient |
| ESLint | Suppressions must stay accurate; mention `yarn lint:prune` if suppressions look stale |

### Directory-specific

- **Alerting** (`public/app/features/alerting/unified/`): read `AGENTS.md` — prefer `@grafana/alerting`, `@grafana/api-clients`, MSW in tests, RTK Query over new Redux
- **CUJ instrumentation** (`public/app/core/journeys/`): read `AGENTS.md`

## Backend (`pkg/`, `apps/`)

From `contribute/backend/style-guide.md` and `recommended-practices.md`:

| Rule | Review for |
|------|------------|
| Idiomatic Go | Effective Go + Go Code Review Comments |
| Testing | `testing` + testify; avoid GoConvey in new tests |
| DB tests | Package has `TestMain` calling `testsuite.Run(m)` when using DB |
| Global state | Avoid new globals; prefer Wire DI |
| `init()` | Only for registering services/implementations |
| Settings | Inject `setting.Cfg`, not package-level vars |
| Errors | Follow `contribute/backend/errors.md` patterns |
| Lint | Must pass `make lint-go` / `.golangci.yml` |

### API handlers

- Business logic belongs in `pkg/services/<domain>/`, not handlers
- New endpoints need tests (see workspace test-case rule)
- Handlers stay thin; validate input at boundaries

## Unified storage (`pkg/storage/unified/`)

Read `pkg/storage/unified/AGENTS.md`. Critical checks:

1. Do not move responsibility between client and server in one PR
2. Proto/contract changes must be additive
3. New client behavior must fall back for old servers
4. PRs touching both client and server sides need justification or the `no-check-unified-storage-compatibility` label

## Documentation (`docs/`)

Read `docs/AGENTS.md` for style. User-facing changes need docs updates in the same PR when behavior changes.

## Tests to flag as missing

- Bug fix without regression test
- New API route/handler without test
- Permission/RBAC UI change without ability checks tested
- Refactor that changes behavior without updated tests
- Feature toggle default change without coverage of both paths

## Common false positives (skip unless relevant)

- Formatting nits already caught by Prettier, ESLint, or `make lint-go`
- Commit message style when reviewing uncommitted diffs only
- Legacy patterns in untouched lines (note as follow-up only if the PR expands them)
