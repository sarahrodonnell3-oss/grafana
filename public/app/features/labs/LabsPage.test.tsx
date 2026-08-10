import { render, screen } from 'test/test-utils';

import { config } from '@grafana/runtime';

import LabsPage from './LabsPage';

describe('LabsPage', () => {
  const originalFeatureToggles = config.featureToggles;

  afterEach(() => {
    config.featureToggles = originalFeatureToggles;
  });

  it('renders enabled feature flags', () => {
    config.featureToggles = {
      ...originalFeatureToggles,
      alertingTriage: true,
      exploreMetrics: false,
      kubernetesDashboards: true,
    };

    render(<LabsPage />);

    expect(screen.getByText('Labs')).toBeInTheDocument();
    expect(screen.getByText('alertingTriage')).toBeInTheDocument();
    expect(screen.getByText('kubernetesDashboards')).toBeInTheDocument();
    expect(screen.queryByText('exploreMetrics')).not.toBeInTheDocument();
  });

  it('shows empty state when no feature flags are enabled', () => {
    config.featureToggles = Object.fromEntries(
      Object.keys(originalFeatureToggles).map((key) => [key, false])
    ) as typeof config.featureToggles;

    render(<LabsPage />);

    expect(screen.getByText('No feature flags are currently enabled.')).toBeInTheDocument();
  });
});
