import { act, render, screen, waitFor } from '@testing-library/react';
import { Subscription } from 'rxjs';

import { DataHoverEvent, EventBusSrv } from '@grafana/data';

import { CursorView } from './CursorView';

jest.mock('app/features/visualization/data-hover/DataHoverView', () => ({
  DataHoverView: () => <div data-testid="data-hover-view" />,
}));

jest.mock('@grafana/ui', () => ({
  ...jest.requireActual('@grafana/ui'),
  CustomScrollbar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('CursorView', () => {
  it('shows no events message before any event is published', () => {
    const eventBus = new EventBusSrv();
    render(<CursorView eventBus={eventBus} />);

    expect(screen.getByText('No events yet')).toBeInTheDocument();
  });

  it('renders event type and origin path after DataHoverEvent', async () => {
    const eventBus = new EventBusSrv();
    const scopedBus = eventBus.newScopedBus('debug-panel');

    render(<CursorView eventBus={eventBus} />);

    act(() => {
      scopedBus.publish(new DataHoverEvent({ point: { time: 42 } }));
    });

    await waitFor(() => {
      expect(screen.getByText('event.type: data-hover')).toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: /event\.origin:/ })).toHaveTextContent('debug-panel');
  });

  it('unsubscribes from the event bus on unmount', () => {
    const unsubscribeSpy = jest.spyOn(Subscription.prototype, 'unsubscribe');
    const eventBus = new EventBusSrv();

    const { unmount } = render(<CursorView eventBus={eventBus} />);

    expect(unsubscribeSpy).not.toHaveBeenCalled();
    unmount();
    expect(unsubscribeSpy).toHaveBeenCalled();

    unsubscribeSpy.mockRestore();
  });
});
