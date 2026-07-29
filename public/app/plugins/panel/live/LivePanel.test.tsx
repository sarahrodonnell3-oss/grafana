import { act, render, screen, waitFor } from '@testing-library/react';

import {
  LiveChannelConnectionState,
  LiveChannelEventType,
  LiveChannelScope,
  LoadingState,
  type PanelProps,
} from '@grafana/data';
import { getGrafanaLiveSrv } from '@grafana/runtime';

import { LivePanel } from './LivePanel';
import { type LivePanelOptions, MessageDisplayMode, MessagePublishMode } from './types';

jest.mock('@grafana/runtime', () => ({
  ...jest.requireActual('@grafana/runtime'),
  getGrafanaLiveSrv: jest.fn(),
}));

jest.mock('../table/TablePanel', () => ({
  TablePanel: () => <div data-testid="table-panel" />,
}));

const mockGetGrafanaLiveSrv = getGrafanaLiveSrv as jest.Mock;

const validChannel = {
  scope: LiveChannelScope.DataSource,
  stream: 'test-ds',
  path: 'metrics',
};

function panelProps(overrides: Partial<PanelProps<LivePanelOptions>> = {}): PanelProps<LivePanelOptions> {
  return {
    id: 1,
    width: 400,
    height: 300,
    data: { series: [], state: LoadingState.Done },
    options: {
      channel: validChannel,
      display: MessageDisplayMode.Raw,
      publish: MessagePublishMode.None,
    },
    replaceVariables: (v: string) => v,
    ...overrides,
  } as unknown as PanelProps<LivePanelOptions>;
}

describe('LivePanel', () => {
  let unsubscribe: jest.Mock;
  let subscribe: jest.Mock;
  let getStream: jest.Mock;
  let capturedObserver: { next?: (event: unknown) => void };
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    unsubscribe = jest.fn();
    subscribe = jest.fn((observer) => {
      capturedObserver = observer;
      return { unsubscribe };
    });
    getStream = jest.fn(() => ({ subscribe }));
    mockGetGrafanaLiveSrv.mockReturnValue({ getStream });
    capturedObserver = {};
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    jest.clearAllMocks();
  });

  it('shows feature flag alert when Grafana Live is unavailable', () => {
    mockGetGrafanaLiveSrv.mockReturnValue(undefined);

    render(<LivePanel {...panelProps()} />);

    expect(screen.getByText(/Grafana live requires a feature flag to run/i)).toBeInTheDocument();
  });

  it('prompts to pick a channel when the address is invalid', () => {
    render(<LivePanel {...panelProps({ options: { channel: { scope: LiveChannelScope.DataSource } } })} />);

    expect(screen.getByText(/Use the panel editor to pick a channel/i)).toBeInTheDocument();
  });

  it('subscribes on mount and unsubscribes on unmount', async () => {
    const { unmount } = render(<LivePanel {...panelProps()} />);

    await waitFor(() => {
      expect(getStream).toHaveBeenCalledWith(validChannel);
      expect(subscribe).toHaveBeenCalled();
    });

    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('shows error when getStream throws', async () => {
    const loadChannelSpy = jest.spyOn(LivePanel.prototype, 'loadChannel').mockImplementation(function (this: LivePanel) {
      this.setState({ addr: validChannel, error: 'stream failed' });
    });

    render(<LivePanel {...panelProps()} />);

    await screen.findByText('Error');
    expect(screen.getByText('"stream failed"')).toBeInTheDocument();

    loadChannelSpy.mockRestore();
  });

  it('renders raw status JSON when display mode is None', async () => {
    const status = {
      type: LiveChannelEventType.Status,
      id: 'ds/test-ds/metrics',
      timestamp: 1_700_000_000_000,
      state: LiveChannelConnectionState.Pending,
    };

    render(
      <LivePanel
        {...panelProps({
          options: {
            channel: validChannel,
            display: MessageDisplayMode.None,
            publish: MessagePublishMode.None,
          },
        })}
      />
    );

    await waitFor(() => expect(subscribe).toHaveBeenCalled());

    act(() => {
      capturedObserver.next?.(status);
    });

    await waitFor(() => {
      expect(screen.getByText(JSON.stringify(status))).toBeInTheDocument();
    });
  });
});
