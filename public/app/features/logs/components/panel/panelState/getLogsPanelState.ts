import { urlUtil } from '@grafana/data';
import { getLogger } from '@grafana/runtime/unstable';

interface LogsPermalinkUrlState {
  logs?: {
    id?: string;
  };
}

export function getLogsPanelState(): LogsPermalinkUrlState | undefined {
  const urlParams = urlUtil.getUrlSearchParams();
  const panelStateEncoded = urlParams?.panelState;
  if (
    panelStateEncoded &&
    Array.isArray(panelStateEncoded) &&
    panelStateEncoded?.length > 0 &&
    typeof panelStateEncoded[0] === 'string'
  ) {
    try {
      return JSON.parse(panelStateEncoded[0]);
    } catch (e) {
      getLogger('features.logs').logError(e instanceof Error ? e : new Error('error parsing logsPanelState'));
    }
  }

  return undefined;
}
