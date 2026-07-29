import { createDataFrame, getPanelDataSummary } from '@grafana/data';
import { checkFields } from '@grafana/flamegraph';

jest.mock('@grafana/flamegraph', () => ({
  FlameGraph: () => null,
  checkFields: jest.fn(),
  getMessageCheckFieldsResult: jest.fn(),
}));

const mockCheckFields = checkFields as jest.MockedFunction<typeof checkFields>;

import { plugin } from './module';

describe('flamegraph module', () => {
  beforeEach(() => {
    mockCheckFields.mockReset();
  });

  it('returns undefined when no raw frame passes checkFields', () => {
    mockCheckFields.mockReturnValue('invalid');

    const summary = getPanelDataSummary([createDataFrame({ fields: [] })]);

    expect(plugin.getSuggestions(summary)).toBeUndefined();
    expect(mockCheckFields).toHaveBeenCalled();
  });

  it('returns a suggestion whose previewModifier sets showFlameGraphOnly when a frame is valid', () => {
    mockCheckFields.mockReturnValue(undefined);

    const summary = getPanelDataSummary([createDataFrame({ fields: [] })]);
    const suggestions = plugin.getSuggestions(summary);

    expect(suggestions).toHaveLength(1);

    const suggestionState: { options?: { showFlameGraphOnly?: boolean } } = {};
    suggestions![0].cardOptions?.previewModifier?.(suggestionState as never);

    expect(suggestionState.options?.showFlameGraphOnly).toBe(true);
  });
});
