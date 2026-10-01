import type { HistoryRecord } from '@lcl/automation-core';
import { ResponsiveLine } from '@nivo/line';
import type { HistoryChartSeries, HistoryMetricDefinition } from './climateHistoryChartMetrics.js';
import { createClimateHistoryOutputTrack } from './ClimateHistoryOutputTrack.js';
import type { HistoryMetricDomain } from './climateHistoryChartScale.js';

const PANEL_MARGIN_WITH_TIME = { top: 8, right: 12, bottom: 34, left: 42 } as const;
const PANEL_MARGIN = { top: 8, right: 12, bottom: 10, left: 42 } as const;

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
  records: readonly HistoryRecord[];
  xValues: readonly number[];
  xTicks: readonly number[];
  domain: HistoryMetricDomain | null;
  currentValue: string;
  rangeValue: string;
  formatX(value: number): string;
  formatY(value: number): string;
  showTimeAxis: boolean;
  onLabel: string;
  offLabel: string;
};

export const ClimateHistoryMetricPanel = ({
  metric,
  records,
  xValues,
  xTicks,
  domain,
  currentValue,
  rangeValue,
  formatX,
  formatY,
  showTimeAxis,
  onLabel,
  offLabel
}: ClimateHistoryMetricPanelProps) => {
  const output = metric.id === 'output';
  const yDomain: HistoryMetricDomain = output ? [0, 1] : (domain ?? [0, 1]);
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

  return (
    <section
      className="climate-history-chart__panel"
      data-metric={metric.id}
      aria-label={`${metric.id}: ${currentValue}`}
    >
      <header className="climate-history-chart__panel-header">
        <div className="climate-history-chart__panel-heading">
          <span className="climate-history-chart__metric-dot" aria-hidden="true" />
          <span className="climate-history-chart__panel-label">{metric.id}</span>
          <strong>{currentValue}</strong>
        </div>
        <span className="climate-history-chart__range">{rangeValue}</span>
      </header>

      <div className="climate-history-chart__panel-plot">
        <ResponsiveLine<HistoryChartSeries>
          data={data}
          margin={showTimeAxis ? PANEL_MARGIN_WITH_TIME : PANEL_MARGIN}
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
          axisBottom={
            showTimeAxis
              ? {
                  tickValues: xTicks,
                  format: (value) => formatX(Number(value)),
                  tickSize: 0,
                  tickPadding: 10
                }
              : null
          }
          axisLeft={{
            tickValues: yTicks,
            format: (value) =>
              output ? (Number(value) >= 0.5 ? onLabel : offLabel) : formatY(Number(value)),
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
          areaOpacity={0.1}
          enableSlices={false}
          enableCrosshair={false}
          useMesh={false}
          isInteractive={false}
          animate={false}
          theme={PANEL_THEME}
          layers={
            output
              ? ['grid', 'axes', outputTrackLayer]
              : ['grid', 'axes', 'areas', 'lines']
          }
          role="img"
          ariaLabel={`${metric.id} history`}
        />
      </div>
    </section>
  );
};
