import { css } from '@emotion/css';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { type GrafanaTheme2 } from '@grafana/data';
import { Trans, t } from '@grafana/i18n';
import {
  Alert,
  Badge,
  type BadgeColor,
  type CellProps,
  type Column,
  EmptyState,
  FilterInput,
  Icon,
  InteractiveTable,
  LoadingPlaceholder,
  RadioButtonGroup,
  Stack,
  Switch,
  Text,
  Tooltip,
  useStyles2,
} from '@grafana/ui';
import { Page } from 'app/core/components/Page/Page';
import { useAppNotification } from 'app/core/copy/appNotification';

import { type FeatureToggle, type FeatureToggleState, getFeatureToggles, updateFeatureToggles } from './api';

type StateFilter = 'all' | 'enabled' | 'disabled';

type ToggleCell<T extends keyof FeatureToggle = keyof FeatureToggle> = CellProps<FeatureToggle, FeatureToggle[T]>;

export function LabsPage() {
  const styles = useStyles2(getStyles);
  const notifyApp = useAppNotification();

  const [state, setState] = useState<FeatureToggleState>();
  const [error, setError] = useState<string>();
  const [query, setQuery] = useState('');
  const [stateFilter, setStateFilter] = useState<StateFilter>('all');
  const [updating, setUpdating] = useState<string[]>([]);

  useEffect(() => {
    getFeatureToggles()
      .then(setState)
      .catch(() => setError(t('labs.load-error', 'Failed to load the feature toggles of this instance')));
  }, []);

  const onToggle = useCallback(
    async (toggle: FeatureToggle, enabled: boolean) => {
      setUpdating((current) => [...current, toggle.name]);

      try {
        setState(await updateFeatureToggles([{ name: toggle.name, enabled }]));
        notifyApp.success(
          enabled
            ? t('labs.toggle-enabled', '{{name}} enabled', { name: toggle.name })
            : t('labs.toggle-disabled', '{{name}} disabled', { name: toggle.name })
        );
      } catch (err) {
        notifyApp.error(t('labs.toggle-error', 'Failed to update {{name}}', { name: toggle.name }));
      } finally {
        setUpdating((current) => current.filter((name) => name !== toggle.name));
      }
    },
    [notifyApp]
  );

  const columns = useMemo((): Array<Column<FeatureToggle>> => {
    return [
      {
        id: 'enabled',
        header: t('labs.column-state', 'State'),
        cell: ({ row: { original } }: ToggleCell) => (
          <Switch
            value={original.enabled}
            disabled={!state?.allowEditing || !original.writeable || updating.includes(original.name)}
            onChange={(event) => onToggle(original, event.currentTarget.checked)}
            aria-label={t('labs.toggle-aria-label', 'Toggle {{name}}', { name: original.name })}
          />
        ),
      },
      {
        id: 'name',
        header: t('labs.column-name', 'Feature toggle'),
        sortType: 'string',
        cell: ({ row: { original } }: ToggleCell) => (
          <Stack direction="row" gap={1} alignItems="center">
            <span className={styles.name}>{original.name}</span>
            {original.warning && (
              <Tooltip content={original.warning}>
                <Icon name="exclamation-triangle" className={styles.warning} />
              </Tooltip>
            )}
            {original.requiresRestart && (
              <Tooltip content={t('labs.requires-restart-tooltip', 'Changing this toggle requires a Grafana restart')}>
                <Icon name="info-circle" />
              </Tooltip>
            )}
          </Stack>
        ),
      },
      {
        id: 'stage',
        header: t('labs.column-stage', 'Stage'),
        sortType: 'string',
        cell: ({ row: { original } }: ToggleCell) => (
          <Badge text={original.stage} color={getStageColor(original.stage)} />
        ),
      },
      {
        id: 'source',
        header: t('labs.column-source', 'Set by'),
        sortType: 'string',
        cell: ({ row: { original } }: ToggleCell) => <Text color="secondary">{getSourceLabel(original)}</Text>,
      },
      {
        id: 'description',
        header: t('labs.column-description', 'Description'),
        cell: ({ row: { original } }: ToggleCell) => <Text color="secondary">{original.description ?? ''}</Text>,
      },
    ];
  }, [onToggle, state?.allowEditing, styles.name, styles.warning, updating]);

  const toggles = useMemo(() => filterToggles(state?.toggles ?? [], query, stateFilter), [query, state, stateFilter]);
  const enabledCount = state?.toggles.filter((toggle) => toggle.enabled).length ?? 0;

  return (
    <Page navId="labs">
      <Page.Contents>
        <Stack direction="column" gap={2}>
          <Alert severity="info" title={t('labs.intro-title', 'Feature toggles')}>
            <Trans i18nKey="labs.intro-description">
              These are all the feature toggles registered in this Grafana instance. Changes are saved and applied
              straight away, but toggles that change how Grafana starts up, and toggles used by the user interface, only
              take full effect after a reload or a restart.
            </Trans>
          </Alert>

          {state?.restartRequired && (
            <Alert severity="warning" title={t('labs.restart-required-title', 'Restart required')}>
              <Trans i18nKey="labs.restart-required-description">
                A feature toggle that is read while Grafana starts up has changed. Restart Grafana to fully apply it.
              </Trans>
            </Alert>
          )}

          {error && (
            <Alert severity="error" title={error}>
              <Trans i18nKey="labs.load-error-description">
                Reload the page to try again. Feature toggles can also be set in the [feature_toggles] section of the
                Grafana configuration file.
              </Trans>
            </Alert>
          )}

          {!state && !error && <LoadingPlaceholder text={t('labs.loading', 'Loading feature toggles...')} />}

          {state && (
            <>
              <Stack direction="row" gap={2} alignItems="center" wrap="wrap">
                <FilterInput
                  placeholder={t('labs.search-placeholder', 'Search feature toggles')}
                  value={query}
                  onChange={setQuery}
                  width={40}
                />
                <RadioButtonGroup<StateFilter>
                  value={stateFilter}
                  options={[
                    { label: t('labs.filter-all', 'All'), value: 'all' },
                    { label: t('labs.filter-enabled', 'Enabled'), value: 'enabled' },
                    { label: t('labs.filter-disabled', 'Disabled'), value: 'disabled' },
                  ]}
                  onChange={setStateFilter}
                />
                <Text color="secondary">
                  {t('labs.enabled-count', '{{enabled}} of {{total}} enabled', {
                    enabled: enabledCount,
                    total: state.toggles.length,
                  })}
                </Text>
              </Stack>

              {!state.allowEditing && (
                <Text color="secondary">
                  <Trans i18nKey="labs.read-only">
                    You need the feature toggle write permission to change these values.
                  </Trans>
                </Text>
              )}

              {toggles.length > 0 ? (
                <InteractiveTable columns={columns} data={toggles} getRowId={(toggle) => toggle.name} />
              ) : (
                <EmptyState variant="not-found" message={t('labs.empty-state', 'No feature toggles found')} />
              )}
            </>
          )}
        </Stack>
      </Page.Contents>
    </Page>
  );
}

function filterToggles(toggles: FeatureToggle[], query: string, stateFilter: StateFilter): FeatureToggle[] {
  const search = query.trim().toLowerCase();

  return toggles.filter((toggle) => {
    if (stateFilter === 'enabled' && !toggle.enabled) {
      return false;
    }
    if (stateFilter === 'disabled' && toggle.enabled) {
      return false;
    }
    if (!search) {
      return true;
    }
    return (
      toggle.name.toLowerCase().includes(search) ||
      toggle.description?.toLowerCase().includes(search) ||
      toggle.stage.toLowerCase().includes(search)
    );
  });
}

function getStageColor(stage: string): BadgeColor {
  switch (stage) {
    case 'GA':
      return 'green';
    case 'preview':
      return 'blue';
    case 'deprecated':
      return 'red';
    default:
      return 'orange';
  }
}

function getSourceLabel(toggle: FeatureToggle): string {
  switch (toggle.source) {
    case 'labs':
      return t('labs.source-labs', 'Labs');
    case 'config':
      return t('labs.source-config', 'Configuration file');
    default:
      return t('labs.source-default', 'Default');
  }
}

const getStyles = (theme: GrafanaTheme2) => ({
  name: css({
    fontFamily: theme.typography.fontFamilyMonospace,
    fontSize: theme.typography.bodySmall.fontSize,
  }),
  warning: css({
    color: theme.colors.warning.text,
  }),
});

export default LabsPage;
