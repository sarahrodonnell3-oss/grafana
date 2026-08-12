import { getLogger } from '@grafana/runtime/unstable';
import { QueryVariable, type SceneVariable } from '@grafana/scenes';

import { OptionsPaneItemDescriptor } from '../../../../../dashboard/components/PanelEditor/OptionsPaneItemDescriptor';

import { PaneItem } from './PaneItem';

export function getQueryVariableOptions(variable: SceneVariable): OptionsPaneItemDescriptor[] {
  if (!(variable instanceof QueryVariable)) {
    getLogger('features.dashboard-scene').logWarning('getQueryVariableOptions: variable is not a QueryVariable');
    return [];
  }

  return [
    new OptionsPaneItemDescriptor({
      id: `variable-${variable.state.name}-value`,
      render: () => <PaneItem variable={variable} />,
    }),
  ];
}
