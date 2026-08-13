import { LogLevel } from '@grafana/faro-web-sdk';

import { type TracedError } from './TracedError';
import { logStructured } from './logging';

const mockPushLog = jest.fn();
const mockPushError = jest.fn();

jest.mock('@grafana/faro-web-sdk', () => ({
  ...jest.requireActual('@grafana/faro-web-sdk'),
  faro: {
    api: {
      pushLog: (...args: unknown[]) => mockPushLog(...args),
      pushError: (...args: unknown[]) => mockPushError(...args),
    },
  },
}));

jest.mock('../config', () => ({
  config: {
    grafanaJavascriptAgent: { enabled: true },
  },
}));

describe('logStructured', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('records additional values as structured context', () => {
    logStructured('features.example', 'warn', 'Request failed', { status: 503 }, BigInt(2));

    expect(mockPushLog).toHaveBeenCalledWith(['Request failed'], {
      level: LogLevel.WARN,
      context: {
        source: 'features.example',
        argument1: '{"status":503}',
        argument2: '2',
      },
    });
  });

  it('includes an Error in context at non-error levels', () => {
    const cause = new Error('cleanup failed');

    logStructured('features.example', 'warn', 'Failed to clean up old expanded folders', cause, { retry: true });

    expect(mockPushLog).toHaveBeenCalledWith(['Failed to clean up old expanded folders'], {
      level: LogLevel.WARN,
      context: {
        source: 'features.example',
        argument1: 'Error: cleanup failed',
        argument2: '{"retry":true}',
      },
    });
    expect(mockPushError).not.toHaveBeenCalled();
  });

  it('preserves the original stack when recording an error', () => {
    const cause = new Error('connection refused');

    logStructured('features.example', 'error', 'Unable to load data', cause, { retry: true });

    expect(mockPushError).toHaveBeenCalledWith(
      expect.objectContaining<Partial<TracedError>>({
        message: 'Unable to load data',
        cause,
        stack: cause.stack,
      }),
      {
        context: {
          source: 'features.example',
          argument2: '{"retry":true}',
        },
      }
    );
  });

  it('uses an error as the message when no description is provided', () => {
    const error = new Error('bad response');

    logStructured('features.example', 'error', error);

    expect(mockPushError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Error: bad response',
        cause: error,
      }),
      { context: { source: 'features.example' } }
    );
  });
});
