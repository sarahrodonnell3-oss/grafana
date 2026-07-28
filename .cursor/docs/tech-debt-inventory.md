# Grafana tech debt inventory

Snapshot of measurable technical debt in this repository. All numbers come from static analysis of the working tree at commit `be9d8a266f7` (2026-07-28), plus git history where a trend is reported. Every figure below is reproducible with the command listed in its section.

Scope: tracked files only (`rg` respects `.gitignore`), `*.go`, `*.ts`, `*.tsx` unless stated otherwise. Total analysed volume: **2.87M lines** across 6,154 Go files and 8,894 TypeScript files.

## Headline totals

| Signal | Count | Source of truth |
| --- | --- | --- |
| ESLint suppressions (violations) | 1,724 across 576 files | `eslint-suppressions.json` |
| `TODO` / `FIXME` / `HACK` / `XXX` markers | 1,608 across 917 files | inline comments |
| `@ts-expect-error` / `@ts-ignore` | 600 across 221 files | inline comments |
| Deprecated API markers | 755 (417 TS `@deprecated`, 338 Go `// Deprecated:`) | inline comments |
| Disabled tests | 226 (179 Go `t.Skip`/`t.Skipf`, 47 FE `.skip`/`xit`) | test files |
| **Total debt signals** | **4,913** | sum of the above |

Marker mix by occurrence (1,614 — slightly above the 1,608 line count because a few lines carry two markers): `TODO` 1,366, `FIXME` 196, `HACK` 27, `XXX` 25.

```bash
rg -c -g '*.{go,ts,tsx}' '\b(TODO|FIXME|HACK|XXX)\b' | awk -F: '{s+=$2} END {print s, NR}'
rg -c -g '*.{ts,tsx}' '@ts-(expect-error|ignore)' | awk -F: '{s+=$2} END {print s, NR}'
rg -c -g '*.{ts,tsx}' '@deprecated' | awk -F: '{s+=$2} END {print s, NR}'
rg -c -t go '// Deprecated:' | awk -F: '{s+=$2} END {print s, NR}'
```

## ESLint suppressions are shrinking

`eslint-suppressions.json` is the repo's own debt ledger, and it is being paid down. Reading the newest commit of the file in each month:

| Month | Suppressed violations | Files |
| --- | --- | --- |
| 2025-09 | 2,571 | 869 |
| 2025-10 | 2,612 | 891 |
| 2025-11 | 2,491 | 842 |
| 2025-12 | 2,420 | 817 |
| 2026-01 | 2,403 | 802 |
| 2026-02 | 2,226 | 751 |
| 2026-03 | 2,140 | 712 |
| 2026-04 | 1,994 | 681 |
| 2026-05 | 1,988 | 682 |
| 2026-06 | 1,814 | 610 |
| 2026-07 | 1,724 | 576 |

That is **-33% in 11 months** (-847 violations, -293 files), averaging roughly -85 violations/month. Caveat: the rule set is not constant over this window. `no-restricted-syntax` went from 910 violations in 2025-09 to 223 in 2026-03 to zero entries in 2026-04, and `@grafana/require-no-margin` appears in that same month, so month-to-month deltas mix real fixes with rule churn.

Current breakdown by rule:

| Rule | Violations | Files |
| --- | --- | --- |
| `@typescript-eslint/no-explicit-any` | 720 | 246 |
| `@typescript-eslint/consistent-type-assertions` | 396 | 202 |
| `@grafana/require-no-margin` | 322 | 116 |
| `@grafana/no-gf-form` | 116 | 35 |
| `@grafana/no-direct-local-storage-access` | 38 | 10 |
| `react-prefer-function-component` | 34 | 34 |
| `react-hooks/exhaustive-deps` | 30 | 24 |
| `react/no-unescaped-entities` | 30 | 4 |
| `@grafana/no-unreduced-motion` | 17 | 1 |
| `react-hooks/rules-of-hooks` | 14 | 9 |
| others (`no-plain-links`, `no-locale-compare`, `no-config-panels`) | 7 | 6 |

Two of these are migration debt with a known end state rather than style nits: `@grafana/no-gf-form` (116 violations) tracks the leftover pre-`@grafana/ui` form CSS, and `react-prefer-function-component` (34 files) tracks the last class components. `react-hooks/rules-of-hooks` (14 in 9 files) is the only group that is a latent correctness bug rather than a style violation.

## Debt density by area

Raw counts favour large directories, so density (signals per 10k lines) is the more useful ranking. Both are shown.

| Area | Total | per 10k LOC | Markers | ESLint | `@ts-expect-error` | Deprecated | Skipped |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `packages/grafana-schema` | 118 | 86.1 | 83 | 8 | 0 | 27 | 0 |
| `packages/grafana-data` | 454 | 69.9 | 34 | 241 | 41 | 136 | 2 |
| `packages/grafana-ui` | 450 | 35.7 | 56 | 215 | 65 | 103 | 11 |
| `public/app` (core) | 199 | 27.7 | 41 | 102 | 33 | 22 | 1 |
| `public/app/plugins` | 550 | 24.3 | 116 | 320 | 63 | 47 | 4 |
| `packages/grafana-runtime` | 68 | 24.2 | 8 | 34 | 3 | 23 | 0 |
| `public/app/features` | 1,523 | 19.7 | 298 | 779 | 377 | 50 | 19 |
| `pkg/api` | 81 | 19.0 | 17 | 0 | 0 | 63 | 1 |
| `pkg/storage` | 263 | 17.1 | 136 | 0 | 0 | 84 | 43 |
| `pkg/setting` | 16 | 14.2 | 10 | 0 | 0 | 6 | 0 |
| `pkg/tests` | 142 | 13.5 | 69 | 0 | 0 | 0 | 73 |
| `pkg/registry` | 202 | 10.5 | 180 | 0 | 0 | 20 | 2 |
| `pkg/services` | 411 | 8.5 | 252 | 0 | 0 | 133 | 26 |
| `pkg/tsdb` | 46 | 7.7 | 36 | 0 | 0 | 2 | 8 |
| `apps/provisioning` | 46 | 6.7 | 40 | 0 | 0 | 6 | 0 |
| `apps/dashboard` | 36 | 4.3 | 29 | 0 | 0 | 0 | 7 |

Reading of the ranking:

- The **published packages are the densest debt**, which matters more than the count suggests: `grafana-data`, `grafana-ui`, `grafana-runtime` and `grafana-schema` are public API surface, so their 289 `@deprecated` markers are commitments to plugin authors that cannot be deleted unilaterally.
- `public/app/features` holds the largest absolute pile (1,523 signals, 31% of the total), concentrated in the dashboard stack.
- `public/app/features` also owns **377 of the 600** `@ts-expect-error` suppressions, i.e. `strict: true` in `tsconfig.json` is real but locally opted out of at scale.
- Backend debt is dominated by markers rather than suppressions, since Go has no equivalent ledger. `pkg/storage` (17.1/10k) is the densest backend area and also has the most disabled tests outside `pkg/tests`.

## Test debt

Two independent proxies, both structural (they measure whether tests exist adjacent to code, not statement coverage):

- **Go**: 2,714 of 4,192 non-test `.go` files have no sibling `_test.go` (65%). **537 of 1,097 packages contain zero test files** — worst: `pkg/services` (138 packages), `pkg/build` (134), `pkg/registry` (43), `pkg/plugins` (18), `pkg/tsdb` (17).
- **Frontend**: 513 of 1,278 directories containing source have no test file at all (40%) — worst: `public/app/features` (555 untested files), `public/app/plugins` (189), `packages/grafana-ui/src` (159), `public/app/core` (87).

Explicitly disabled tests are the sharper signal, since they were written and then turned off: **179 Go `t.Skip`/`t.Skipf` calls** and **47 frontend skips in 28 files**. `pkg/tests` (73) and `pkg/storage` (43) hold two thirds of the Go skips.

## Feature toggle debt

`pkg/services/featuremgmt/registry.go` defines **363 toggles** in a single 3,146-line file:

| Stage | Toggles |
| --- | --- |
| Experimental | 258 |
| General availability | 55 |
| Public preview | 34 |
| Private preview | 13 |
| Deprecated | 3 |

Two problems here. First, **71% of toggles are experimental**, and each is a permanent branch in production code paths; only 3 are marked deprecated, so almost nothing is being retired. Second, GA toggles are themselves debt: 55 toggles are generally available and still gated, meaning the flag and its dead alternate path can be deleted.

Staleness, from `git blame` on the toggle definition lines (this dates the last edit of the line, not its introduction): 34 toggle definitions have not been touched since 2024 or earlier, 20 of them still `Experimental` — the clearest cleanup candidates.

This file is also the single largest churn hotspot in the repo, which shows how the registry pattern concentrates edits.

## Churn hotspots (last 12 months, 10,432 commits)

| File | Commits |
| --- | --- |
| `pkg/services/featuremgmt/registry.go` | 594 |
| `packages/grafana-data/src/types/featureToggles.gen.ts` | 475 |
| `pkg/services/featuremgmt/toggles_gen.go` | 356 |
| `pkg/server/wire_gen.go` | 277 |
| `pkg/setting/setting.go` | 145 |
| `pkg/registry/apis/provisioning/register.go` | 145 |
| `pkg/registry/apis/iam/register.go` | 132 |
| `pkg/storage/unified/resource/storage_backend.go` | 106 |
| `pkg/storage/unified/resource/server.go` | 101 |
| `pkg/storage/unified/search/bleve.go` | 97 |

Three of the top four are generated files, and one toggle addition costs three commits across `registry.go`, `toggles_gen.go` and `featureToggles.gen.ts`. That is merge-conflict surface rather than logic debt, but it is the most-touched code in the repo.

## Large-file debt

Files where size alone makes safe change hard (non-test, non-generated):

| File | Lines |
| --- | --- |
| `pkg/storage/unified/search/bleve.go` | 3,510 |
| `apps/dashboard/pkg/migration/conversion/v1_to_v2alpha1.go` | 3,155 |
| `pkg/services/featuremgmt/registry.go` | 3,146 |
| `pkg/storage/unified/resource/storage_backend.go` | 2,743 |
| `pkg/setting/setting.go` | 2,602 |
| `pkg/storage/unified/resource/server.go` | 2,559 |
| `pkg/services/dashboards/service/dashboard_service.go` | 2,446 |
| `apps/dashboard/pkg/migration/conversion/v2alpha1_to_v1.go` | 2,421 |
| `pkg/util/xorm/core/core.go` | 2,176 |
| `pkg/services/ngalert/store/alert_rule.go` | 2,102 |

## Top offending files

By inline markers:

| File | Markers |
| --- | --- |
| `packages/grafana-schema/src/common/common.gen.ts` | 52 |
| `pkg/storage/secret/metadata/query.go` | 18 |
| `pkg/tests/apis/dashboard/integration/api_validation_test.go` | 16 |
| `scripts/cuj-new.ts` | 15 |
| `apps/advisor/pkg/app/utils_test.go` | 14 |
| `pkg/storage/unified/resource/datastore.go` | 13 |
| `pkg/services/org/orgimpl/org.go` | 10 |
| `pkg/registry/apis/provisioning/register.go` | 10 |

By ESLint suppressions:

| File | Suppressions | Rules |
| --- | --- | --- |
| `packages/grafana-ui/src/themes/GlobalStyles/legacySelect.ts` | 28 | `no-gf-form` |
| `public/app/plugins/panel/geomap/editor/StyleEditor.tsx` | 26 | `require-no-margin`, `consistent-type-assertions` |
| `public/app/features/provisioning/Shared/BranchValidationError.tsx` | 26 | `no-unescaped-entities` |
| `packages/grafana-ui/src/themes/GlobalStyles/forms.ts` | 25 | `no-gf-form` |
| `public/app/features/dashboard/state/DashboardModel.ts` | 24 | `consistent-type-assertions`, `no-explicit-any` |
| `packages/grafana-data/src/types/datasource.ts` | 24 | `no-explicit-any` |
| `public/app/features/admin/ldap/LdapDrawer.tsx` | 23 | `require-no-margin` |
| `public/app/features/dashboard/state/PanelModel.ts` | 22 | `consistent-type-assertions`, `no-explicit-any` |

The old dashboard state layer (`DashboardModel.ts`, `PanelModel.ts`, `DashboardMigrator.ts` — 64 suppressions combined) is the clearest cluster: it is untyped-by-necessity legacy code that the scenes migration is meant to replace.

## Structural and dependency debt

- **Vendored ORM fork**: `pkg/util/xorm` is 14,053 lines of forked ORM code, excluded from linting in `.golangci.yml`.
- **Linter carve-outs**: `.golangci.yml` disables 12 `gosec` rules repo-wide (including `G115` integer overflow and `G110` decompression bombs) plus 2 more in test files, silences 10 `staticcheck` checks, and excludes `devenv`, `scripts` and `pkg/util/xorm` from all linting. `gocritic`/`ruleguard` has settings but is absent from the enabled linter list, so those rules never run.
- **Deprecated-import guards**: `depguard` bans `io/ioutil`, `github.com/pkg/errors`, both `gopkg.in/yaml` majors, `gofrs/uuid` and `xorcare/pointer` — evidence of migrations that were enforced going forward rather than completed.
- **Patched dependencies**: 5 vendored patches in `.yarn/patches` (`slate-dev-environment`, `react-split-pane`, `history@4`, `react-grid-layout`, `storybook`), plus ~40 `resolutions` pins in `package.json`. `slate` and `history@4` are abandoned upstream; each patch must be re-applied on every upgrade.
- **Module sprawl**: 32 Go modules in `go.work`, with 9 `depguard` rule groups holding the boundaries that keep `apps/*`, `pkg/apimachinery`, `pkg/apiserver`, `pkg/storage/unified` and the core datasource plugins from importing Grafana core.
- **Dual-track migrations in flight**: 508 files sit under `legacy`/`deprecated`-named paths, concentrated in `pkg/registry/apis` (368) and `pkg/storage/legacysql` (24). `public/app/features/dashboard` (old) coexists with `public/app/features/dashboard-scene` (new).
- **Schema migrations**: 42 migration files in `pkg/services/sqlstore/migrations/`, append-only and never squashed.
- **Frontend build surface**: 326 npm dependencies (162 runtime, 164 dev), plus 6 datasource plugins externalised into their own Yarn workspaces (`knip.config.ts`), each needing a separate build step.

## Suggested priorities

Ranked by risk relative to cleanup cost, not by count:

1. **`react-hooks/rules-of-hooks` (14 violations, 9 files)** — the only suppressions that are latent runtime bugs. Small, bounded, worth fixing outright.
2. **Retire GA and stale toggles (55 GA + 20 experimental untouched since ≤2024)** — deletes dead alternate code paths and reduces the top churn hotspot.
3. **Re-enable disabled tests (226 total, concentrated in `pkg/tests` and `pkg/storage`)** — each skip hides behaviour that CI claims to cover.
4. **Public API deprecations in `packages/*` (289 markers)** — needs a published removal schedule, not opportunistic deletion, because plugins depend on them.
5. **Legacy dashboard state layer (64 suppressions in three files)** — retire with the scenes migration rather than typing it in place.
6. **Reinstate the disabled `gosec` rules** — at minimum `G115` and `G110`, which are exploitable classes rather than style noise.

## Reproducing this report

Every table above is derived from the working tree with `rg`, `git blame`, `git log` and `python3` only. The per-area aggregation script is not committed; it groups `rg -c` output by the top two path segments and joins it against `eslint-suppressions.json`, then normalises by line count per area.
