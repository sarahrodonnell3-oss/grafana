import { mockLogger } from '@grafana/test-utils/unstable';

import { patchFetchForLegacyAPIMode } from './legacyAPIHandling';

describe('patchFetchForLegacyAPIMode', () => {
  const originalFetch = window.fetch;
  const originalMode = window.__grafanaLegacyAPIMode;

  let fetchMock: jest.Mock;
  let logger: ReturnType<typeof mockLogger>;

  beforeEach(() => {
    fetchMock = jest.fn().mockResolvedValue(new Response('ok'));
    window.fetch = fetchMock;
    logger = mockLogger('core.legacy-api');
  });

  afterEach(() => {
    window.fetch = originalFetch;
    window.__grafanaLegacyAPIMode = originalMode;
    jest.restoreAllMocks();
  });

  describe('when the flag is not enabled', () => {
    it.each([undefined, 'off', 'something-invalid'])('leaves fetch untouched for mode %p', (mode) => {
      window.__grafanaLegacyAPIMode = mode;

      patchFetchForLegacyAPIMode();

      expect(window.fetch).toBe(fetchMock);
    });

    it('does not intercept /api/ calls', async () => {
      window.__grafanaLegacyAPIMode = 'off';

      patchFetchForLegacyAPIMode();
      await window.fetch('/api/dashboards');

      expect(fetchMock).toHaveBeenCalledWith('/api/dashboards');
    });
  });

  describe('log mode', () => {
    beforeEach(() => {
      window.__grafanaLegacyAPIMode = 'log';
    });

    it('replaces window.fetch', () => {
      patchFetchForLegacyAPIMode();
      expect(window.fetch).not.toBe(fetchMock);
    });

    it('warns but still forwards same-origin /api/ calls', async () => {
      patchFetchForLegacyAPIMode();

      await window.fetch('/api/dashboards');

      expect(logger.logWarning).toHaveBeenCalledWith('Request made to legacy api', {
        pathname: '/api/dashboards',
      });
      expect(fetchMock).toHaveBeenCalledWith('/api/dashboards', undefined);
    });

    it('does not warn on non-/api/ calls', async () => {
      patchFetchForLegacyAPIMode();

      await window.fetch('/apis/preferences.grafana.app/v1');

      expect(logger.logWarning).not.toHaveBeenCalled();
      expect(fetchMock).toHaveBeenCalled();
    });
  });

  describe('block mode', () => {
    beforeEach(() => {
      window.__grafanaLegacyAPIMode = 'block';
    });

    it('rejects same-origin /api/ calls without forwarding them', async () => {
      patchFetchForLegacyAPIMode();
      await expect(window.fetch('/api/dashboards')).rejects.toThrow('/api/dashboards');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('forwards non-/api/ calls', async () => {
      patchFetchForLegacyAPIMode();
      await window.fetch('/apis/preferences.grafana.app/v1');

      expect(fetchMock).toHaveBeenCalledWith('/apis/preferences.grafana.app/v1', undefined);
    });

    it('forwards cross-origin /api/ calls', async () => {
      patchFetchForLegacyAPIMode();
      await window.fetch('https://example.com/api/dashboards');

      expect(fetchMock).toHaveBeenCalled();
    });

    it('handles Request objects', async () => {
      patchFetchForLegacyAPIMode();
      await expect(window.fetch(new Request('http://localhost/api/dashboards'))).rejects.toThrow('/api/dashboards');
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
