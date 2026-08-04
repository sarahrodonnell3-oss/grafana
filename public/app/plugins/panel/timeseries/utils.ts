import { SimpleLinearRegression } from 'ml-regression-simple-linear';

import {
  type DataFrame,
  type Field,
  FieldColorModeId,
  FieldType,
  formatLabels,
  getDisplayProcessor,
  getFieldDisplayName,
  type GrafanaTheme2,
  isBooleanUnit,
  type TimeRange,
  cacheFieldDisplayNames,
  applyNullInsertThreshold,
  nullToValue,
} from '@grafana/data';
import { convertFieldType } from '@grafana/data/internal';
import { GraphDrawStyle, type GraphFieldConfig, GraphGradientMode, LineInterpolation } from '@grafana/schema';
import { buildScaleKey } from '@grafana/ui/internal';

import { OverlayType, type TimeSeriesOverlayOptions } from './panelcfg.gen';

type ScaleKey = string;

/**
 * Stable identity for pairing a compare-series field with its current-period counterpart.
 * Can't reuse getFieldDisplayName since compare series get a " (comparison)" suffix.
 * Labels come first (precise per-series identity); config.displayName is not preferred over
 * them because it's often a shared, un-interpolated template that collapses all series.
 */
export function getCompareSeriesIdentityKey(field: Field, frame?: DataFrame): string {
  // The compare request runs under a distinct `<refId>-compare` refId (see PanelTimeRange.getExtraQueries)
  // so query caches/panels don't collide. Datasources that embed the refId in the series name (e.g. TestData)
  // then emit compare names like `A-compare-series1` while the current period is `A-series1`. Strip that
  // infix so a compare series still pairs with its current-period counterpart. Label-based datasources
  // (e.g. Prometheus) are unaffected since their names don't start with the refId.
  const refId = frame?.refId ?? '';
  const baseRefId = refId.replace(/-compare$/, '');
  const name =
    baseRefId !== refId && field.name.startsWith(refId) ? `${baseRefId}${field.name.slice(refId.length)}` : field.name;

  const labels = field.labels ? formatLabels(field.labels) : '';
  if (labels) {
    return `${name} ${labels}`;
  }
  if (field.config?.displayName) {
    return field.config.displayName;
  }
  if (field.config?.displayNameFromDS) {
    return field.config.displayNameFromDS;
  }
  if (frame?.name) {
    return `${frame.name} ${name}`;
  }
  return name;
}

// this will re-enumerate all enum fields on the same scale to create one ordinal progression
// e.g. ['a','b'][0,1,0] + ['c','d'][1,0,1] -> ['a','b'][0,1,0] + ['c','d'][3,2,3]
function reEnumFields(frames: DataFrame[]): DataFrame[] {
  let allTextsByKey: Map<ScaleKey, string[]> = new Map();

  let frames2: DataFrame[] = frames.map((frame) => {
    return {
      ...frame,
      fields: frame.fields.map((field) => {
        if (field.type === FieldType.enum) {
          let scaleKey = buildScaleKey(field.config, field.type);
          let allTexts = allTextsByKey.get(scaleKey);

          if (!allTexts) {
            allTexts = [];
            allTextsByKey.set(scaleKey, allTexts);
          }

          let idxs: number[] = field.values.slice();
          let txts = field.config.type!.enum!.text!;

          // by-reference incrementing
          if (allTexts.length > 0) {
            for (let i = 0; i < idxs.length; i++) {
              idxs[i] += allTexts.length;
            }
          }

          allTexts.push(...txts);

          // shared among all enum fields on same scale
          field.config.type!.enum!.text! = allTexts;

          return {
            ...field,
            values: idxs,
          };

          // TODO: update displayProcessor?
        }

        return field;
      }),
    };
  });

  return frames2;
}

/**
 * Returns null if there are no graphable fields
 */
export function prepareGraphableFields(
  series: DataFrame[],
  theme: GrafanaTheme2,
  timeRange?: TimeRange,
  // numeric X requires a single frame where the first field is numeric
  xNumFieldIdx?: number
): DataFrame[] | null {
  if (!series?.length) {
    return null;
  }

  cacheFieldDisplayNames(series);

  let useNumericX = xNumFieldIdx != null;

  // Make sure the numeric x field is first in the frame
  if (xNumFieldIdx != null && xNumFieldIdx > 0) {
    series = [
      {
        ...series[0],
        fields: [series[0].fields[xNumFieldIdx], ...series[0].fields.filter((f, i) => i !== xNumFieldIdx)],
      },
    ];
  }

  // some datasources simply tag the field as time, but don't convert to milli epochs
  // so we're stuck with doing the parsing here to avoid Moment slowness everywhere later
  // this mutates (once)
  for (let frame of series) {
    for (let field of frame.fields) {
      if (field.type === FieldType.time && typeof field.values[0] !== 'number') {
        field.values = convertFieldType(field, { destinationType: FieldType.time }).values;
      }
    }
  }

  let enumFieldsCount = 0;

  loopy: for (let frame of series) {
    for (let field of frame.fields) {
      if (field.type === FieldType.enum && ++enumFieldsCount > 1) {
        series = reEnumFields(series);
        break loopy;
      }
    }
  }

  let copy: Field;

  const frames: DataFrame[] = [];

  for (let frame of series) {
    const fields: Field[] = [];

    let hasTimeField = false;
    let hasValueField = false;

    let nulledFrame = useNumericX
      ? frame
      : applyNullInsertThreshold({
          frame,
          refFieldPseudoMin: timeRange?.from.valueOf(),
          refFieldPseudoMax: timeRange?.to.valueOf(),
        });

    const frameFields = nullToValue(nulledFrame).fields;

    for (let fieldIdx = 0; fieldIdx < (frameFields?.length || 0); fieldIdx++) {
      const field = frameFields[fieldIdx];

      switch (field.type) {
        case FieldType.time:
          hasTimeField = true;
          fields.push(field);
          break;
        case FieldType.number:
          hasValueField = useNumericX ? fieldIdx > 0 : true;

          // we need to make sure all values in the array are numbers or null
          // so, check all values and if we encounter a bad one, copy the array and
          // replace all further-occuring non-numbers with null to make safe values array
          let values = field.values;
          let safeValues: unknown[] | undefined = undefined;

          for (let i = 0; i < values.length; i++) {
            let v = values[i];

            if (!(Number.isFinite(v) || v == null)) {
              safeValues ??= values.slice();
              safeValues[i] = null;
            }
          }

          safeValues ??= values;

          copy = {
            ...field,
            values: safeValues,
          };

          fields.push(copy);
          break; // ok
        case FieldType.enum:
          hasValueField = true;
        case FieldType.string:
          copy = {
            ...field,
            values: field.values,
          };

          fields.push(copy);
          break; // ok
        case FieldType.boolean:
          hasValueField = true;
          const custom: GraphFieldConfig = field.config?.custom ?? {};
          const config = {
            ...field.config,
            max: 1,
            min: 0,
            custom: { ...custom },
          };

          // smooth and linear do not make sense
          if (config.custom.lineInterpolation !== LineInterpolation.StepBefore) {
            config.custom.lineInterpolation = LineInterpolation.StepAfter;
          }

          copy = {
            ...field,
            config,
            type: FieldType.number,
            values: field.values.map((v) => {
              if (v == null) {
                return v;
              }
              return Boolean(v) ? 1 : 0;
            }),
          };

          if (!isBooleanUnit(config.unit)) {
            config.unit = 'bool';
            copy.display = getDisplayProcessor({ field: copy, theme });
          }

          fields.push(copy);
          break;
      }
    }

    if ((useNumericX || hasTimeField) && hasValueField) {
      frames.push({
        ...frame,
        length: nulledFrame.length,
        fields,
      });
    }
  }

  if (frames.length) {
    setClassicPaletteIdxs(frames, theme, 0);
    matchEnumColorToSeriesColor(frames, theme);
    return frames;
  }

  return null;
}

const matchEnumColorToSeriesColor = (frames: DataFrame[], theme: GrafanaTheme2) => {
  const { palette } = theme.visualization;
  for (const frame of frames) {
    for (const field of frame.fields) {
      if (field.type === FieldType.enum) {
        const namedColor = palette[field.state?.seriesIndex! % palette.length];
        const hexColor = theme.visualization.getColorByName(namedColor);
        const enumConfig = field.config.type!.enum!;

        enumConfig.color = Array(enumConfig.text!.length).fill(hexColor);
        field.display = getDisplayProcessor({ field, theme });
      }
    }
  }
};

export const setClassicPaletteIdxs = (frames: DataFrame[], theme: GrafanaTheme2, skipFieldIdx?: number) => {
  let seriesIndex = 0;

  const updateFieldDisplay = (field: Field, idx: number) => {
    field.state = { ...field.state, seriesIndex: idx };
    field.display = getDisplayProcessor({ field, theme });
  };

  const shouldProcessField = (field: Field, fieldIdx: number) => {
    return (
      fieldIdx !== skipFieldIdx &&
      (field.type === FieldType.number || field.type === FieldType.boolean || field.type === FieldType.enum)
    );
  };

  // Identity -> seriesIndex for current-period fields, keyed by refId so multi-query panels stay isolated.
  const seriesIndexByIdentity = new Map<string, number>();

  // Assign palette indices to current-period series first so compare frames can look them up by identity.
  for (const frame of frames) {
    if (frame.meta?.timeCompare?.isTimeShiftQuery) {
      continue;
    }

    const refId = frame.refId ?? '';
    frame.fields.forEach((field, fieldIdx) => {
      if (!shouldProcessField(field, fieldIdx)) {
        return;
      }

      const idx = seriesIndex++;
      updateFieldDisplay(field, idx);

      const identityKey = `${refId}\0${getCompareSeriesIdentityKey(field, frame)}`;
      if (!seriesIndexByIdentity.has(identityKey)) {
        seriesIndexByIdentity.set(identityKey, idx);
      }
    });
  }

  // Pair compare series to the matching current-period series by labels/name, not result-list position.
  for (const frame of frames) {
    if (!frame.meta?.timeCompare?.isTimeShiftQuery) {
      continue;
    }

    const baseRefId = frame.refId?.replace(/-compare$/, '') ?? '';

    frame.fields.forEach((field, fieldIdx) => {
      if (!shouldProcessField(field, fieldIdx)) {
        return;
      }

      const identityKey = `${baseRefId}\0${getCompareSeriesIdentityKey(field, frame)}`;
      const matchedIndex = seriesIndexByIdentity.get(identityKey);
      updateFieldDisplay(field, matchedIndex ?? seriesIndex++);
    });
  }
};

export function getTimezones(timezones: string[] | undefined, defaultTimezone: string): string[] {
  if (!timezones || !timezones.length) {
    return [defaultTimezone];
  }
  return timezones.map((v) => (v?.length ? v : defaultTimezone));
}

// A moving-average window narrower than this is meaningless (it would just echo the source series).
export const MIN_OVERLAY_WINDOW_SIZE = 2;

// The overlay is drawn as a contrasting secondary line so it reads clearly over the classic-palette
// source series. Green is picked to stand out against the blue that starts the classic palette.
const OVERLAY_COLOR = 'green';

/**
 * Trailing simple moving average over the last `window` positions (by index, so nulls inside the
 * window are skipped rather than treated as zero). Mirrors the trailing-mean logic used by the
 * "Add field from calculation" transformer, but yields null when the window holds no finite values
 * so the overlay line has a gap instead of a misleading flat zero.
 */
function trailingMovingAverage(values: unknown[], window: number): Array<number | null> {
  const win = Math.max(MIN_OVERLAY_WINDOW_SIZE, Math.floor(window));
  const out: Array<number | null> = [];
  let sum = 0;
  let count = 0;

  for (let i = 0; i < values.length; i++) {
    const current = values[i];
    if (typeof current === 'number' && Number.isFinite(current)) {
      sum += current;
      count++;
    }

    if (i > win - 1) {
      const leaving = values[i - win];
      if (typeof leaving === 'number' && Number.isFinite(leaving)) {
        sum -= leaving;
        count--;
      }
    }

    out.push(count === 0 ? null : sum / count);
  }

  return out;
}

/**
 * Simple OLS linear regression predicted at each X. X is shifted by its first finite value before
 * fitting so large time epochs don't blow up floating-point precision (the fit is shift-invariant).
 */
function linearRegressionLine(xValues: unknown[], yValues: unknown[]): Array<number | null> {
  const xs: number[] = [];
  const ys: number[] = [];

  for (let i = 0; i < yValues.length; i++) {
    const x = xValues[i];
    const y = yValues[i];
    if (typeof x === 'number' && Number.isFinite(x) && typeof y === 'number' && Number.isFinite(y)) {
      xs.push(x);
      ys.push(y);
    }
  }

  if (xs.length < 2) {
    return yValues.map(() => null);
  }

  const shift = xs[0];
  const regression = new SimpleLinearRegression(
    xs.map((x) => x - shift),
    ys
  );

  return xValues.map((x) => (typeof x === 'number' && Number.isFinite(x) ? regression.predict(x - shift) : null));
}

/**
 * Appends a derived overlay line (trailing moving average or OLS trendline) for every numeric value
 * field, aligned to the frame's existing X field. Runs after prepareGraphableFields so the synthetic
 * fields are already graphable; source fields are left untouched. No-op unless overlay.enabled.
 */
export function applyOverlays(
  frames: DataFrame[],
  overlay: TimeSeriesOverlayOptions | undefined,
  theme: GrafanaTheme2
): DataFrame[] {
  if (overlay?.enabled !== true) {
    return frames;
  }

  const type = overlay.type ?? OverlayType.MovingAverage;
  const windowSize = Math.max(MIN_OVERLAY_WINDOW_SIZE, Math.floor(overlay.windowSize ?? 10));

  return frames.map((frame, frameIndex) => {
    const xField = frame.fields.find((f) => f.type === FieldType.time) ?? frame.fields[0];
    if (!xField) {
      return frame;
    }

    const overlayFields: Field[] = [];

    frame.fields.forEach((field) => {
      if (field === xField || field.type !== FieldType.number) {
        return;
      }

      const sourceName = getFieldDisplayName(field, frame, frames);
      let values: Array<number | null>;
      let displayName: string;

      if (type === OverlayType.LinearRegression) {
        values = linearRegressionLine(xField.values, field.values);
        displayName = `${sourceName} (trend)`;
      } else {
        values = trailingMovingAverage(field.values, windowSize);
        displayName = `${sourceName} (MA ${windowSize})`;
      }

      const custom: GraphFieldConfig = {
        ...field.config.custom,
        drawStyle: GraphDrawStyle.Line,
        lineWidth: 2,
        lineStyle: { fill: 'dash', dash: [10, 10] },
        fillOpacity: 0,
        gradientMode: GraphGradientMode.None,
      };

      const overlayField: Field = {
        ...field,
        name: displayName,
        labels: undefined,
        values,
        config: {
          ...field.config,
          displayName,
          color: { mode: FieldColorModeId.Fixed, fixedColor: OVERLAY_COLOR },
          custom,
        },
        // Point back at the source frame; drop the cached displayName so it recomputes from config.
        state: { origin: { frameIndex, fieldIndex: frame.fields.length + overlayFields.length } },
      };

      overlayField.display = getDisplayProcessor({ field: overlayField, theme });
      overlayFields.push(overlayField);
    });

    if (overlayFields.length === 0) {
      return frame;
    }

    return {
      ...frame,
      fields: [...frame.fields, ...overlayFields],
    };
  });
}
