import { createDataFrame, createTheme, type DataFrame, FieldColorModeId, FieldType } from '@grafana/data';

import { applyOverlaySeries, calcLinearRegression, calcMovingAverage, MIN_MOVING_AVERAGE_WINDOW } from './overlay';
import { type TimeSeriesOverlayOptions, TimeSeriesOverlayType } from './panelcfg.gen';
import { prepareGraphableFields } from './utils';

const theme = createTheme();

const movingAverage: TimeSeriesOverlayOptions = {
  enabled: true,
  type: TimeSeriesOverlayType.MovingAverage,
  windowSize: 3,
};

const trendline: TimeSeriesOverlayOptions = {
  enabled: true,
  type: TimeSeriesOverlayType.LinearRegression,
  windowSize: 10,
};

function makeFrame(values: unknown[], overrides: Partial<DataFrame> = {}): DataFrame {
  return createDataFrame({
    fields: [
      { name: 'time', type: FieldType.time, values: values.map((_, i) => 1000 + i * 1000), config: {} },
      { name: 'value', type: FieldType.number, values, config: { custom: {} } },
    ],
    ...overrides,
  });
}

describe('calcMovingAverage', () => {
  it('averages a trailing window of the configured size', () => {
    expect(calcMovingAverage([3, 6, 9, 12], 2)).toEqual([3, 4.5, 7.5, 10.5]);
  });

  it('uses a partial window before enough points exist', () => {
    expect(calcMovingAverage([2, 4, 6, 8, 10], 3)).toEqual([2, 3, 4, 6, 8]);
  });

  it('ignores gaps but still lets them age out of the window', () => {
    expect(calcMovingAverage([10, null, 20, undefined, 30], 2)).toEqual([10, 10, 20, 20, 30]);
  });

  it('emits null while the window holds no values', () => {
    expect(calcMovingAverage([null, null, 4], 2)).toEqual([null, null, 4]);
  });

  it('clamps the window to the minimum', () => {
    expect(calcMovingAverage([1, 2, 3], 1)).toEqual(calcMovingAverage([1, 2, 3], MIN_MOVING_AVERAGE_WINDOW));
  });

  it('falls back to the default window when the option is cleared', () => {
    const values = [1, 2, 3, 4, 5];
    // @ts-expect-error the number input hands back undefined once the user clears it
    expect(calcMovingAverage(values, undefined)).toEqual(calcMovingAverage(values, 10));
  });

  it('skips non-numeric values', () => {
    expect(calcMovingAverage(['nope', 4, NaN], 2)).toEqual([null, 4, 4]);
  });
});

describe('calcLinearRegression', () => {
  it('reproduces a perfectly linear series', () => {
    const xs = [1000, 2000, 3000, 4000];
    expect(calcLinearRegression(xs, [2, 4, 6, 8])).toEqual([2, 4, 6, 8]);
  });

  it('fits a line through noisy points', () => {
    const result = calcLinearRegression([0, 1, 2, 3], [1, 3, 2, 4])!;

    // OLS on these points gives y = 1.3 + 0.8x
    expect(result).toHaveLength(4);
    result.forEach((value, i) => expect(value).toBeCloseTo(1.3 + 0.8 * i, 10));
  });

  it('keeps precision with epoch millisecond timestamps', () => {
    const start = 1_700_000_000_000;
    const xs = [start, start + 60_000, start + 120_000];

    const result = calcLinearRegression(xs, [10, 20, 30])!;

    result.forEach((value, i) => expect(value).toBeCloseTo(10 + i * 10, 6));
  });

  it('predicts at every x, including where y is missing', () => {
    expect(calcLinearRegression([0, 1, 2], [0, null, 4])).toEqual([0, 2, 4]);
  });

  it('returns null when fewer than two points define the line', () => {
    expect(calcLinearRegression([0, 1], [5, null])).toBeNull();
    expect(calcLinearRegression([], [])).toBeNull();
  });

  it('returns null when x has no spread', () => {
    expect(calcLinearRegression([5, 5, 5], [1, 2, 3])).toBeNull();
  });
});

describe('applyOverlaySeries', () => {
  it('returns the frames untouched when the overlay is off', () => {
    const frames = [makeFrame([1, 2, 3])];

    expect(applyOverlaySeries(frames, undefined, theme)).toBe(frames);
    expect(applyOverlaySeries(frames, { ...movingAverage, enabled: false }, theme)).toBe(frames);
  });

  it('appends one derived field per numeric field', () => {
    const frame = createDataFrame({
      fields: [
        { name: 'time', type: FieldType.time, values: [1000, 2000, 3000], config: {} },
        { name: 'cpu', type: FieldType.number, values: [1, 2, 3], config: { custom: {} } },
        { name: 'mem', type: FieldType.number, values: [4, 5, 6], config: { custom: {} } },
      ],
    });

    const [result] = applyOverlaySeries([frame], movingAverage, theme);

    expect(result.fields.map((f) => f.name)).toEqual([
      'time',
      'cpu',
      'mem',
      'cpu (moving avg 3)',
      'mem (moving avg 3)',
    ]);
    expect(result.fields[3].values).toEqual(calcMovingAverage([1, 2, 3], 3));
  });

  it('names the trendline overlay after its source series', () => {
    const [result] = applyOverlaySeries([makeFrame([1, 5, 3])], trendline, theme);

    expect(result.fields[2].config.displayName).toBe('value (trendline)');
  });

  it('reports the clamped window in the series name', () => {
    const [result] = applyOverlaySeries([makeFrame([1, 2, 3])], { ...movingAverage, windowSize: 1 }, theme);

    expect(result.fields[2].config.displayName).toBe('value (moving avg 2)');
  });

  it('inherits the source series color so the pairing is visible', () => {
    const frame = makeFrame([1, 2, 3]);
    frame.fields[1].config.color = { mode: FieldColorModeId.Fixed, fixedColor: 'red' };

    const [result] = applyOverlaySeries([frame], movingAverage, theme);

    expect(result.fields[2].config.color).toEqual({
      mode: FieldColorModeId.Fixed,
      fixedColor: theme.visualization.getColorByName('red'),
    });
  });

  it('draws the overlay as a dashed line with no fill or points', () => {
    const frame = makeFrame([1, 2, 3]);
    frame.fields[1].config.custom = { fillOpacity: 40, lineWidth: 2 };

    const [result] = applyOverlaySeries([frame], movingAverage, theme);
    const custom = result.fields[2].config.custom;

    expect(custom.lineStyle).toEqual({ fill: 'dash', dash: [10, 10] });
    expect(custom.fillOpacity).toBe(0);
    expect(custom.showPoints).toBe('never');
    expect(custom.hideFrom).toEqual({ legend: false, tooltip: false, viz: false });
    // Non-conflicting source styling carries over so the overlay tracks the series it derives from
    expect(custom.lineWidth).toBe(2);
  });

  it('carries the source unit over so the overlay shares its axis', () => {
    const frame = makeFrame([1, 2, 3]);
    frame.fields[1].config.unit = 'bytes';

    const [result] = applyOverlaySeries([frame], movingAverage, theme);

    expect(result.fields[2].config.unit).toBe('bytes');
    expect(result.fields[2].display).toBeDefined();
  });

  it('skips series hidden from the visualization', () => {
    const frame = makeFrame([1, 2, 3]);
    frame.fields[1].config.custom = { hideFrom: { viz: true, legend: false, tooltip: false } };

    expect(applyOverlaySeries([frame], movingAverage, theme)[0].fields).toHaveLength(2);
  });

  it('skips time-compare frames', () => {
    const frame = makeFrame([1, 2, 3], { meta: { timeCompare: { isTimeShiftQuery: true, diffMs: -86400000 } } });

    expect(applyOverlaySeries([frame], movingAverage, theme)[0].fields).toHaveLength(2);
  });

  it('skips frames without a time field', () => {
    const frame = createDataFrame({
      fields: [{ name: 'value', type: FieldType.number, values: [1, 2, 3], config: {} }],
    });

    expect(applyOverlaySeries([frame], movingAverage, theme)[0].fields).toHaveLength(1);
  });

  it('skips a trendline that cannot be fitted', () => {
    expect(applyOverlaySeries([makeFrame([null, null, null])], trendline, theme)[0].fields).toHaveLength(2);
  });

  it('inherits the classic palette color assigned by prepareGraphableFields', () => {
    const paletteConfig = { custom: {}, color: { mode: FieldColorModeId.PaletteClassic } };
    const frames = prepareGraphableFields(
      [
        createDataFrame({
          fields: [
            { name: 'time', type: FieldType.time, values: [1000, 2000, 3000], config: {} },
            { name: 'a', type: FieldType.number, values: [1, 2, 3], config: paletteConfig },
            { name: 'b', type: FieldType.number, values: [4, 5, 6], config: paletteConfig },
          ],
        }),
      ],
      theme
    )!;

    const [result] = applyOverlaySeries(frames, movingAverage, theme);
    const [, sourceA, sourceB, overlayA, overlayB] = result.fields;

    expect(overlayA.config.color?.fixedColor).toBe(theme.visualization.getColorByName(theme.visualization.palette[0]));
    expect(overlayB.config.color?.fixedColor).toBe(theme.visualization.getColorByName(theme.visualization.palette[1]));
    expect(overlayA.config.color?.fixedColor).not.toBe(overlayB.config.color?.fixedColor);
    expect(overlayA.state?.seriesIndex).toBe(sourceA.state?.seriesIndex);
    expect(overlayB.state?.seriesIndex).toBe(sourceB.state?.seriesIndex);
  });
});
