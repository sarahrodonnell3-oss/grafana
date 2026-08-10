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
        {enabledFlags.length > 0 ? (
          <>
            <div className={styles.count}>
              <Text color="secondary">
                <Trans
                  i18nKey="labs.page.count"
                  count={enabledFlags.length}
                  tOptions={{
                    defaultValue_one: '{{count}} feature flag enabled',
                    defaultValue_other: '{{count}} feature flags enabled',
                  }}
                >
                  {{ count: enabledFlags.length }} feature flags enabled
                </Trans>
              </Text>
            </div>
            <InteractiveTable columns={columns} data={enabledFlags} getRowId={(row) => row.name} />
          </>
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
  count: css({
    marginBottom: theme.spacing(3),
  }),
});

export default LabsPage;
