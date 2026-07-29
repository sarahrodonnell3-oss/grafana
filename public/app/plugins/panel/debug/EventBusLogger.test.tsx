import { act, render, screen, waitFor } from '@testing-library/react';

import { DataHoverEvent, EventBusSrv } from '@grafana/data';

import { EventBusLoggerPanel } from './EventBusLogger';

jest.mock('@grafana/ui', () => ({
  ...jest.requireActual('@grafana/ui'),
  CustomScrollbar: ({ children }: { children: React.ReactNode }) => <div data-testid="scroll">{children}</div>,
}));

function publishHover(eventBus: EventBusSrv, scopedPath: string, x: number, y: number) {
  const scoped = eventBus.newScopedBus(scopedPath);
  const event = new DataHoverEvent({ point: { time: x } });
  Object.assign(event.payload, { x, y });
  scoped.publish(event);
}

describe('EventBusLoggerPanel', () => {
  it('keeps only the last 40 events, newest first', async () => {
    const eventBus = new EventBusSrv();
    render(<EventBusLoggerPanel eventBus={eventBus} />);

    act(() => {
      for (let i = 0; i < 45; i++) {
        publishHover(eventBus, `path-${i}`, i, i + 1000);
      }
    });

    await waitFor(() => {
      const rows = screen.getByTestId('scroll').querySelectorAll('div');
      expect(rows.length).toBe(40);
    });

    expect(screen.getByText(/"path-44".*data-hover.*X:44.*Y:1044/)).toBeInTheDocument();
    expect(screen.queryByText(/"path-0"/)).not.toBeInTheDocument();
    expect(screen.queryByText(/"path-4"/)).not.toBeInTheDocument();
    expect(screen.getByText(/"path-5"/)).toBeInTheDocument();
  });
});
