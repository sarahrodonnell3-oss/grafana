import {
  type DataFrame,
  type Field,
  FieldColorModeId,
  FieldType,
  getDisplayProcessor,
  getFieldDisplayName,
  getFieldSeriesColor,
  type GrafanaTheme2,
} from '@grafana/data';
import { t } from '@grafana/i18n';
import {
  type GraphFieldConfig,
  GraphDrawStyle,
  GraphGradientMode,
  GraphThresholdsStyleMode,
  LineInterpolation,
  StackingMode,
  VisibilityMode,
} from '@grafana/schema';

import { defaultTimeSeriesOverlayOptions, type TimeSeriesOverlayOptions, TimeSeriesOverlayType } from './panelcfg.gen';

/** A trailing window of one point is just the source series, so two is the smallest useful window. */
export const MIN_MOVING_AVERAGE_WINDOW = 2;

/** The number input in the options editor hands back undefined once the user clears it. */
function resolveWindowSize(windowSize: number | undefined): number {
  const size = Number.isFinite(windowSize) ? windowSize! : defaultTimeSeriesOverlayOptions.windowSize!;
  return Math.max(MIN_MOVING_AVERAGE_WINDOW, Math.floor(size));
}

/**
 * Trailing moving average over the last `windowSize` points, gaps excluded.
 * Windows are sized by point count, not by time, so the result of an irregularly
 * spaced series is smoothed unevenly.
 */
export function calcMovingAverage(values: unknown[], windowSize: number): Array<number | null> {
  const window = resolveWindowSize(windowSize);
  const out: Array<number | null> = Array(values.length);

  let sum = 0;
  let count = 0;

  for (let i = 0; i < values.length; i++) {
    const entering = values[i];
    if (typeof entering === 'number' && Number.isFinite(entering)) {
      sum += entering;
      count++;
    }

    const leavingIdx = i - window;
    if (leavingIdx >= 0) {
      const leaving = values[leavingIdx];
      if (typeof leaving === 'number' && Number.isFinite(leaving)) {
        sum -= leaving;
        count--;
      }
    }

    out[i] = count === 0 ? null : sum / count;
  }

  return out;
}

/**
 * Ordinary least squares fit of `values` over `xs`, evaluated at every x.
 * Returns null when the points don't define a line (fewer than two of them, or no spread in x).
 */
export function calcLinearRegression(xs: unknown[], values: unknown[]): Array<number | null> | null {
  // Epoch millis are large enough that squaring them loses precision, so fit against an offset from the first x.
  let xOrigin: number | null = null;
  let n = 0;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < values.length; i++) {
    const x = xs[i];
    const y = values[i];

    if (typeof x !== 'number' || !Number.isFinite(x) || typeof y !== 'number' || !Number.isFinite(y)) {
      continue;
    }

    xOrigin ??= x;
    const dx = x - xOrigin;

    n++;
    sumX += dx;
    sumY += y;
    sumXY += dx * y;
    sumXX += dx * dx;
  }

  if (n < 2 || xOrigin == null) {
    return null;
  }

  const denominator = n * sumXX - sumX * sumX;

  if (denominator === 0) {
    return null;
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  const origin = xOrigin;

  return xs.map((x) => (typeof x === 'number' && Number.isFinite(x) ? intercept + slope * (x - origin) : null));
}

function getOverlayDisplayName(sourceName: string, overlay: TimeSeriesOverlayOptions): string {
  // The series name is concatenated rather than interpolated because i18next escapes
  // interpolated values, which would mangle names containing characters such as `&`.
  const suffix =
    overlay.type === TimeSeriesOverlayType.LinearRegression
      ? t('timeseries.overlay.suffix-trendline', 'trendline')
      : t('timeseries.overlay.suffix-moving-average', 'moving avg {{window}}', {
          window: resolveWindowSize(overlay.windowSize),
        });

  return `${sourceName} (${suffix})`;
}

function makeOverlayField(
  sourceField: Field,
  displayName: string,
  values: Array<number | null>,
  theme: GrafanaTheme2
): Field {
  const sourceCustom: GraphFieldConfig = sourceField.config.custom ?? {};

  // Inherit the source series color so the pairing is obvious, and dash the line so the
  // derived series can't be mistaken for real data.
  const custom: GraphFieldConfig = {
    ...sourceCustom,
    drawStyle: GraphDrawStyle.Line,
    lineInterpolation: LineInterpolation.Linear,
    lineWidth: Math.max(1, sourceCustom.lineWidth ?? 1),
    lineStyle: { fill: 'dash', dash: [10, 10] },
    fillOpacity: 0,
    gradientMode: GraphGradientMode.None,
    showPoints: VisibilityMode.Never,
    stacking: { mode: StackingMode.None },
    thresholdsStyle: { mode: GraphThresholdsStyleMode.Off },
    hideFrom: { legend: false, tooltip: false, viz: false },
  };

  const field: Field = {
    name: displayName,
    type: FieldType.number,
    values,
    config: {
      unit: sourceField.config.unit,
      decimals: sourceField.config.decimals,
      min: sourceField.config.min,
      max: sourceField.config.max,
      displayName,
      color: { mode: FieldColorModeId.Fixed, fixedColor: getFieldSeriesColor(sourceField, theme).color },
      custom,
    },
    state: { seriesIndex: sourceField.state?.seriesIndex },
  };

  field.display = getDisplayProcessor({ field, theme });

  return field;
}

function isOverlayableField(field: Field): boolean {
  return field.type === FieldType.number && field.config.custom?.hideFrom?.viz !== true;
}

/**
 * Appends a derived series (moving average or trendline) for every visible numeric field.
 * Must run after `prepareGraphableFields` so the source series already carry their palette colors,
 * which the overlays inherit.
 */
export function applyOverlaySeries(
  frames: DataFrame[],
  overlay: TimeSeriesOverlayOptions | undefined,
  theme: GrafanaTheme2
): DataFrame[] {
  if (!overlay?.enabled) {
    return frames;
  }

  return frames.map((frame) => {
    const xField = frame.fields.find((field) => field.type === FieldType.time);

    // Time-compare frames get a " (comparison)" suffix appended to whatever display name they
    // carry, which would read as a second suffix on top of the overlay's own.
    if (xField == null || frame.meta?.timeCompare?.isTimeShiftQuery) {
      return frame;
    }

    const overlayFields: Field[] = [];

    for (const field of frame.fields) {
      if (!isOverlayableField(field)) {
        continue;
      }

      const values =
        overlay.type === TimeSeriesOverlayType.LinearRegression
          ? calcLinearRegression(xField.values, field.values)
          : calcMovingAverage(field.values, overlay.windowSize);

      if (values == null) {
        continue;
      }

      const sourceName = getFieldDisplayName(field, frame, frames);
      overlayFields.push(makeOverlayField(field, getOverlayDisplayName(sourceName, overlay), values, theme));
    }

    if (overlayFields.length === 0) {
      return frame;
    }

    return { ...frame, fields: [...frame.fields, ...overlayFields] };
  });
}
