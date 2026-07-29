import { render, screen, waitFor } from '@testing-library/react';
import selectEvent from 'react-select-event';

import { LiveChannelScope, type StandardEditorContext, type StandardEditorsRegistryItem } from '@grafana/data';
import { getManagedChannelInfo } from 'app/features/live/info';
import {
  discoveryResources,
  getAPIGroupDiscoveryList,
} from 'app/features/apiserver/discovery';

import { LiveChannelEditor } from './LiveChannelEditor';
import { type LivePanelOptions } from './types';

jest.mock('app/features/live/info', () => ({
  getManagedChannelInfo: jest.fn(),
}));

jest.mock('app/features/apiserver/discovery', () => ({
  getAPIGroupDiscoveryList: jest.fn(),
  discoveryResources: jest.fn(),
}));

const mockGetManagedChannelInfo = getManagedChannelInfo as jest.Mock;
const mockGetAPIGroupDiscoveryList = getAPIGroupDiscoveryList as jest.Mock;
const mockDiscoveryResources = discoveryResources as jest.Mock;

const mockContext: StandardEditorContext<LivePanelOptions> = {
  data: [],
  options: {},
};

const mockItem = {} as StandardEditorsRegistryItem<unknown>;

const managedChannels = {
  channels: [
    { value: 'plugin/testdata/alpha', label: 'plugin/testdata/alpha [1 msg/min]' },
    { value: 'plugin/testdata/beta', label: 'plugin/testdata/beta [2 msg/min]' },
    { value: 'ds/other/other-path', label: 'ds/other/other-path [0 msg/min]' },
  ],
  channelFields: {},
};

describe('LiveChannelEditor', () => {
  beforeEach(() => {
    mockGetManagedChannelInfo.mockResolvedValue(managedChannels);
    mockGetAPIGroupDiscoveryList.mockResolvedValue([]);
    mockDiscoveryResources.mockReturnValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('clears stream and path when scope changes', async () => {
    const onChange = jest.fn();
    render(
      <LiveChannelEditor
        value={{ scope: LiveChannelScope.Plugin, stream: 'testdata', path: 'alpha' }}
        onChange={onChange}
        context={mockContext}
        item={mockItem}
      />
    );

    await waitFor(() => expect(mockGetManagedChannelInfo).toHaveBeenCalled());

    const selects = screen.getAllByRole('combobox');
    await selectEvent.select(selects[0], 'Stream', { container: document.body });

    expect(onChange).toHaveBeenCalledWith({
      scope: LiveChannelScope.Stream,
      stream: undefined,
      path: undefined,
    });
  });

  it('derives namespace and path options from managed channels for the selected scope', async () => {
    render(
      <LiveChannelEditor
        value={{ scope: LiveChannelScope.Plugin, stream: 'testdata', path: 'alpha' }}
        onChange={jest.fn()}
        context={mockContext}
        item={mockItem}
      />
    );

    await waitFor(() => expect(mockGetManagedChannelInfo).toHaveBeenCalled());

    expect(await screen.findByText('testdata')).toBeInTheDocument();
    expect(screen.getByText('plugin/testdata/alpha [1 msg/min]')).toBeInTheDocument();

    const namespaceSelect = screen.getAllByRole('combobox')[1];
    await selectEvent.openMenu(namespaceSelect, { container: document.body });
    expect(screen.queryByText('other')).not.toBeInTheDocument();
  });

  it('keeps a custom path value when it is not in the fetched path options', async () => {
    render(
      <LiveChannelEditor
        value={{ scope: LiveChannelScope.Plugin, stream: 'testdata', path: 'custom-path' }}
        onChange={jest.fn()}
        context={mockContext}
        item={mockItem}
      />
    );

    await waitFor(() => expect(mockGetManagedChannelInfo).toHaveBeenCalled());

    expect(await screen.findByText('custom-path')).toBeInTheDocument();
  });

  it('shows the watchable resource combobox for watch scope', async () => {
    render(
      <LiveChannelEditor
        value={{ scope: LiveChannelScope.Watch }}
        onChange={jest.fn()}
        context={mockContext}
        item={mockItem}
      />
    );

    expect(await screen.findByPlaceholderText('Select watchable resource')).toBeInTheDocument();
  });
});
