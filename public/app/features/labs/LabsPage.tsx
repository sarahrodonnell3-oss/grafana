import { css } from '@emotion/css';
import { useMemo } from 'react';

import { type GrafanaTheme2 } from '@grafana/data';
import { Trans } from '@grafana/i18n';
import { config } from '@grafana/runtime';
import { type Column, InteractiveTable, Text, useStyles2 } from '@grafana/ui';
import { Page } from 'app/core/components/Page/Page';

interface FeatureFlagRow {
  name: string;
}

function LabsPage() {
  const styles = useStyles2(getStyles);

  const enabledFlags = useMemo(
    () =>
      Object.entries(config.featureToggles)
        .filter(([, enabled]) => enabled)
        .map(([name]) => ({ name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    []
  );

  const columns: Array<Column<FeatureFlagRow>> = useMemo(
    () => [
      {
        id: 'name',
        header: 'Feature flag',
        cell: ({ cell: { value } }) => <Text>{value}</Text>,
      },
    ],
    []
  );

  return (
    <Page navId="labs">
      <Page.Contents>
        <div className={styles.header}>
          <Text element="h1">
            <Trans i18nKey="labs.page.title">Labs</Trans>
          </Text>
          <Text color="secondary">
            <Trans i18nKey="labs.page.description">
              Experimental features currently enabled in your Grafana instance.
            </Trans>
          </Text>
          <Text color="secondary">
            <Trans i18nKey="labs.page.count" values={{ count: enabledFlags.length }}>
              {'{{count}} feature flags enabled'}
            </Trans>
          </Text>
        </div>
        {enabledFlags.length > 0 ? (
          <InteractiveTable columns={columns} data={enabledFlags} getRowId={(row) => row.name} />
        ) : (
          <Text color="secondary">
            <Trans i18nKey="labs.page.empty">No feature flags are currently enabled.</Trans>
          </Text>
        )}
      </Page.Contents>
    </Page>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  header: css({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1),
    marginBottom: theme.spacing(3),
  }),
});

export default LabsPage;
