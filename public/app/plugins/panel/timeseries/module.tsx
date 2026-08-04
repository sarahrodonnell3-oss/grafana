import { PanelPlugin } from '@grafana/data';
import { t } from '@grafana/i18n';
import { commonOptionsBuilder } from '@grafana/ui';
import { optsWithHideZeros } from '@grafana/ui/internal';
import { addAnnotationOptions } from 'app/features/panel/options/builder/annotations';

import { TimeSeriesPanel } from './TimeSeriesPanel';
import { TimezonesEditor } from './TimezonesEditor';
import { defaultGraphConfig, getGraphFieldConfig } from './config';
import { graphPanelChangedHandler } from './migrations';
import { type FieldConfig, type Options, OverlayType } from './panelcfg.gen';
import { timeseriesPresetsSupplier } from './presets';
import { timeseriesSuggestionsSupplier } from './suggestions';

export const plugin = new PanelPlugin<Options, FieldConfig>(TimeSeriesPanel)
  .setPanelChangeHandler(graphPanelChangedHandler)
  .useFieldConfig(getGraphFieldConfig(defaultGraphConfig))
  .setPanelOptions((builder) => {
    commonOptionsBuilder.addTooltipOptions(builder, false, true, optsWithHideZeros);
    commonOptionsBuilder.addLegendOptions(builder, true, true);

    const legendCategory = [t('timeseries.legend.category', 'Legend')];

    builder.addBooleanSwitch({
      path: 'legend.enableFacetedFilter',
      name: t('timeseries.legend.name-faceted-filter', 'Series visibility'),
      category: legendCategory,
      description: t(
        'timeseries.legend.description-faceted-filter',
        'Enable filter to display series based on labels or names'
      ),
      showIf: (c) => c.legend.showLegend,
    });

    builder.addCustomEditor({
      id: 'timezone',
      name: t('timeseries.name-time-zone', 'Time zone'),
      path: 'timezone',
      category: [t('timeseries.category-axis', 'Axis')],
      editor: TimezonesEditor,
      defaultValue: undefined,
    });

    const overlayCategory = [t('timeseries.overlay.category', 'Overlay')];

    builder
      .addBooleanSwitch({
        path: 'overlay.enabled',
        name: t('timeseries.overlay.name-enabled', 'Show overlay'),
        description: t(
          'timeseries.overlay.description-enabled',
          'Render an extra derived line per numeric series, computed from the visible data'
        ),
        category: overlayCategory,
        defaultValue: false,
      })
      .addRadio({
        path: 'overlay.type',
        name: t('timeseries.overlay.name-type', 'Overlay type'),
        category: overlayCategory,
        defaultValue: OverlayType.MovingAverage,
        settings: {
          options: [
            {
              value: OverlayType.MovingAverage,
              label: t('timeseries.overlay.type-options.label-moving-average', 'Moving average'),
            },
            {
              value: OverlayType.LinearRegression,
              label: t('timeseries.overlay.type-options.label-linear-regression', 'Linear regression'),
            },
          ],
        },
        showIf: (opts) => opts.overlay?.enabled === true,
      })
      .addNumberInput({
        path: 'overlay.windowSize',
        name: t('timeseries.overlay.name-window-size', 'Window size'),
        description: t('timeseries.overlay.description-window-size', 'Number of trailing points averaged (minimum 2)'),
        category: overlayCategory,
        defaultValue: 10,
        settings: {
          min: 2,
          integer: true,
        },
        showIf: (opts) => opts.overlay?.enabled === true && opts.overlay?.type === OverlayType.MovingAverage,
      });

    addAnnotationOptions(builder);
  })
  .setSuggestionsSupplier(timeseriesSuggestionsSupplier)
  .setPresetsSupplier(timeseriesPresetsSupplier)
  .setViewPanelOptions({
    fanout: { enabled: true },
    quickToggles: {
      optionProperties: ['legend.showLegend'],
      fieldConfigProperties: ['custom.stacking'],
    },
  })
  .setDataSupport({ annotations: true, alertStates: true });
