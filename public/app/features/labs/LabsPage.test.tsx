import { render, screen } from 'test/test-utils';

import { config } from '@grafana/runtime';

import LabsPage from './LabsPage';

describe('LabsPage', () => {
  let initialFeatureToggles: typeof config.featureToggles;
  let initialPermissions = config.bootData.user.permissions;

  beforeEach(() => {
    initialFeatureToggles = { ...config.featureToggles };
    initialPermissions = config.bootData.user.permissions ? { ...config.bootData.user.permissions } : undefined;
    config.bootData.user.permissions = {
      ...(config.bootData.user.permissions ?? {}),
      'featuremgmt.write': true,
    };
    window.localStorage.clear();
  });

  afterEach(() => {
    config.featureToggles = initialFeatureToggles;
    config.bootData.user.permissions = initialPermissions;
    window.localStorage.clear();
  });

  it('shows only safe runtime feature flags', () => {
    config.featureToggles = {
      dashboardScene: true,
      queryServiceFromUI: true,
    };

    render(<LabsPage />);

    expect(screen.queryByText('dashboardScene')).not.toBeInTheDocument();
    expect(screen.getByText('queryServiceFromUI')).toBeInTheDocument();
    expect(screen.getByText('1 enabled')).toBeInTheDocument();
  });

  it('shows safe runtime feature flags even when they are disabled or absent from boot config', () => {
    config.featureToggles = {
      dashboardScene: true,
    };

    render(<LabsPage />);

    expect(screen.queryByText('dashboardScene')).not.toBeInTheDocument();
    expect(screen.getByText('queryServiceFromUI')).toBeInTheDocument();
    expect(screen.getByText('0 enabled')).toBeInTheDocument();
    expect(screen.getByText('1 visible')).toBeInTheDocument();
  });

  it('loads and persists feature flag overrides to localStorage', async () => {
    config.featureToggles = {
      queryServiceFromUI: true,
    };
    window.localStorage.setItem('grafana.featureToggles', 'queryServiceFromUI=false');

    const { user } = render(<LabsPage />);
    const toggle = screen.getByTestId('labs-feature-toggle-queryServiceFromUI');
    const isEnabled = () =>
      toggle instanceof HTMLInputElement ? toggle.checked : toggle.getAttribute('aria-checked') === 'true';

    expect(isEnabled()).toBe(false);

    await user.click(toggle);

    expect(isEnabled()).toBe(true);
    expect(window.localStorage.getItem('grafana.featureToggles')).toContain('queryServiceFromUI=true');
  });

  it('preserves unrelated localStorage feature toggle overrides when toggling', async () => {
    config.featureToggles = {
      queryServiceFromUI: false,
    };
    window.localStorage.setItem('grafana.featureToggles', 'dashboardScene=true,queryServiceFromUI=false');

    const { user } = render(<LabsPage />);
    const toggle = screen.getByTestId('labs-feature-toggle-queryServiceFromUI');

    await user.click(toggle);

    const storedValue = window.localStorage.getItem('grafana.featureToggles') ?? '';
    expect(storedValue).toContain('queryServiceFromUI=true');
    expect(storedValue).toContain('dashboardScene=true');
  });

  it('ignores unknown feature flags from localStorage overrides', () => {
    config.featureToggles = {
      queryServiceFromUI: true,
    };
    window.localStorage.setItem('grafana.featureToggles', 'unknownFeature=false,queryServiceFromUI=true');

    render(<LabsPage />);

    expect(screen.queryByText('unknownFeature')).not.toBeInTheDocument();
    expect(screen.getByText('queryServiceFromUI')).toBeInTheDocument();
  });

  it('renders read-only mode when user lacks featuremgmt.write', async () => {
    config.featureToggles = {
      queryServiceFromUI: true,
    };
    config.bootData.user.permissions = {
      ...(config.bootData.user.permissions ?? {}),
      'featuremgmt.write': false,
    };
    window.localStorage.setItem('grafana.featureToggles', 'queryServiceFromUI=true');

    const { user } = render(<LabsPage />);

    expect(screen.getByText('Read-only access')).toBeInTheDocument();
    const toggle = screen.getByTestId('labs-feature-toggle-queryServiceFromUI');
    expect(toggle).toHaveAttribute('disabled');

    await user.click(toggle);

    expect(window.localStorage.getItem('grafana.featureToggles')).toContain('queryServiceFromUI=true');
  });
});
