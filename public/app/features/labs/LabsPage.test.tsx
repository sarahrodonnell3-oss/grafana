import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestProvider } from 'test/helpers/TestProvider';

import { config, setBackendSrv, type BackendSrv } from '@grafana/runtime';
import { contextSrv } from 'app/core/services/context_srv';

import LabsPage from './LabsPage';

const features = [
  {
    name: 'featureA',
    description: 'Feature A description',
    stage: 'experimental',
    enabled: false,
    requiresRestart: false,
    requiresDevMode: false,
  },
  {
    name: 'featureB',
    description: 'Feature B description',
    stage: 'GA',
    enabled: true,
    requiresRestart: true,
    requiresDevMode: false,
  },
];

const getMock = jest.fn();
const patchMock = jest.fn();

function setup() {
  config.bootData.navTree = [
    {
      text: 'Labs',
      id: 'labs',
      url: '/labs',
      subTitle: 'Experiment with feature toggles',
    },
  ];

  return render(
    <TestProvider>
      <LabsPage />
    </TestProvider>
  );
}

describe('LabsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(contextSrv, 'hasPermission').mockReturnValue(true);
    getMock.mockResolvedValue({ features });
    patchMock.mockResolvedValue({ updated: ['featureA'] });
    setBackendSrv({ get: getMock, patch: patchMock } as unknown as BackendSrv);
  });

  it('lists the feature toggles returned by the API', async () => {
    setup();

    expect(await screen.findByText('featureA')).toBeInTheDocument();
    expect(screen.getByText('featureB')).toBeInTheDocument();
    expect(getMock).toHaveBeenCalledWith('/api/labs/features');
  });

  it('shows the runtime-only alert', async () => {
    setup();
    await screen.findByText('featureA');
    expect(screen.getByText(/applied at runtime/i)).toBeInTheDocument();
  });

  it('sends a PATCH request and prompts for reload when a toggle is flipped', async () => {
    setup();
    await screen.findByText('featureA');

    const toggle = screen.getByLabelText('featureA');
    await userEvent.click(toggle);

    await waitFor(() => {
      expect(patchMock).toHaveBeenCalledWith('/api/labs/features', { featureA: true });
    });
    expect(await screen.findByText(/Reload page/i)).toBeInTheDocument();
  });

  it('reflects the enabled state of each flag in its switch', async () => {
    setup();
    await screen.findByText('featureA');

    expect(screen.getByLabelText('featureA')).not.toBeChecked();
    expect(screen.getByLabelText('featureB')).toBeChecked();
  });

  it('marks restart-required flags with a warning indicator', async () => {
    setup();
    await screen.findByText('featureB');

    expect(screen.getByTestId('labs-restart-warning-featureB')).toBeInTheDocument();
    expect(screen.queryByTestId('labs-restart-warning-featureA')).not.toBeInTheDocument();
  });
});
