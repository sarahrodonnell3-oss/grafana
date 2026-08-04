import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { contextSrv } from 'app/core/services/context_srv';

import { TestProvider } from '../../../test/helpers/TestProvider';

import { LabsPage } from './LabsPage';
import { getFeatureToggles, updateFeatureToggles, type LabsFeatureToggle } from './api';

jest.mock('./api');

const getFeatureTogglesMock = jest.mocked(getFeatureToggles);
const updateFeatureTogglesMock = jest.mocked(updateFeatureToggles);

const toggle = (overrides: Partial<LabsFeatureToggle> = {}): LabsFeatureToggle => ({
  name: 'toggleA',
  description: 'Does something experimental',
  stage: 'experimental',
  enabled: false,
  defaultEnabled: false,
  overridden: false,
  readOnly: false,
  ...overrides,
});

const renderPage = async () => {
  render(
    <TestProvider>
      <LabsPage />
    </TestProvider>
  );
  await screen.findByText('toggleA');
};

beforeEach(() => {
  jest.spyOn(contextSrv, 'hasPermission').mockReturnValue(true);
  getFeatureTogglesMock.mockResolvedValue([
    toggle(),
    toggle({ name: 'toggleB', enabled: true, defaultEnabled: true, description: 'Already on' }),
  ]);
  updateFeatureTogglesMock.mockReset();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('LabsPage', () => {
  it('lists the feature toggles with their current state', async () => {
    await renderPage();

    expect(screen.getByRole('switch', { name: 'toggleA' })).not.toBeChecked();
    expect(screen.getByRole('switch', { name: 'toggleB' })).toBeChecked();
    expect(screen.getByText('1 of 2 toggles enabled, 2 shown')).toBeInTheDocument();
  });

  it('only saves the toggles that were changed', async () => {
    updateFeatureTogglesMock.mockResolvedValue([
      toggle({ enabled: true, overridden: true }),
      toggle({ name: 'toggleB', enabled: true, defaultEnabled: true }),
    ]);

    await renderPage();

    await userEvent.click(screen.getByRole('switch', { name: 'toggleA' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(updateFeatureTogglesMock).toHaveBeenCalledWith({ toggleA: true }));
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
  });

  it('does not save a toggle that was switched back to its original value', async () => {
    await renderPage();

    // The same element is clicked twice on purpose: the row must not be remounted
    // while it is being edited, otherwise the switch loses focus on every click.
    const toggleA = screen.getByRole('switch', { name: 'toggleA' });
    await userEvent.click(toggleA);
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
    expect(toggleA).toBeChecked();

    await userEvent.click(toggleA);

    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
    expect(updateFeatureTogglesMock).not.toHaveBeenCalled();
  });

  it('filters the toggles by name', async () => {
    await renderPage();

    await userEvent.type(screen.getByPlaceholderText('Search feature toggles'), 'toggleB');

    await waitFor(() => expect(screen.queryByText('toggleA')).not.toBeInTheDocument());
    expect(screen.getByText('toggleB')).toBeInTheDocument();
  });

  it('does not allow changes without the write permission', async () => {
    jest.spyOn(contextSrv, 'hasPermission').mockReturnValue(false);

    await renderPage();

    expect(screen.getByRole('switch', { name: 'toggleA' })).toBeDisabled();
    expect(screen.getByText('You can not change feature toggles')).toBeInTheDocument();
  });

  it('does not allow changing toggles that are only read at startup', async () => {
    getFeatureTogglesMock.mockResolvedValue([
      toggle({ readOnly: true, readOnlyReason: 'This toggle is only read when Grafana starts' }),
    ]);

    await renderPage();

    expect(screen.getByRole('switch', { name: 'toggleA' })).toBeDisabled();
    expect(screen.getByText('Read only')).toBeInTheDocument();
  });
});
