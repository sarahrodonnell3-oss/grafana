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
      featureHighlights: false,
      awsAsyncQueryCaching: true,
    };

    render(<LabsPage />);

    expect(screen.getByText('2 feature flags enabled')).toBeInTheDocument();
    expect(screen.getByText('alertingTriage')).toBeInTheDocument();
    expect(screen.getByText('awsAsyncQueryCaching')).toBeInTheDocument();
    expect(screen.queryByText('featureHighlights')).not.toBeInTheDocument();
  });

  it('shows singular count when one feature flag is enabled', () => {
    config.featureToggles = Object.fromEntries(
      Object.keys(originalFeatureToggles).map((key) => [key, false])
    ) as typeof config.featureToggles;
    config.featureToggles = {
      ...config.featureToggles,
      alertingTriage: true,
    };

    render(<LabsPage />);

    expect(screen.getByText('1 feature flag enabled')).toBeInTheDocument();
    expect(screen.getByText('alertingTriage')).toBeInTheDocument();
  });

  it('shows empty state when no feature flags are enabled', () => {
    config.featureToggles = Object.fromEntries(
      Object.keys(originalFeatureToggles).map((key) => [key, false])
    ) as typeof config.featureToggles;

    render(<LabsPage />);

    expect(screen.getByText('No feature flags are currently enabled.')).toBeInTheDocument();
    expect(screen.queryByText(/feature flags? enabled/)).not.toBeInTheDocument();
  });
});
