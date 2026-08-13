import { logStructured as structuredLog } from '@grafana/runtime';
import { QueryVariable, type SceneVariable } from '@grafana/scenes';

import { OptionsPaneItemDescriptor } from '../../../../../dashboard/components/PanelEditor/OptionsPaneItemDescriptor';

import { PaneItem } from './PaneItem';

export function getQueryVariableOptions(variable: SceneVariable): OptionsPaneItemDescriptor[] {
  if (!(variable instanceof QueryVariable)) {
    structuredLog(
      'grafana/frontend.features.dashboard-scene.settings.variables.editors.QueryVariableEditor.getQueryVariableOptions',
      'warn',
      'getQueryVariableOptions: variable is not a QueryVariable'
    );
    return [];
  }

  return [
    new OptionsPaneItemDescriptor({
      id: `variable-${variable.state.name}-value`,
      render: () => <PaneItem variable={variable} />,
    }),
  ];
}
