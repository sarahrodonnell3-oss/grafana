import { useHostTheme } from 'cursor/canvas';

type TokenBag = Record<string, unknown>;

function flatten(input: unknown, depth = 2): TokenBag {
  const out: TokenBag = {};
  if (!input || typeof input !== 'object') {
    return out;
  }
  for (const [key, value] of Object.entries(input as TokenBag)) {
    out[key] = value;
    if (depth > 0 && value && typeof value === 'object') {
      for (const [k2, v2] of Object.entries(flatten(value, depth - 1))) {
        if (!(k2 in out)) {
          out[k2] = v2;
        }
      }
    }
  }
  return out;
}

function pickColor(bag: TokenBag, keys: string[], fallback: string): string {
  for (const key of keys) {
    const value = bag[key];
    if (typeof value === 'string' && (value.startsWith('#') || value.startsWith('rgb') || value.startsWith('hsl'))) {
      return value;
    }
  }
  return fallback;
}

function alpha(color: string, amount: number, fallback: string): string {
  const hex = color.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${amount})`;
  }
  if (/^#[0-9a-fA-F]{3}$/.test(hex)) {
    const r = parseInt(hex[1] + hex[1], 16);
    const g = parseInt(hex[2] + hex[2], 16);
    const b = parseInt(hex[3] + hex[3], 16);
    return `rgba(${r}, ${g}, ${b}, ${amount})`;
  }
  return fallback;
}

function isDark(color: string): boolean {
  if (!/^#[0-9a-fA-F]{6}$/.test(color.trim())) {
    return false;
  }
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
}

const SUPPRESSION_TREND = [
  { month: '2025-09', total: 2571, files: 869, any: 913, assertions: 546 },
  { month: '2025-10', total: 2612, files: 891, any: 902, assertions: 537 },
  { month: '2025-11', total: 2491, files: 842, any: 877, assertions: 516 },
  { month: '2025-12', total: 2420, files: 817, any: 867, assertions: 506 },
  { month: '2026-01', total: 2403, files: 802, any: 865, assertions: 491 },
  { month: '2026-02', total: 2226, files: 751, any: 852, assertions: 480 },
  { month: '2026-03', total: 2140, files: 712, any: 827, assertions: 463 },
  { month: '2026-04', total: 1994, files: 681, any: 796, assertions: 446 },
  { month: '2026-05', total: 1988, files: 682, any: 789, assertions: 440 },
  { month: '2026-06', total: 1814, files: 610, any: 727, assertions: 406 },
  { month: '2026-07', total: 1724, files: 576, any: 720, assertions: 396 },
];

type AreaRow = {
  area: string;
  total: number;
  per10k: number;
  markers: number;
  eslint: number;
  tsSup: number;
  deprecated: number;
  skipped: number;
  kloc: number;
};

const AREAS: AreaRow[] = [
  { area: 'public/app/features', total: 1523, per10k: 19.7, markers: 298, eslint: 779, tsSup: 377, deprecated: 50, skipped: 19, kloc: 774.0 },
  { area: 'public/app/plugins', total: 550, per10k: 24.3, markers: 116, eslint: 320, tsSup: 63, deprecated: 47, skipped: 4, kloc: 226.7 },
  { area: 'packages/grafana-data', total: 454, per10k: 69.9, markers: 34, eslint: 241, tsSup: 41, deprecated: 136, skipped: 2, kloc: 65.0 },
  { area: 'packages/grafana-ui', total: 450, per10k: 35.7, markers: 56, eslint: 215, tsSup: 65, deprecated: 103, skipped: 11, kloc: 126.2 },
  { area: 'pkg/services', total: 411, per10k: 8.5, markers: 252, eslint: 0, tsSup: 0, deprecated: 133, skipped: 26, kloc: 481.0 },
  { area: 'pkg/storage', total: 263, per10k: 17.1, markers: 136, eslint: 0, tsSup: 0, deprecated: 84, skipped: 43, kloc: 153.5 },
  { area: 'pkg/registry', total: 202, per10k: 10.5, markers: 180, eslint: 0, tsSup: 0, deprecated: 20, skipped: 2, kloc: 192.4 },
  { area: 'public/app (core)', total: 199, per10k: 27.7, markers: 41, eslint: 102, tsSup: 33, deprecated: 22, skipped: 1, kloc: 71.7 },
  { area: 'pkg/tests', total: 142, per10k: 13.5, markers: 69, eslint: 0, tsSup: 0, deprecated: 0, skipped: 73, kloc: 104.8 },
  { area: 'packages/grafana-schema', total: 118, per10k: 86.1, markers: 83, eslint: 8, tsSup: 0, deprecated: 27, skipped: 0, kloc: 13.7 },
  { area: 'pkg/api', total: 81, per10k: 19.0, markers: 17, eslint: 0, tsSup: 0, deprecated: 63, skipped: 1, kloc: 42.6 },
  { area: 'packages/grafana-runtime', total: 68, per10k: 24.2, markers: 8, eslint: 34, tsSup: 3, deprecated: 23, skipped: 0, kloc: 28.0 },
  { area: 'pkg/tsdb', total: 46, per10k: 7.7, markers: 36, eslint: 0, tsSup: 0, deprecated: 2, skipped: 8, kloc: 59.7 },
  { area: 'apps/provisioning', total: 46, per10k: 6.7, markers: 40, eslint: 0, tsSup: 0, deprecated: 6, skipped: 0, kloc: 68.9 },
  { area: 'apps/dashboard', total: 36, per10k: 4.3, markers: 29, eslint: 0, tsSup: 0, deprecated: 0, skipped: 7, kloc: 83.7 },
];

const RULES = [
  { rule: '@typescript-eslint/no-explicit-any', count: 720, files: 246 },
  { rule: '@typescript-eslint/consistent-type-assertions', count: 396, files: 202 },
  { rule: '@grafana/require-no-margin', count: 322, files: 116 },
  { rule: '@grafana/no-gf-form', count: 116, files: 35 },
  { rule: '@grafana/no-direct-local-storage-access', count: 38, files: 10 },
  { rule: 'react-prefer-function-component', count: 34, files: 34 },
  { rule: 'react-hooks/exhaustive-deps', count: 30, files: 24 },
  { rule: 'react/no-unescaped-entities', count: 30, files: 4 },
  { rule: '@grafana/no-unreduced-motion', count: 17, files: 1 },
  { rule: 'react-hooks/rules-of-hooks', count: 14, files: 9 },
];

const TOGGLE_STAGES = [
  { stage: 'Experimental', count: 258 },
  { stage: 'General availability', count: 55 },
  { stage: 'Public preview', count: 34 },
  { stage: 'Private preview', count: 13 },
  { stage: 'Deprecated', count: 3 },
];

const CHURN = [
  { file: 'pkg/services/featuremgmt/registry.go', commits: 594, generated: false },
  { file: 'packages/grafana-data/src/types/featureToggles.gen.ts', commits: 475, generated: true },
  { file: 'pkg/services/featuremgmt/toggles_gen.go', commits: 356, generated: true },
  { file: 'pkg/server/wire_gen.go', commits: 277, generated: true },
  { file: 'pkg/setting/setting.go', commits: 145, generated: false },
  { file: 'pkg/registry/apis/provisioning/register.go', commits: 145, generated: false },
  { file: 'pkg/registry/apis/iam/register.go', commits: 132, generated: false },
  { file: 'pkg/storage/unified/resource/storage_backend.go', commits: 106, generated: false },
  { file: 'pkg/storage/unified/resource/server.go', commits: 101, generated: false },
  { file: 'pkg/storage/unified/search/bleve.go', commits: 97, generated: false },
];

const OFFENDERS = [
  { file: 'packages/grafana-ui/src/themes/GlobalStyles/legacySelect.ts', count: 28, what: 'no-gf-form' },
  { file: 'public/app/plugins/panel/geomap/editor/StyleEditor.tsx', count: 26, what: 'require-no-margin, consistent-type-assertions' },
  { file: 'public/app/features/provisioning/Shared/BranchValidationError.tsx', count: 26, what: 'no-unescaped-entities' },
  { file: 'packages/grafana-ui/src/themes/GlobalStyles/forms.ts', count: 25, what: 'no-gf-form' },
  { file: 'public/app/features/dashboard/state/DashboardModel.ts', count: 24, what: 'consistent-type-assertions, no-explicit-any' },
  { file: 'packages/grafana-data/src/types/datasource.ts', count: 24, what: 'no-explicit-any' },
  { file: 'public/app/features/admin/ldap/LdapDrawer.tsx', count: 23, what: 'require-no-margin' },
  { file: 'public/app/features/dashboard/state/PanelModel.ts', count: 22, what: 'consistent-type-assertions, no-explicit-any' },
];

const STRUCTURAL = [
  { label: 'Vendored xorm fork, excluded from linting', value: '14,053 lines', detail: 'pkg/util/xorm' },
  { label: 'gosec rules disabled repo-wide', value: '12', detail: 'includes G115 integer overflow, G110 decompression bombs' },
  { label: 'staticcheck checks silenced', value: '10', detail: 'plus devenv, scripts, xorm excluded from all linting' },
  { label: 'Patched npm dependencies', value: '5', detail: 'slate, react-split-pane, history@4, react-grid-layout, storybook' },
  { label: 'Go modules in go.work', value: '32', detail: '9 depguard rule groups enforce the boundaries' },
  { label: 'Files under legacy/deprecated paths', value: '508', detail: '368 in pkg/registry/apis, 24 in pkg/storage/legacysql' },
  { label: 'SQL migration files, never squashed', value: '42', detail: 'pkg/services/sqlstore/migrations' },
  { label: 'npm dependencies', value: '326', detail: '162 runtime, 164 dev' },
];

const PRIORITIES = [
  {
    title: 'Fix react-hooks/rules-of-hooks suppressions',
    scale: '14 violations, 9 files',
    why: 'The only suppressions that are latent runtime bugs rather than style debt. Small and bounded.',
  },
  {
    title: 'Retire GA and stale feature toggles',
    scale: '55 GA + 20 experimental untouched since 2024 or earlier',
    why: 'Deletes dead alternate code paths and defuses the single largest churn hotspot in the repo.',
  },
  {
    title: 'Re-enable disabled tests',
    scale: '226 skips, two thirds in pkg/tests and pkg/storage',
    why: 'Each skip hides behaviour that CI reports as covered.',
  },
  {
    title: 'Schedule public API deprecation removals',
    scale: '289 @deprecated markers in packages/*',
    why: 'Plugin authors depend on these, so they need a published removal schedule rather than opportunistic deletion.',
  },
  {
    title: 'Retire the legacy dashboard state layer',
    scale: '64 suppressions across DashboardModel, PanelModel, DashboardMigrator',
    why: 'Untyped-by-necessity code that the scenes migration already supersedes. Delete rather than type in place.',
  },
  {
    title: 'Reinstate G115 and G110 in gosec',
    scale: '2 of 12 disabled rules',
    why: 'Exploitable bug classes, not style noise.',
  },
];

export default function TechDebtInventory() {
  const rawTheme = useHostTheme() as unknown;
  const bag = flatten(rawTheme);

  const bg = pickColor(bag, ['background', 'bg', 'backgroundColor', 'canvasBackground'], '#f7f7f4');
  const fg = pickColor(bag, ['foreground', 'fg', 'text', 'textColor', 'color'], '#26251e');
  const dark = isDark(bg);
  const accent = pickColor(bag, ['accent', 'accentColor', 'primary'], '#f54e00');
  const card = pickColor(bag, ['card', 'cardBackground', 'surface', 'panel'], dark ? '#1b1913' : '#f2f1ed');
  const cardAlt = dark ? '#201e18' : '#ebeae5';
  const stroke = alpha(fg, 0.14, dark ? 'rgba(237,236,236,0.14)' : 'rgba(38,37,30,0.14)');
  const muted = alpha(fg, 0.6, dark ? 'rgba(237,236,236,0.6)' : 'rgba(38,37,30,0.6)');
  const faint = alpha(fg, 0.35, dark ? 'rgba(237,236,236,0.35)' : 'rgba(38,37,30,0.35)');
  const grid = alpha(fg, 0.08, dark ? 'rgba(237,236,236,0.08)' : 'rgba(38,37,30,0.08)');
  const neutralBar = alpha(fg, 0.28, dark ? 'rgba(237,236,236,0.28)' : 'rgba(38,37,30,0.28)');
  const neutralBarSoft = alpha(fg, 0.16, dark ? 'rgba(237,236,236,0.16)' : 'rgba(38,37,30,0.16)');

  const page = {
    background: bg,
    color: fg,
    padding: '40px 44px 56px',
    fontFamily:
      'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Helvetica, Arial, sans-serif',
    fontSize: 13,
    lineHeight: 1.5,
    minHeight: '100%',
  };
  const mono = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace';
  const h2 = { fontSize: 15, fontWeight: 600, margin: '0 0 4px' };
  const caption = { fontSize: 11, color: muted, margin: 0 };
  const sectionGap = { marginTop: 40 };

  const kpis = [
    { label: 'Total debt signals', value: '4,913', note: 'across 2.87M lines' },
    { label: 'ESLint suppressions', value: '1,724', note: '576 files, down 33% since Sep 2025' },
    { label: 'TODO / FIXME / HACK / XXX', value: '1,608', note: '917 files' },
    { label: 'Deprecated API markers', value: '755', note: '417 TypeScript, 338 Go' },
    { label: '@ts-expect-error escapes', value: '600', note: '221 files, under strict: true' },
    { label: 'Disabled tests', value: '226', note: '179 Go, 47 frontend' },
  ];

  // Trend chart geometry
  const tw = 980;
  const th = 300;
  const pad = { top: 18, right: 24, bottom: 46, left: 58 };
  const yMax = 2800;
  const px = (i: number) =>
    pad.left + (i * (tw - pad.left - pad.right)) / (SUPPRESSION_TREND.length - 1);
  const py = (v: number) => pad.top + (1 - v / yMax) * (th - pad.top - pad.bottom);
  const line = (key: 'total' | 'any' | 'assertions') =>
    SUPPRESSION_TREND.map((d, i) => `${i === 0 ? 'M' : 'L'}${px(i).toFixed(1)},${py(d[key]).toFixed(1)}`).join(' ');

  const maxPer10k = Math.max(...AREAS.map((a) => a.per10k));
  const densityRows = [...AREAS].sort((a, b) => b.per10k - a.per10k).slice(0, 12);
  const compositionRows = [...AREAS].sort((a, b) => b.total - a.total).slice(0, 8);
  const maxTotal = Math.max(...compositionRows.map((r) => r.total));
  const categories: Array<{ key: 'eslint' | 'markers' | 'tsSup' | 'deprecated' | 'skipped'; label: string; color: string }> = [
    { key: 'eslint', label: 'ESLint suppressions', color: accent },
    { key: 'markers', label: 'TODO / FIXME / HACK / XXX', color: alpha(fg, 0.55, muted) },
    { key: 'tsSup', label: '@ts-expect-error', color: alpha(accent, 0.45, 'rgba(245,78,0,0.45)') },
    { key: 'deprecated', label: 'Deprecated markers', color: alpha(fg, 0.3, neutralBar) },
    { key: 'skipped', label: 'Disabled tests', color: alpha(fg, 0.14, neutralBarSoft) },
  ];
  const toggleTotal = TOGGLE_STAGES.reduce((sum, s) => sum + s.count, 0);
  const maxChurn = Math.max(...CHURN.map((c) => c.commits));

  return (
    <div style={page}>
      <header style={{ maxWidth: 900 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: muted }}>
          Static analysis snapshot
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 650, margin: '8px 0 10px', letterSpacing: '-0.01em' }}>
          Grafana tech debt inventory
        </h1>
        <p style={{ margin: 0, color: muted, maxWidth: 720 }}>
          Every figure is measured from tracked <code style={{ fontFamily: mono }}>.go</code>,{' '}
          <code style={{ fontFamily: mono }}>.ts</code> and <code style={{ fontFamily: mono }}>.tsx</code> files at commit{' '}
          <code style={{ fontFamily: mono }}>be9d8a266f7</code>, plus git history where a trend is shown. 6,154 Go files and
          8,894 TypeScript files, 2.87M lines total.
        </p>
        <p style={{ ...caption, marginTop: 10 }}>
          Source: ripgrep, git blame, git log and eslint-suppressions.json · 2026-07-28
        </p>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(168px, 1fr))',
          gap: 1,
          background: stroke,
          border: `1px solid ${stroke}`,
          borderRadius: 8,
          overflow: 'hidden',
          marginTop: 28,
        }}
      >
        {kpis.map((k, i) => (
          <div key={k.label} style={{ background: i === 0 ? cardAlt : card, padding: '16px 18px' }}>
            <div style={{ fontSize: 11, color: muted }}>{k.label}</div>
            <div
              style={{
                fontSize: i === 0 ? 30 : 24,
                fontWeight: 600,
                marginTop: 6,
                letterSpacing: '-0.02em',
                color: i === 0 ? accent : fg,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {k.value}
            </div>
            <div style={{ fontSize: 11, color: faint, marginTop: 4 }}>{k.note}</div>
          </div>
        ))}
      </div>

      <section style={sectionGap}>
        <h2 style={h2}>ESLint suppressed violations per month</h2>
        <p style={caption}>
          Newest commit of eslint-suppressions.json in each month · Sep 2025 – Jul 2026 · totals count violations, not files
        </p>

        <div style={{ display: 'flex', gap: 18, margin: '14px 0 6px', flexWrap: 'wrap', fontSize: 11 }}>
          {[
            { label: 'All rules (total)', color: accent, width: 2.4 },
            { label: '@typescript-eslint/no-explicit-any', color: alpha(fg, 0.62, muted), width: 1.6 },
            { label: '@typescript-eslint/consistent-type-assertions', color: alpha(fg, 0.32, neutralBar), width: 1.6 },
          ].map((s) => (
            <span key={s.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: muted }}>
              <span style={{ width: 18, height: s.width * 1.5, background: s.color, borderRadius: 2 }} />
              {s.label}
            </span>
          ))}
        </div>

        <svg viewBox={`0 0 ${tw} ${th}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img">
          {[0, 700, 1400, 2100, 2800].map((v) => (
            <g key={v}>
              <line x1={pad.left} x2={tw - pad.right} y1={py(v)} y2={py(v)} stroke={grid} strokeWidth={1} />
              <text x={pad.left - 10} y={py(v) + 4} textAnchor="end" fontSize={10} fill={muted}>
                {v.toLocaleString()}
              </text>
            </g>
          ))}
          {SUPPRESSION_TREND.map((d, i) =>
            i % 2 === 0 ? (
              <text key={d.month} x={px(i)} y={th - pad.bottom + 18} textAnchor="middle" fontSize={10} fill={muted}>
                {d.month}
              </text>
            ) : null
          )}
          <text
            x={14}
            y={pad.top + (th - pad.top - pad.bottom) / 2}
            fontSize={10}
            fill={muted}
            textAnchor="middle"
            transform={`rotate(-90 14 ${pad.top + (th - pad.top - pad.bottom) / 2})`}
          >
            Suppressed violations (count)
          </text>
          <text x={tw / 2} y={th - 6} fontSize={10} fill={muted} textAnchor="middle">
            Month (newest commit sampled)
          </text>
          <path d={line('assertions')} fill="none" stroke={alpha(fg, 0.32, neutralBar)} strokeWidth={1.6} />
          <path d={line('any')} fill="none" stroke={alpha(fg, 0.62, muted)} strokeWidth={1.6} />
          <path d={line('total')} fill="none" stroke={accent} strokeWidth={2.4} />
          {SUPPRESSION_TREND.map((d, i) => (
            <circle key={d.month} cx={px(i)} cy={py(d.total)} r={2.6} fill={accent} />
          ))}
          <text x={px(0) + 6} y={py(2571) - 10} fontSize={11} fill={fg} fontWeight={600}>
            2,571
          </text>
          <text x={px(10) - 6} y={py(1724) - 12} fontSize={11} fill={accent} fontWeight={600} textAnchor="end">
            1,724
          </text>
        </svg>

        <p style={{ ...caption, marginTop: 8, maxWidth: 900 }}>
          Down 847 violations and 293 files in 11 months, roughly -85 per month. The rule set is not constant:{' '}
          <code style={{ fontFamily: mono }}>no-restricted-syntax</code> falls from 910 violations to 223 by Mar 2026 and to
          zero entries in Apr 2026, when <code style={{ fontFamily: mono }}>@grafana/require-no-margin</code> first appears.
          Month-to-month deltas therefore mix real fixes with rule churn.
        </p>
      </section>

      <section style={{ ...sectionGap, display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(0, 1fr)', gap: 32 }}>
        <div>
          <h2 style={h2}>Debt density by area</h2>
          <p style={caption}>Signals per 10,000 lines · top 12 areas by density · raw total shown at right</p>
          <div style={{ marginTop: 16 }}>
            {densityRows.map((row) => (
              <div key={row.area} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '5px 0' }}>
                <div
                  style={{
                    width: 186,
                    flex: '0 0 186px',
                    fontFamily: mono,
                    fontSize: 11,
                    color: fg,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={row.area}
                >
                  {row.area}
                </div>
                <div style={{ flex: 1, minWidth: 60, height: 14, background: grid, borderRadius: 2 }}>
                  <div
                    style={{
                      width: `${(row.per10k / maxPer10k) * 100}%`,
                      height: '100%',
                      background: row.area.startsWith('packages/') ? accent : neutralBar,
                      borderRadius: 2,
                    }}
                  />
                </div>
                <div
                  style={{ width: 46, textAlign: 'right', fontSize: 11, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}
                >
                  {row.per10k}
                </div>
                <div
                  style={{ width: 84, textAlign: 'right', fontSize: 11, color: muted, fontVariantNumeric: 'tabular-nums' }}
                >
                  {row.total.toLocaleString()} · {row.kloc}k
                </div>
              </div>
            ))}
          </div>
          <p style={{ ...caption, marginTop: 12, maxWidth: 640 }}>
            Highlighted bars are published packages. Density puts them at the top, which matters more than the raw count:
            their 289 <code style={{ fontFamily: mono }}>@deprecated</code> markers are commitments to plugin authors that
            cannot be deleted unilaterally.
          </p>
        </div>

        <div style={{ background: card, border: `1px solid ${stroke}`, borderRadius: 8, padding: '18px 20px' }}>
          <h2 style={h2}>Current suppressions by rule</h2>
          <p style={caption}>eslint-suppressions.json · violations (files)</p>
          <div style={{ marginTop: 14 }}>
            {RULES.map((r) => (
              <div key={r.rule} style={{ padding: '5px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 11 }}>
                  <span style={{ fontFamily: mono, color: fg, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.rule}
                  </span>
                  <span style={{ color: muted, fontVariantNumeric: 'tabular-nums', flex: '0 0 auto' }}>
                    {r.count} ({r.files})
                  </span>
                </div>
                <div style={{ height: 5, background: grid, borderRadius: 2, marginTop: 4 }}>
                  <div
                    style={{
                      width: `${(r.count / RULES[0].count) * 100}%`,
                      height: '100%',
                      background: r.rule.startsWith('react-hooks/rules') ? accent : neutralBar,
                      borderRadius: 2,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p style={{ ...caption, marginTop: 12 }}>
            Highlighted: <code style={{ fontFamily: mono }}>react-hooks/rules-of-hooks</code> is the only group that is a
            latent correctness bug rather than a style violation. Three more rules omitted (7 violations total).
          </p>
        </div>
      </section>

      <section style={sectionGap}>
        <h2 style={h2}>What the debt is made of, by area</h2>
        <p style={caption}>Top 8 areas by total signals · bars share one scale (max {maxTotal.toLocaleString()})</p>
        <div style={{ display: 'flex', gap: 18, margin: '14px 0 10px', flexWrap: 'wrap', fontSize: 11 }}>
          {categories.map((c) => (
            <span key={c.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: muted }}>
              <span style={{ width: 11, height: 11, background: c.color, borderRadius: 2 }} />
              {c.label}
            </span>
          ))}
        </div>
        {compositionRows.map((row) => (
          <div key={row.area} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0' }}>
            <div
              style={{
                width: 186,
                flex: '0 0 186px',
                fontFamily: mono,
                fontSize: 11,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={row.area}
            >
              {row.area}
            </div>
            <div style={{ flex: 1, display: 'flex', height: 18, background: grid, borderRadius: 2, overflow: 'hidden' }}>
              {categories.map((c) => (
                <div
                  key={c.key}
                  style={{ width: `${(row[c.key] / maxTotal) * 100}%`, background: c.color }}
                  title={`${row.area} · ${c.label}: ${row[c.key]}`}
                />
              ))}
            </div>
            <div style={{ width: 52, textAlign: 'right', fontSize: 11, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              {row.total.toLocaleString()}
            </div>
          </div>
        ))}
        <p style={{ ...caption, marginTop: 12, maxWidth: 900 }}>
          <code style={{ fontFamily: mono }}>public/app/features</code> holds 31% of all signals and 377 of the 600{' '}
          <code style={{ fontFamily: mono }}>@ts-expect-error</code> escapes, so <code style={{ fontFamily: mono }}>strict: true</code>{' '}
          is real but locally opted out of at scale. Backend areas carry almost no suppressions because Go has no equivalent
          ledger, which makes their marker and skip counts the only visible signal.
        </p>
      </section>

      <section style={{ ...sectionGap, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
        <div style={{ background: card, border: `1px solid ${stroke}`, borderRadius: 8, padding: '18px 20px' }}>
          <h2 style={h2}>Feature toggles by stage</h2>
          <p style={caption}>
            pkg/services/featuremgmt/registry.go · {toggleTotal} toggles in one 3,146-line file
          </p>
          <div style={{ display: 'flex', height: 26, borderRadius: 3, overflow: 'hidden', margin: '16px 0 10px' }}>
            {TOGGLE_STAGES.map((s, i) => (
              <div
                key={s.stage}
                style={{
                  width: `${(s.count / toggleTotal) * 100}%`,
                  background: i === 0 ? accent : alpha(fg, 0.4 - i * 0.07, neutralBar),
                }}
                title={`${s.stage}: ${s.count}`}
              />
            ))}
          </div>
          {TOGGLE_STAGES.map((s, i) => (
            <div
              key={s.stage}
              style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '3px 0', color: muted }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <span
                  style={{
                    width: 11,
                    height: 11,
                    borderRadius: 2,
                    background: i === 0 ? accent : alpha(fg, 0.4 - i * 0.07, neutralBar),
                  }}
                />
                {s.stage}
              </span>
              <span style={{ fontVariantNumeric: 'tabular-nums', color: fg }}>
                {s.count} · {Math.round((s.count / toggleTotal) * 100)}%
              </span>
            </div>
          ))}
          <p style={{ ...caption, marginTop: 12 }}>
            71% are experimental and only 3 are marked deprecated, so almost nothing is retired. The 55 GA toggles are debt
            too: flag and dead alternate path can both be deleted. Per git blame, 34 toggle definitions have not been touched
            since 2024 or earlier, 20 of them still experimental.
          </p>
        </div>

        <div style={{ background: card, border: `1px solid ${stroke}`, borderRadius: 8, padding: '18px 20px' }}>
          <h2 style={h2}>Test debt</h2>
          <p style={caption}>Structural proxy: whether tests exist beside the code, not statement coverage</p>
          <div style={{ marginTop: 16 }}>
            {[
              { label: 'Go files with no sibling _test.go', part: 2714, whole: 4192, unit: 'files' },
              { label: 'Go packages with zero test files', part: 537, whole: 1097, unit: 'packages' },
              { label: 'Frontend dirs with no test file', part: 513, whole: 1278, unit: 'directories' },
            ].map((b) => (
              <div key={b.label} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: muted }}>
                  <span>{b.label}</span>
                  <span style={{ color: fg, fontVariantNumeric: 'tabular-nums' }}>
                    {b.part.toLocaleString()} / {b.whole.toLocaleString()} {b.unit} ({Math.round((b.part / b.whole) * 100)}%)
                  </span>
                </div>
                <div style={{ height: 10, background: grid, borderRadius: 2, marginTop: 5 }}>
                  <div style={{ width: `${(b.part / b.whole) * 100}%`, height: '100%', background: neutralBar, borderRadius: 2 }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: `1px solid ${stroke}`, paddingTop: 14, marginTop: 4 }}>
            <div style={{ fontSize: 11, color: muted }}>Explicitly disabled tests, the sharper signal</div>
            <div style={{ display: 'flex', gap: 26, marginTop: 8 }}>
              {[
                { v: '179', l: 'Go t.Skip / t.Skipf' },
                { v: '47', l: 'frontend .skip / xit' },
                { v: '73', l: 'in pkg/tests alone' },
                { v: '43', l: 'in pkg/storage' },
              ].map((s) => (
                <div key={s.l}>
                  <div style={{ fontSize: 20, fontWeight: 600, color: accent, fontVariantNumeric: 'tabular-nums' }}>{s.v}</div>
                  <div style={{ fontSize: 11, color: muted }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section style={{ ...sectionGap, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24 }}>
        <div>
          <h2 style={h2}>Churn hotspots</h2>
          <p style={caption}>Commits touching each file in the last 12 months (10,432 commits total)</p>
          <div style={{ marginTop: 14 }}>
            {CHURN.map((c) => (
              <div key={c.file} style={{ padding: '4px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 11 }}>
                  <span
                    style={{ fontFamily: mono, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title={c.file}
                  >
                    {c.file}
                  </span>
                  <span style={{ color: muted, fontVariantNumeric: 'tabular-nums', flex: '0 0 auto' }}>{c.commits}</span>
                </div>
                <div style={{ height: 5, background: grid, borderRadius: 2, marginTop: 4 }}>
                  <div
                    style={{
                      width: `${(c.commits / maxChurn) * 100}%`,
                      height: '100%',
                      background: c.generated ? neutralBarSoft : neutralBar,
                      borderRadius: 2,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p style={{ ...caption, marginTop: 10 }}>
            Lighter bars are generated files. Three of the top four are generated, and one toggle addition costs three
            commits across registry.go, toggles_gen.go and featureToggles.gen.ts. That is merge-conflict surface rather than
            logic debt, but it is the most-touched code in the repo.
          </p>
        </div>

        <div>
          <h2 style={h2}>Files with the most ESLint suppressions</h2>
          <p style={caption}>eslint-suppressions.json · suppressed violations per file</p>
          <div style={{ marginTop: 14, border: `1px solid ${stroke}`, borderRadius: 8, overflow: 'hidden' }}>
            {OFFENDERS.map((o, i) => (
              <div
                key={o.file}
                style={{
                  display: 'flex',
                  gap: 12,
                  padding: '9px 14px',
                  background: i % 2 === 0 ? card : cardAlt,
                  alignItems: 'baseline',
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, width: 26, fontVariantNumeric: 'tabular-nums' }}>{o.count}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      fontFamily: mono,
                      fontSize: 11,
                      display: 'block',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={o.file}
                  >
                    {o.file}
                  </span>
                  <span style={{ fontSize: 10.5, color: muted }}>{o.what}</span>
                </span>
              </div>
            ))}
          </div>
          <p style={{ ...caption, marginTop: 10 }}>
            The old dashboard state layer (DashboardModel, PanelModel, DashboardMigrator) accounts for 64 suppressions
            combined: untyped-by-necessity legacy code that the scenes migration is meant to replace.
          </p>
        </div>
      </section>

      <section style={sectionGap}>
        <h2 style={h2}>Structural and dependency debt</h2>
        <p style={caption}>Config-level debt that no inline marker records · .golangci.yml, go.work, package.json, .yarn/patches</p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 10,
            marginTop: 16,
          }}
        >
          {STRUCTURAL.map((s) => (
            <div
              key={s.label}
              style={{ background: card, border: `1px solid ${stroke}`, borderRadius: 6, padding: '14px 16px' }}
            >
              <div style={{ fontSize: 18, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
              <div style={{ fontSize: 11.5, marginTop: 3 }}>{s.label}</div>
              <div style={{ fontSize: 10.5, color: faint, marginTop: 4, fontFamily: mono }}>{s.detail}</div>
            </div>
          ))}
        </div>
        <p style={{ ...caption, marginTop: 10, maxWidth: 900 }}>
          Two migrations are visibly mid-flight: <code style={{ fontFamily: mono }}>public/app/features/dashboard</code>{' '}
          coexists with <code style={{ fontFamily: mono }}>dashboard-scene</code>, and{' '}
          <code style={{ fontFamily: mono }}>pkg/storage/legacysql</code> coexists with{' '}
          <code style={{ fontFamily: mono }}>pkg/storage/unified</code>. The depguard bans on{' '}
          <code style={{ fontFamily: mono }}>io/ioutil</code>, <code style={{ fontFamily: mono }}>pkg/errors</code>, both{' '}
          yaml majors, <code style={{ fontFamily: mono }}>gofrs/uuid</code> and{' '}
          <code style={{ fontFamily: mono }}>xorcare/pointer</code> mark migrations enforced going forward rather than
          completed.
        </p>
      </section>

      <section style={sectionGap}>
        <h2 style={h2}>Where to spend effort first</h2>
        <p style={caption}>Ranked by risk relative to cleanup cost, not by count</p>
        <div style={{ marginTop: 16 }}>
          {PRIORITIES.map((p, i) => (
            <div
              key={p.title}
              style={{
                display: 'flex',
                gap: 16,
                padding: '14px 0',
                borderTop: i === 0 ? 'none' : `1px solid ${stroke}`,
              }}
            >
              <div
                style={{
                  flex: '0 0 26px',
                  fontSize: 18,
                  fontWeight: 600,
                  color: i === 0 ? accent : faint,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {i + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'baseline' }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600 }}>{p.title}</span>
                  <span style={{ fontSize: 11, color: muted, fontFamily: mono }}>{p.scale}</span>
                </div>
                <div style={{ fontSize: 12, color: muted, marginTop: 3, maxWidth: 780 }}>{p.why}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer style={{ marginTop: 40, paddingTop: 16, borderTop: `1px solid ${stroke}`, fontSize: 11, color: faint }}>
        Full write-up with reproduction commands: .cursor/docs/tech-debt-inventory.md
      </footer>
    </div>
  );
}
