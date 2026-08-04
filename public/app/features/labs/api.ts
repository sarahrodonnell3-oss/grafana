import { getBackendSrv } from '@grafana/runtime';

/** Where the current value of a feature toggle comes from */
export type FeatureToggleSource = 'default' | 'config' | 'labs';

export interface FeatureToggle {
  name: string;
  description?: string;
  stage: string;
  enabled: boolean;
  writeable: boolean;
  source: FeatureToggleSource;
  requiresRestart?: boolean;
  warning?: string;
}

export interface FeatureToggleState {
  /** The current user is allowed to change the toggles */
  allowEditing: boolean;

  /** A toggle that is only read while Grafana starts up has changed */
  restartRequired: boolean;

  toggles: FeatureToggle[];
}

export interface FeatureToggleUpdate {
  name: string;
  enabled: boolean;
}

export function getFeatureToggles(): Promise<FeatureToggleState> {
  return getBackendSrv().get<FeatureToggleState>('/api/labs/feature-toggles');
}

export function updateFeatureToggles(toggles: FeatureToggleUpdate[]): Promise<FeatureToggleState> {
  return getBackendSrv().patch<FeatureToggleState>('/api/labs/feature-toggles', { toggles });
}
