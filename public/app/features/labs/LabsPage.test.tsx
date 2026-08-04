import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestProvider } from 'test/helpers/TestProvider';

import { LabsPage } from './LabsPage';
import { type FeatureToggleState } from './api';

const getFeatureToggles = jest.fn();
const updateFeatureToggles = jest.fn();

jest.mock('./api', () => ({
  getFeatureToggles: () => getFeatureToggles(),
  updateFeatureToggles: (toggles: unknown) => updateFeatureToggles(toggles),
}));

const state: FeatureToggleState = {
  allowEditing: true,
  restartRequired: false,
  toggles: [
    {
      name: 'alphaFeature',
      description: 'An experimental feature',
      stage: 'experimental',
      enabled: false,
      writeable: true,
      source: 'default',
    },
    {
      name: 'betaFeature',
      description: 'A feature in preview',
      stage: 'preview',
      enabled: true,
      writeable: true,
      source: 'config',
    },
  ],
};

const renderPage = () =>
  render(
    <TestProvider>
      <LabsPage />
    </TestProvider>
  );

beforeEach(() => {
  jest.clearAllMocks();
  getFeatureToggles.mockResolvedValue(state);
});

describe('LabsPage', () => {
  it('lists the feature toggles of the instance', async () => {
    renderPage();

    expect(await screen.findByText('alphaFeature')).toBeInTheDocument();
    expect(screen.getByText('betaFeature')).toBeInTheDocument();
    expect(screen.getByText('An experimental feature')).toBeInTheDocument();
    expect(screen.getByText('1 of 2 enabled')).toBeInTheDocument();
  });

  it('filters the toggles by name', async () => {
    renderPage();

    await userEvent.type(await screen.findByPlaceholderText('Search feature toggles'), 'beta');

    expect(screen.getByText('betaFeature')).toBeInTheDocument();
    expect(screen.queryByText('alphaFeature')).not.toBeInTheDocument();
  });

  it('filters the toggles by state', async () => {
    renderPage();

    await userEvent.click(await screen.findByLabelText('Enabled'));

    expect(screen.getByText('betaFeature')).toBeInTheDocument();
    expect(screen.queryByText('alphaFeature')).not.toBeInTheDocument();
  });

  it('enables a toggle and asks for a restart when needed', async () => {
    updateFeatureToggles.mockResolvedValue({
      ...state,
      restartRequired: true,
      toggles: [{ ...state.toggles[0], enabled: true, source: 'labs' }, state.toggles[1]],
    });

    renderPage();

    await userEvent.click(await screen.findByLabelText('Toggle alphaFeature'));

    expect(updateFeatureToggles).toHaveBeenCalledWith([{ name: 'alphaFeature', enabled: true }]);
    expect(await screen.findByText('Restart required')).toBeInTheDocument();
    expect(screen.getByLabelText('Toggle alphaFeature')).toBeChecked();
  });

  it('puts the switch back when the update fails', async () => {
    updateFeatureToggles.mockRejectedValue(new Error('nope'));

    renderPage();

    await userEvent.click(await screen.findByLabelText('Toggle alphaFeature'));

    await waitFor(() => {
      expect(screen.getByLabelText('Toggle alphaFeature')).not.toBeChecked();
    });
  });

  it('does not allow editing without the write permission', async () => {
    getFeatureToggles.mockResolvedValue({ ...state, allowEditing: false });

    renderPage();

    expect(await screen.findByLabelText('Toggle alphaFeature')).toBeDisabled();
    expect(
      screen.getByText('You need the feature toggle write permission to change these values.')
    ).toBeInTheDocument();
  });

  it('shows an error when the toggles can not be loaded', async () => {
    getFeatureToggles.mockRejectedValue(new Error('nope'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Failed to load the feature toggles of this instance')).toBeInTheDocument();
    });
  });
});
