import { fireEvent, render, screen } from '@testing-library/react';

import {
  createDataFrame,
  FieldType,
  getDefaultTimeRange,
  LoadingState,
  type PanelData,
  type PanelProps,
} from '@grafana/data';

import { RenderInfoViewer } from './RenderInfoViewer';
import { DebugMode, type Options } from './panelcfg.gen';

const defaultOptions: Options = {
  mode: DebugMode.Render,
  counters: {
    render: true,
    dataChanged: true,
    schemaChanged: true,
  },
};

function makeProps(data: PanelData, options: Options = defaultOptions): PanelProps<Options> {
  return {
    data,
    options,
    timeRange: getDefaultTimeRange(),
  } as unknown as PanelProps<Options>;
}

const frameWithFields = createDataFrame({
  refId: 'A',
  fields: [
    { name: 'timestamp', type: FieldType.time, values: [1, 2, 3] },
    { name: 'value', type: FieldType.number, values: [10, 20, 30] },
  ],
});

describe('RenderInfoViewer', () => {
  it('increments the render counter across rerenders', () => {
    const data: PanelData = { state: LoadingState.Done, series: [frameWithFields], timeRange: getDefaultTimeRange() };
    const { rerender } = render(<RenderInfoViewer {...makeProps(data)} />);

    expect(screen.getByText(/Render:\s*1/)).toBeInTheDocument();

    rerender(<RenderInfoViewer {...makeProps(data)} />);
    expect(screen.getByText(/Render:\s*2/)).toBeInTheDocument();

    rerender(<RenderInfoViewer {...makeProps(data)} />);
    expect(screen.getByText(/Render:\s*3/)).toBeInTheDocument();
  });

  it('increments dataChanged only when the data prop identity changes', () => {
    const dataA: PanelData = { state: LoadingState.Done, series: [frameWithFields], timeRange: getDefaultTimeRange() };
    const dataSameRef = dataA;
    const dataB: PanelData = {
      state: LoadingState.Done,
      series: [frameWithFields],
      timeRange: getDefaultTimeRange(),
    };

    const { rerender } = render(<RenderInfoViewer {...makeProps(dataA)} />);

    expect(screen.getByText(/Data:\s*0/)).toBeInTheDocument();

    rerender(<RenderInfoViewer {...makeProps(dataSameRef)} />);
    expect(screen.getByText(/Data:\s*0/)).toBeInTheDocument();

    rerender(<RenderInfoViewer {...makeProps(dataB)} />);
    expect(screen.getByText(/Data:\s*1/)).toBeInTheDocument();
  });

  it('increments schemaChanged when enabled and frame structure differs', () => {
    const frameA = createDataFrame({
      fields: [{ name: 'a', type: FieldType.number, values: [1] }],
    });
    const frameSameStructure = createDataFrame({
      fields: [{ name: 'a', type: FieldType.number, values: [99] }],
    });
    const frameDifferentStructure = createDataFrame({
      fields: [
        { name: 'a', type: FieldType.number, values: [1] },
        { name: 'b', type: FieldType.number, values: [2] },
      ],
    });

    const data1: PanelData = { state: LoadingState.Done, series: [frameA], timeRange: getDefaultTimeRange() };
    const data2: PanelData = {
      state: LoadingState.Done,
      series: [frameSameStructure],
      timeRange: getDefaultTimeRange(),
    };
    const data3: PanelData = {
      state: LoadingState.Done,
      series: [frameDifferentStructure],
      timeRange: getDefaultTimeRange(),
    };

    const { rerender } = render(<RenderInfoViewer {...makeProps(data1)} />);
    expect(screen.getByText(/Schema:\s*0/)).toBeInTheDocument();

    rerender(<RenderInfoViewer {...makeProps(data2)} />);
    expect(screen.getByText(/Schema:\s*0/)).toBeInTheDocument();

    rerender(<RenderInfoViewer {...makeProps(data3)} />);
    expect(screen.getByText(/Schema:\s*1/)).toBeInTheDocument();
  });

  it('resets all counters when the reset button is clicked', () => {
    const data: PanelData = { state: LoadingState.Done, series: [frameWithFields], timeRange: getDefaultTimeRange() };
    const { rerender } = render(<RenderInfoViewer {...makeProps(data)} />);

    rerender(<RenderInfoViewer {...makeProps(data)} />);
    expect(screen.getByText(/Render:\s*2/)).toBeInTheDocument();

    fireEvent.click(screen.getByTitle('Reset counters'));

    expect(screen.getByText(/Render:\s*1/)).toBeInTheDocument();
    expect(screen.getByText(/Data:\s*0/)).toBeInTheDocument();
    expect(screen.getByText(/Schema:\s*0/)).toBeInTheDocument();
  });

  it('renders a field table row per field with name, type, and lastNotNull value', () => {
    const data: PanelData = { state: LoadingState.Done, series: [frameWithFields], timeRange: getDefaultTimeRange() };
    render(<RenderInfoViewer {...makeProps(data)} />);

    expect(screen.getByText('timestamp')).toBeInTheDocument();
    expect(screen.getByText('value')).toBeInTheDocument();
    expect(screen.getByText('time')).toBeInTheDocument();
    expect(screen.getByText('number')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
  });
});
