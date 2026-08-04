import { css } from '@emotion/css';
import { useCallback, useMemo, useState } from 'react';
import { useAsync } from 'react-use';

import { type GrafanaTheme2 } from '@grafana/data';
import { t, Trans } from '@grafana/i18n';
import {
  Alert,
  Badge,
  Button,
  type Column,
  EmptyState,
  FilterInput,
  InteractiveTable,
  RadioButtonGroup,
  Stack,
  Switch,
  Text,
  useStyles2,
} from '@grafana/ui';
import { Page } from 'app/core/components/Page/Page';
import { useAppNotification } from 'app/core/copy/appNotification';
import { contextSrv } from 'app/core/services/context_srv';
import { AccessControlAction } from 'app/types/accessControl';

import { getFeatureToggles, updateFeatureToggles, type LabsFeatureToggle } from './api';

type StateFilter = 'all' | 'enabled' | 'disabled' | 'modified';

interface ToggleRow extends LabsFeatureToggle {
  /** the value shown in the table, including changes that were not saved yet */
  value: boolean;
  changed: boolean;
}

const PAGE_SIZE = 25;

export function LabsPage() {
  const styles = useStyles2(getStyles);
  const notifyApp = useAppNotification();

  const [toggles, setToggles] = useState<LabsFeatureToggle[]>([]);
  const [changes, setChanges] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [stateFilter, setStateFilter] = useState<StateFilter>('all');

  const canWrite = contextSrv.hasPermission(AccessControlAction.FeatureManagementWrite);

  const { loading, error } = useAsync(async () => {
    setToggles(await getFeatureToggles());
  }, []);

  const onToggle = useCallback((toggle: LabsFeatureToggle, enabled: boolean) => {
    setChanges((current) => {
      const next = { ...current };
      // Going back to the value the instance is running with is not a change
      if (enabled === toggle.enabled) {
        delete next[toggle.name];
      } else {
        next[toggle.name] = enabled;
      }
      return next;
    });
  }, []);

  const onSave = async () => {
    setSaving(true);
    try {
      setToggles(await updateFeatureToggles(changes));
      setChanges({});
      notifyApp.success(t('labs.feature-toggles.save-success', 'Feature toggles updated'));
    } catch (err) {
      notifyApp.error(
        t('labs.feature-toggles.save-error', 'Failed to update feature toggles'),
        err instanceof Error ? err.message : undefined
      );
    } finally {
      setSaving(false);
    }
  };

  // The columns must keep a stable identity, otherwise every cell is remounted on
  // each change and the switch that was just clicked loses focus. The unsaved value
  // travels with the row instead.
  const columns = useMemo(
    (): Array<Column<ToggleRow>> => [
      {
        id: 'name',
        header: t('labs.feature-toggles.column-name', 'Name'),
        sortType: 'string',
        cell: ({ row: { original: toggle } }) => (
          <Stack direction="column" gap={0}>
            <Text weight="medium">{toggle.name}</Text>
            {toggle.description && (
              <Text variant="bodySmall" color="secondary">
                {toggle.description}
              </Text>
            )}
          </Stack>
        ),
      },
      {
        id: 'stage',
        header: t('labs.feature-toggles.column-stage', 'Stage'),
        sortType: 'string',
        disableGrow: true,
        cell: ({ row: { original: toggle } }) => <Badge text={toggle.stage ?? 'unknown'} color="blue" />,
      },
      {
        id: 'enabled',
        header: t('labs.feature-toggles.column-state', 'State'),
        disableGrow: true,
        cell: ({ row: { original: toggle } }) => (
          <Stack alignItems="center" gap={1}>
            <Switch
              value={toggle.value}
              disabled={!canWrite || toggle.readOnly || saving}
              onChange={(event) => onToggle(toggle, event.currentTarget.checked)}
              aria-label={toggle.name}
            />
            {toggle.readOnly && (
              <Badge
                text={t('labs.feature-toggles.badge-read-only', 'Read only')}
                color="orange"
                icon="exclamation-triangle"
                tooltip={toggle.readOnlyReason}
              />
            )}
            {toggle.changed ? (
              <Badge text={t('labs.feature-toggles.badge-unsaved', 'Unsaved')} color="orange" icon="pen" />
            ) : (
              toggle.overridden && (
                <Badge text={t('labs.feature-toggles.badge-modified', 'Modified')} color="purple" icon="pen" />
              )
            )}
          </Stack>
        ),
      },
    ],
    [canWrite, onToggle, saving]
  );

  const rows = useMemo((): ToggleRow[] => {
    const search = query.trim().toLowerCase();

    return toggles
      .filter((toggle) => {
        if (
          search &&
          !toggle.name.toLowerCase().includes(search) &&
          !toggle.description?.toLowerCase().includes(search)
        ) {
          return false;
        }

        switch (stateFilter) {
          case 'enabled':
            return toggle.enabled;
          case 'disabled':
            return !toggle.enabled;
          case 'modified':
            return toggle.overridden;
          default:
            return true;
        }
      })
      .map((toggle) => ({
        ...toggle,
        value: changes[toggle.name] ?? toggle.enabled,
        changed: toggle.name in changes,
      }));
  }, [toggles, query, stateFilter, changes]);

  const changeCount = Object.keys(changes).length;
  const enabledCount = toggles.filter((toggle) => toggle.enabled).length;

  return (
    <Page navId="labs">
      <Page.Contents isLoading={loading}>
        {error && (
          <Alert severity="error" title={t('labs.feature-toggles.load-error', 'Failed to load feature toggles')}>
            {error.message}
          </Alert>
        )}

        <Stack direction="column" gap={2}>
          <Text color="secondary">
            <Trans i18nKey="labs.feature-toggles.description">
              Feature toggles control which features this Grafana instance runs. Changes are applied to the whole
              instance and are kept when Grafana restarts. Reload the page after saving to pick up changes to the user
              interface.
            </Trans>
          </Text>

          {!canWrite && (
            <Alert
              severity="info"
              title={t('labs.feature-toggles.read-only-title', 'You can not change feature toggles')}
            >
              <Trans i18nKey="labs.feature-toggles.read-only-description">
                Ask an administrator for the feature toggle write permission to turn features on and off.
              </Trans>
            </Alert>
          )}

          <Stack direction="row" gap={2} alignItems="center" wrap="wrap">
            <div className={styles.search}>
              <FilterInput
                value={query}
                onChange={setQuery}
                placeholder={t('labs.feature-toggles.search-placeholder', 'Search feature toggles')}
                escapeRegex={false}
              />
            </div>
            <RadioButtonGroup
              value={stateFilter}
              onChange={setStateFilter}
              options={[
                { label: t('labs.feature-toggles.filter-all', 'All'), value: 'all' },
                { label: t('labs.feature-toggles.filter-enabled', 'Enabled'), value: 'enabled' },
                { label: t('labs.feature-toggles.filter-disabled', 'Disabled'), value: 'disabled' },
                { label: t('labs.feature-toggles.filter-modified', 'Modified'), value: 'modified' },
              ]}
            />
            <Text variant="bodySmall" color="secondary">
              <Trans
                i18nKey="labs.feature-toggles.summary"
                values={{ enabledCount, totalCount: toggles.length, shownCount: rows.length }}
              >
                {'{{enabledCount}} of {{totalCount}} toggles enabled, {{shownCount}} shown'}
              </Trans>
            </Text>
          </Stack>

          {!loading && rows.length === 0 ? (
            <EmptyState
              variant="not-found"
              message={t('labs.feature-toggles.empty-message', 'No feature toggles found')}
            />
          ) : (
            <InteractiveTable columns={columns} data={rows} getRowId={(toggle) => toggle.name} pageSize={PAGE_SIZE} />
          )}
        </Stack>
      </Page.Contents>

      {changeCount > 0 && (
        <div className={styles.saveBar}>
          <Stack direction="row" gap={2} alignItems="center" justifyContent="flex-end">
            <Text>
              <Trans i18nKey="labs.feature-toggles.unsaved-changes" values={{ changeCount }}>
                {'Unsaved changes: {{changeCount}}'}
              </Trans>
            </Text>
            <Button variant="secondary" onClick={() => setChanges({})} disabled={saving}>
              <Trans i18nKey="labs.feature-toggles.discard">Discard</Trans>
            </Button>
            <Button onClick={onSave} disabled={saving} icon={saving ? 'spinner' : undefined}>
              <Trans i18nKey="labs.feature-toggles.save">Save changes</Trans>
            </Button>
          </Stack>
        </div>
      )}
    </Page>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  search: css({
    flexGrow: 1,
    minWidth: '200px',
  }),
  saveBar: css({
    position: 'sticky',
    bottom: 0,
    padding: theme.spacing(2),
    background: theme.colors.background.secondary,
    borderTop: `1px solid ${theme.colors.border.weak}`,
  }),
});

export default LabsPage;
