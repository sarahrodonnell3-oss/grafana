import { fireEvent, render, screen } from '@testing-library/react';

import { CoreApp, LoadingState, type PanelProps } from '@grafana/data';
import { checkFields, FlameGraph, getMessageCheckFieldsResult } from '@grafana/flamegraph';
import { config, reportInteraction } from '@grafana/runtime';

import { FlameGraphPanel } from './FlameGraphPanel';
import { type Options } from './types';

jest.mock('@grafana/flamegraph', () => ({
  FlameGraph: jest.fn(
    (props: {
      stickyHeader?: boolean;
      showFlameGraphOnly?: boolean;
      onTableSymbolClick?: () => void;
      onViewSelected?: (view: string) => void;
    }) => (
      <div data-testid="flame-graph">
        <span data-testid="sticky-header">{String(props.stickyHeader)}</span>
        <span data-testid="show-flamegraph-only">{String(props.showFlameGraphOnly)}</span>
        <button type="button" data-testid="table-symbol-click" onClick={() => props.onTableSymbolClick?.()}>
          table
        </button>
        <button
          type="button"
          data-testid="view-selected"
          onClick={() => props.onViewSelected?.('cpu-profile')}
        >
          view
        </button>
      </div>
    )
  ),
  checkFields: jest.fn(),
  getMessageCheckFieldsResult: jest.fn((wrong: string) => `check-fields: ${wrong}`),
}));

jest.mock('@grafana/runtime', () => ({
  ...jest.requireActual('@grafana/runtime'),
  PanelDataErrorView: (props: { message?: string }) => <div data-testid="error-view">{props.message}</div>,
  reportInteraction: jest.fn(),
}));

const mockCheckFields = checkFields as jest.Mock;
const mockGetMessage = getMessageCheckFieldsResult as jest.Mock;
const mockReportInteraction = reportInteraction as jest.Mock;
const mockFlameGraph = FlameGraph as jest.Mock;

function panelProps(overrides?: Partial<PanelProps<Options>>): PanelProps<Options> {
  return {
    id: 1,
    data: {
      series: [{ fields: [], length: 0 }],
      state: LoadingState.Done,
    },
    ...overrides,
  } as unknown as PanelProps<Options>;
}

describe('FlameGraphPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckFields.mockReturnValue(undefined);
  });

  it('renders PanelDataErrorView when checkFields fails', () => {
    mockCheckFields.mockReturnValue('wrong-shape');
    mockGetMessage.mockReturnValue('Need profile fields');

    render(<FlameGraphPanel {...panelProps()} />);

    expect(screen.getByTestId('error-view')).toHaveTextContent('Need profile fields');
    expect(mockGetMessage).toHaveBeenCalledWith('wrong-shape');
    expect(mockFlameGraph).not.toHaveBeenCalled();
  });

  it('renders FlameGraph with stickyHeader false and showFlameGraphOnly default false', () => {
    render(<FlameGraphPanel {...panelProps()} />);

    expect(screen.getByTestId('flame-graph')).toBeInTheDocument();
    expect(screen.getByTestId('sticky-header')).toHaveTextContent('false');
    expect(screen.getByTestId('show-flamegraph-only')).toHaveTextContent('false');

    expect(mockFlameGraph).toHaveBeenCalledWith(
      expect.objectContaining({
        stickyHeader: false,
        showFlameGraphOnly: false,
      }),
      expect.anything()
    );
  });

  it('reports table_item_selected when onTableSymbolClick fires', () => {
    render(<FlameGraphPanel {...panelProps()} />);

    fireEvent.click(screen.getByTestId('table-symbol-click'));

    expect(mockReportInteraction).toHaveBeenCalledWith('grafana_flamegraph_table_item_selected', {
      app: CoreApp.Unknown,
      grafana_version: config.buildInfo.version,
    });
  });

  it('reports view_selected with the selected view', () => {
    render(<FlameGraphPanel {...panelProps()} />);

    fireEvent.click(screen.getByTestId('view-selected'));

    expect(mockReportInteraction).toHaveBeenCalledWith('grafana_flamegraph_view_selected', {
      app: CoreApp.Unknown,
      grafana_version: config.buildInfo.version,
      view: 'cpu-profile',
    });
  });
});
