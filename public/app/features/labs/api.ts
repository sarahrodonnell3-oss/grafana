import { getBackendSrv } from '@grafana/runtime';

export interface LabsFeatureToggle {
  name: string;
  description?: string;
  stage?: string;
  /** the value the instance is currently running with */
  enabled: boolean;
  /** the value that comes from the Grafana configuration */
  defaultEnabled: boolean;
  /** true when enabled deviates from defaultEnabled */
  overridden: boolean;
  /** read only toggles can only be changed by restarting Grafana */
  readOnly: boolean;
  readOnlyReason?: string;
}

const baseUrl = '/api/labs/feature-toggles';

export function getFeatureToggles(): Promise<LabsFeatureToggle[]> {
  return getBackendSrv().get<LabsFeatureToggle[]>(baseUrl);
}

export function updateFeatureToggles(toggles: Record<string, boolean>): Promise<LabsFeatureToggle[]> {
  return getBackendSrv().patch<LabsFeatureToggle[]>(baseUrl, { toggles });
}
