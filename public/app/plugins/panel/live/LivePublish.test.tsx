import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { LiveChannelScope, type LiveChannelAddress } from '@grafana/data';
import { getBackendSrv, getGrafanaLiveSrv } from '@grafana/runtime';

import { LivePublish } from './LivePublish';
import { MessagePublishMode } from './types';

jest.mock('@grafana/runtime', () => ({
  ...jest.requireActual('@grafana/runtime'),
  getBackendSrv: jest.fn(),
  getGrafanaLiveSrv: jest.fn(),
}));

jest.mock('@grafana/ui', () => {
  const actual = jest.requireActual('@grafana/ui');
  return {
    ...actual,
    CodeEditor: ({
      value,
      onBlur,
      onSave,
    }: {
      value: string;
      onBlur: (v: string) => void;
      onSave: (v: string) => void;
    }) => (
      <textarea
        data-testid="code-editor"
        value={value}
        onChange={(e) => {
          onBlur(e.target.value);
          onSave(e.target.value);
        }}
      />
    ),
  };
});

const mockGetBackendSrv = getBackendSrv as jest.Mock;
const mockGetGrafanaLiveSrv = getGrafanaLiveSrv as jest.Mock;

const streamAddr: LiveChannelAddress = {
  scope: LiveChannelScope.Stream,
  stream: 'influx-stream',
  path: 'write',
};

const dsAddr: LiveChannelAddress = {
  scope: LiveChannelScope.DataSource,
  stream: 'prom',
  path: 'metrics',
};

describe('LivePublish', () => {
  const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

  beforeEach(() => {
    mockGetBackendSrv.mockReturnValue({ post: jest.fn().mockResolvedValue({}) });
    mockGetGrafanaLiveSrv.mockReturnValue({ publish: jest.fn().mockResolvedValue({}) });
    alertSpy.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('stringifies JSON body and uses empty object placeholder when body is empty', () => {
    render(
      <LivePublish height={200} mode={MessagePublishMode.JSON} body={{ foo: 1 }} addr={dsAddr} onSave={jest.fn()} />
    );

    expect(screen.getByTestId('code-editor')).toHaveValue(
      JSON.stringify({ foo: 1 }, null, 2)
    );

    render(<LivePublish height={200} mode={MessagePublishMode.JSON} addr={dsAddr} onSave={jest.fn()} />);

    expect(screen.getAllByTestId('code-editor').pop()).toHaveValue('{ }');
  });

  it('parses JSON on save in JSON mode and passes raw text in influx mode', async () => {
    const onSaveJson = jest.fn();
    render(
      <LivePublish height={200} mode={MessagePublishMode.JSON} body={{ a: 1 }} addr={dsAddr} onSave={onSaveJson} />
    );

    fireEvent.change(screen.getByTestId('code-editor'), { target: { value: '{"b":2}' } });
    await waitFor(() => expect(onSaveJson).toHaveBeenCalledWith({ b: 2 }));

    const onSaveInflux = jest.fn();
    render(
      <LivePublish
        height={200}
        mode={MessagePublishMode.Influx}
        body="cpu,host=a value=1"
        addr={streamAddr}
        onSave={onSaveInflux}
      />
    );

    fireEvent.change(screen.getAllByTestId('code-editor').pop()!, {
      target: { value: 'cpu,host=b value=2' },
    });
    await waitFor(() => expect(onSaveInflux).toHaveBeenCalledWith('cpu,host=b value=2'));
  });

  it('posts to the live push API for influx mode with stream scope', async () => {
    const post = jest.fn().mockResolvedValue({});
    mockGetBackendSrv.mockReturnValue({ post });
    const user = userEvent.setup();

    render(
      <LivePublish
        height={200}
        mode={MessagePublishMode.Influx}
        body="line protocol"
        addr={streamAddr}
        onSave={jest.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /Publish/i }));

    expect(post).toHaveBeenCalledWith('api/live/push/influx-stream', 'line protocol');
  });

  it('alerts and does not post when influx mode has non-stream scope', async () => {
    const post = jest.fn();
    mockGetBackendSrv.mockReturnValue({ post });
    const user = userEvent.setup();

    render(
      <LivePublish
        height={200}
        mode={MessagePublishMode.Influx}
        body="line"
        addr={dsAddr}
        onSave={jest.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /Publish/i }));

    expect(alertSpy).toHaveBeenCalledWith('expected stream scope!');
    expect(post).not.toHaveBeenCalled();
  });

  it('alerts instead of publishing when the address is invalid', async () => {
    const publish = jest.fn();
    mockGetGrafanaLiveSrv.mockReturnValue({ publish });
    const user = userEvent.setup();

    render(
      <LivePublish
        height={200}
        mode={MessagePublishMode.JSON}
        body="{}"
        addr={{ scope: LiveChannelScope.DataSource, stream: 'only-stream' }}
        onSave={jest.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /Publish/i }));

    expect(alertSpy).toHaveBeenCalledWith('invalid address');
    expect(publish).not.toHaveBeenCalled();
  });
});
