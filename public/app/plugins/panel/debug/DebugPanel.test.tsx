import { render, screen } from '@testing-library/react';

import { EventBusSrv, LoadingState, type PanelProps } from '@grafana/data';

import { DebugPanel } from './DebugPanel';
import { DebugMode, type Options } from './panelcfg.gen';

jest.mock('./RenderInfoViewer', () => ({
  RenderInfoViewer: () => <div data-testid="render-info-viewer" />,
}));

jest.mock('./CursorView', () => ({
  CursorView: () => <div data-testid="cursor-view" />,
}));

jest.mock('./EventBusLogger', () => ({
  EventBusLoggerPanel: () => <div data-testid="event-bus-logger" />,
}));

jest.mock('./StateView', () => ({
  StateView: () => <div data-testid="state-view" />,
}));

function renderDebugPanel(mode: DebugMode) {
  const props = {
    data: {
      series: [],
      state: LoadingState.Done,
    },
    options: { mode } satisfies Options,
    eventBus: new EventBusSrv(),
  } as unknown as PanelProps<Options>;

  return render(<DebugPanel {...props} />);
}

describe('DebugPanel', () => {
  it('routes Events mode to EventBusLoggerPanel', () => {
    renderDebugPanel(DebugMode.Events);
    expect(screen.getByTestId('event-bus-logger')).toBeInTheDocument();
  });

  it('routes Cursor mode to CursorView', () => {
    renderDebugPanel(DebugMode.Cursor);
    expect(screen.getByTestId('cursor-view')).toBeInTheDocument();
  });

  it('routes State mode to StateView', () => {
    renderDebugPanel(DebugMode.State);
    expect(screen.getByTestId('state-view')).toBeInTheDocument();
  });

  it('falls through to RenderInfoViewer for Render mode', () => {
    renderDebugPanel(DebugMode.Render);
    expect(screen.getByTestId('render-info-viewer')).toBeInTheDocument();
  });

  it('throws when mode is ThrowError', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderDebugPanel(DebugMode.ThrowError)).toThrow('I failed you and for that i am deeply sorry');

    consoleSpy.mockRestore();
  });
});
