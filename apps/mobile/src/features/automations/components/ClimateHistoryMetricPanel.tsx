import type { HistoryRecord } from '@lcl/automation-core';
import { ResponsiveLine, type LineCustomSvgLayer } from '@nivo/line';
import type {
  HistoryChartSeries,
  HistoryMetricDefinition
} from './climateHistoryChartMetrics.js';
import { createClimateHistoryOutputTrack } from './ClimateHistoryOutputTrack.js';
import type { HistoryMetricDomain } from './climateHistoryChartScale.js';

const PANEL_MARGIN = { top: 8, right: 12, bottom: 8, left: 42 } as const;
const OUTPUT_VISUAL_DOMAIN: HistoryMetricDomain = [-0.15, 1.15];

const PANEL_THEME = {
  background: 'transparent',
  text: {
    fill: 'var(--lcl-color-text-muted)',
    fontFamily: 'var(--lcl-font-family)',
    fontSize: 11
  },
  axis: {
    domain: { line: { stroke: 'transparent' } },
    ticks: {
      line: { stroke: 'transparent' },
      text: { fill: 'var(--lcl-color-text-muted)' }
    }
  },
  grid: {
    line: {
      stroke: 'var(--lcl-color-border)',
      strokeOpacity: 0.5,
      strokeWidth: 1,
      strokeDasharray: '3 5'
    }
  }
} as const;

type ClimateHistoryMetricPanelProps = {
  metric: HistoryMetricDefinition;
  metricLabel: string;
  records: readonly HistoryRecord[];
  xValues: readonly number[];
  xTicks: readonly number[];
  domain: HistoryMetricDomain;
  currentValue: string;
  rangeValue: string;
  formatY(value: number): string;
  onLabel: string;
  offLabel: string;
};

export const ClimateHistoryMetricPanel = ({
  metric,
  metricLabel,
  records,
  xValues,
  xTicks,
  domain,
  currentValue,
  rangeValue,
  formatY,
  onLabel,
  offLabel
}: ClimateHistoryMetricPanelProps) => {
  const output = metric.id === 'output';
  const yDomain = output ? OUTPUT_VISUAL_DOMAIN : domain;
  const data: readonly HistoryChartSeries[] = [
    {
      id: metric.id,
      data: records.map((record, index) => ({
        x: xValues[index]!,
        y: metric.read(record),
        recordIndex: index
      }))
    }
  ];
  const yTicks = output
    ? [0, 1]
    : [yDomain[0], (yDomain[0] + yDomain[1]) / 2, yDomain[1]];
  const outputTrackLayer = createClimateHistoryOutputTrack(records, xValues, output);
  const latestRecordIndex = (() => {
    for (let index = records.length - 1; index >= 0; index -= 1) {
      if (metric.read(records[index]!) !== null) return index;
    }
    return null;
  })();
  const latestLayer: LineCustomSvgLayer<HistoryChartSeries> = ({
    xScale,
    yScale,
    innerHeight
  }) => {
    if (latestRecordIndex === null) return null;
    const value = metric.read(records[latestRecordIndex]!);
    if (value === null) return null;
    const x = xScale(xValues[latestRecordIndex]!);
    const y = yScale(value);

    return (
      <g aria-hidden="true">
        <line
          className="climate-history-chart__now-line"
          x1={x}
          x2={x}
          y1={0}
          y2={innerHeight}
        />
        <circle
          className="climate-history-chart__latest-point"
          cx={x}
          cy={y}
          r={3.25}
          fill={metric.color}
        />
      </g>
    );
  };

  return (
    <section
      className="climate-history-chart__panel"
      data-metric={metric.id}
      aria-label={`${metricLabel}: ${currentValue}`}
    >
      <header className="climate-history-chart__panel-header">
        <div className="climate-history-chart__panel-heading">
          <span className="climate-history-chart__metric-dot" aria-hidden="true" />
          <span className="climate-history-chart__panel-label">{metricLabel}</span>
          <strong>{currentValue}</strong>
        </div>
        <span className="climate-history-chart__range">{rangeValue}</span>
      </header>

      <div className="climate-history-chart__panel-plot">
        <ResponsiveLine<HistoryChartSeries>
          data={data}
          margin={PANEL_MARGIN}
          xScale={{ type: 'linear', min: 'auto', max: 'auto' }}
          yScale={{
            type: 'linear',
            min: yDomain[0],
            max: yDomain[1],
            stacked: false,
            reverse: false
          }}
          axisTop={null}
          axisRight={null}
          axisBottom={null}
          axisLeft={{
            tickValues: yTicks,
            format: (value) =>
              output
                ? Number(value) >= 0.5
                  ? onLabel
                  : offLabel
                : formatY(Number(value)),
            tickSize: 0,
            tickPadding: 8
          }}
          colors={[output ? 'transparent' : metric.color]}
          curve={output ? 'linear' : 'monotoneX'}
          lineWidth={output ? 0 : 2.5}
          enablePoints={false}
          enableGridX
          gridXValues={xTicks}
          enableGridY
          gridYValues={yTicks}
          enableArea={!output}
          areaBaselineValue={output ? 0 : yDomain[0]}
          areaOpacity={0.11}
          enableSlices={false}
          enableCrosshair={false}
          useMesh={false}
          isInteractive={false}
          animate={false}
          theme={PANEL_THEME}
          layers={
            output
              ? ['grid', 'axes', outputTrackLayer, latestLayer]
              : ['grid', 'axes', 'areas', 'lines', latestLayer]
          }
          role="img"
          ariaLabel={`${metricLabel} history`}
        />
      </div>
    </section>
  );
};
