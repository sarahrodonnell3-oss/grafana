import { css } from '@emotion/css';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { type GrafanaTheme2 } from '@grafana/data';
import { Trans, t } from '@grafana/i18n';
import { config, getBackendSrv, isFetchError } from '@grafana/runtime';
import {
  Alert,
  Badge,
  type BadgeColor,
  Button,
  type CellProps,
  type Column,
  FilterInput,
  Icon,
  InteractiveTable,
  LoadingPlaceholder,
  Stack,
  Switch,
  Tooltip,
  useStyles2,
} from '@grafana/ui';
import { Page } from 'app/core/components/Page/Page';
import { contextSrv } from 'app/core/services/context_srv';
import { AccessControlAction } from 'app/types/accessControl';

interface LabsFeature {
  name: string;
  description: string;
  stage: string;
  enabled: boolean;
  requiresRestart: boolean;
  requiresDevMode: boolean;
}

const stageBadgeColor: Record<string, BadgeColor> = {
  experimental: 'orange',
  privatePreview: 'purple',
  preview: 'blue',
  GA: 'green',
  deprecated: 'red',
};

// The backend runs in dev mode whenever the environment is not "production"
// (see FeatureManager.isDevMod). Dev-only flags cannot be enabled otherwise.
const isDevMode = config.buildInfo.env !== 'production';

export default function LabsPage() {
  const styles = useStyles2(getStyles);
  const canWrite = contextSrv.hasPermission(AccessControlAction.FeatureManagementWrite);

  const [features, setFeatures] = useState<LabsFeature[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | undefined>();
  const [query, setQuery] = useState('');
  const [updating, setUpdating] = useState<string | undefined>();
  const [needsReload, setNeedsReload] = useState(false);

  useEffect(() => {
    let mounted = true;
    getBackendSrv()
      .get<{ features: LabsFeature[] }>('/api/labs/features')
      .then((res) => {
        if (mounted) {
          setFeatures(res.features ?? []);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setLoadError(isFetchError(err) ? (err.data?.message ?? err.statusText) : String(err));
          setIsLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleToggle = useCallback(async (feature: LabsFeature, enabled: boolean) => {
    setUpdating(feature.name);
    try {
      await getBackendSrv().patch('/api/labs/features', { [feature.name]: enabled });
      setFeatures((prev) => prev.map((f) => (f.name === feature.name ? { ...f, enabled } : f)));
      setNeedsReload(true);
    } finally {
      setUpdating(undefined);
    }
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return features;
    }
    return features.filter((f) => f.name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q));
  }, [features, query]);

  const columns: Array<Column<LabsFeature>> = useMemo(
    () => [
      {
        id: 'name',
        header: t('labs.column.name', 'Name'),
        sortType: 'string',
        cell: ({ row: { original } }: CellProps<LabsFeature>) => <span className={styles.name}>{original.name}</span>,
      },
      {
        id: 'description',
        header: t('labs.column.description', 'Description'),
        cell: ({ row: { original } }: CellProps<LabsFeature>) => <span>{original.description}</span>,
      },
      {
        id: 'stage',
        header: t('labs.column.stage', 'Stage'),
        sortType: 'string',
        cell: ({ row: { original } }: CellProps<LabsFeature>) => (
          <Badge text={original.stage} color={stageBadgeColor[original.stage] ?? 'darkgrey'} />
        ),
      },
      {
        id: 'enabled',
        header: t('labs.column.state', 'State'),
        cell: ({ row: { original } }: CellProps<LabsFeature>) => {
          const devDisabled = original.requiresDevMode && !isDevMode;
          return (
            <Stack alignItems="center" gap={1}>
              <Switch
                value={original.enabled}
                disabled={!canWrite || devDisabled || updating === original.name}
                aria-label={original.name}
                onChange={(e) => handleToggle(original, e.currentTarget.checked)}
              />
              {original.requiresRestart && (
                <Tooltip
                  content={t(
                    'labs.requires-restart-tooltip',
                    'This flag is read at startup. Changing it at runtime may not fully take effect until Grafana is restarted.'
                  )}
                >
                  <span data-testid={`labs-restart-warning-${original.name}`}>
                    <Icon name="exclamation-triangle" className={styles.warnIcon} />
                  </span>
                </Tooltip>
              )}
              {devDisabled && (
                <Tooltip
                  content={t(
                    'labs.requires-dev-mode-tooltip',
                    'This flag can only be enabled when Grafana runs in development mode.'
                  )}
                >
                  <Icon name="lock" />
                </Tooltip>
              )}
            </Stack>
          );
        },
      },
    ],
    [canWrite, handleToggle, styles.name, styles.warnIcon, updating]
  );

  return (
    <Page navId="labs">
      <Page.Contents>
        <Stack direction="column" gap={2}>
          <Alert
            severity="info"
            title={t('labs.runtime-only-alert-title', 'Feature toggle changes are applied at runtime')}
          >
            <Trans i18nKey="labs.runtime-only-alert-body">
              Changes are kept in memory only and reset when Grafana restarts. Frontend features are read when the page
              loads, so reload the page after toggling for them to take effect.
            </Trans>
          </Alert>

          {needsReload && (
            <Alert severity="success" title={t('labs.reload-alert-title', 'Feature toggle updated')}>
              <Stack direction="row" alignItems="center" gap={2}>
                <Trans i18nKey="labs.reload-alert-body">Reload the page for the change to fully take effect.</Trans>
                <Button size="sm" onClick={() => window.location.reload()}>
                  <Trans i18nKey="labs.reload-button">Reload page</Trans>
                </Button>
              </Stack>
            </Alert>
          )}

          {loadError && (
            <Alert severity="error" title={t('labs.load-error-title', 'Failed to load feature toggles')}>
              {loadError}
            </Alert>
          )}

          {isLoading ? (
            <LoadingPlaceholder text={t('labs.loading', 'Loading feature toggles...')} />
          ) : (
            <>
              <FilterInput
                placeholder={t('labs.search-placeholder', 'Search feature toggles')}
                value={query}
                onChange={setQuery}
                escapeRegex={false}
              />
              <InteractiveTable columns={columns} data={filtered} getRowId={(feature) => feature.name} pageSize={25} />
            </>
          )}
        </Stack>
      </Page.Contents>
    </Page>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  name: css({
    fontWeight: theme.typography.fontWeightMedium,
    wordBreak: 'break-word',
  }),
  warnIcon: css({
    color: theme.colors.warning.text,
  }),
});
