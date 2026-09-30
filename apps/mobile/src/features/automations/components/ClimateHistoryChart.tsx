import type { HistoryRecord } from '@lcl/automation-core';
import { ResponsiveLine, type LineCustomSvgLayerProps } from '@nivo/line';
import { useMemo, useState } from 'react';
import {
  formatHistoryUptime,
  historyDomainTicks,
  historyXValueFor,
  resolveHistoryAxisMode
} from './climateHistoryChartAxis.js';
import {
  historyMetricDomain,
  normalizeHistoryMetricValue,
  type HistoryContinuousMetricId,
  type HistoryMetricDomain
} from './climateHistoryChartScale.js';
import './ClimateHistoryChart.css';

export type ClimateHistoryChartLabels = {
  title: string;
  uptime: string;
  automatic: string;
  manual: string;
  temperature: string;
  humidity: string;
  vpd: string;
  output: string;
  power: string;
  current: string;
  on: string;
  off: string;
};

type MetricId = HistoryContinuousMetricId | 'output';

type MetricDefinition = {
  id: MetricId;
  unit: string;
  color: string;
  read(record: HistoryRecord): number | null;
};

type ContinuousMetricDefinition = MetricDefinition & {
  id: HistoryContinuousMetricId;
};

type ChartDatum = {
  x: number;
  y: number | null;
  recordIndex: number;
};

type ChartSeries = {
  id: MetricId;
  data: readonly ChartDatum[];
};

const CONTINUOUS_METRICS: readonly ContinuousMetricDefinition[] = [
  {
    id: 'temperature',
    unit: '°C',
    color: 'var(--history-color-temperature)',
    read: (record) => record.temperatureC
  },
  {
    id: 'humidity',
    unit: '%',
    color: 'var(--history-color-humidity)',
    read: (record) => record.humidityPct
  },
  {
    id: 'vpd',
    unit: 'kPa',
    color: 'var(--history-color-vpd)',
    read: (record) => record.vpdKpa
  },
  {
    id: 'power',
    unit: 'W',
    color: 'var(--history-color-power)',
    read: (record) => record.powerW
  },
  {
    id: 'current',
    unit: 'A',
    color: 'var(--history-color-current)',
    read: (record) => record.currentA
  }
] as const;

const OUTPUT_METRIC: MetricDefinition = {
  id: 'output',
  unit: '',
  color: 'var(--history-color-output)',
  read: (record) => (record.finalRelayOn ? 1 : 0)
};

const METRICS: readonly MetricDefinition[] = [...CONTINUOUS_METRICS, OUTPUT_METRIC];

const CHART_MARGIN = { top: 8, right: 8, bottom: 36, left: 8 } as const;
const OUTPUT_INTERACTION_Y = 0.08;
const TIMESTAMP_CLOCK_THRESHOLD_SEC = 36 * 60 * 60;

const CHART_THEME = {
  background: 'transparent',
  text: {
    fill: 'var(--lcl-color-text-muted)',
    fontFamily: 'var(--lcl-font-family)',
    fontSize: 12
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
      strokeWidth: 1
    }
  },
  crosshair: {
    line: {
      stroke: 'var(--lcl-color-text-muted)',
      strokeWidth: 1,
      strokeOpacity: 0.55
    }
  },
  tooltip: {
    container: {
      background: 'transparent',
      boxShadow: 'none',
      padding: 0
    }
  }
} as const;

const latestMetricValue = (
  records: readonly HistoryRecord[],
  metric: MetricDefinition
): number | null => {
  for (let index = records.length - 1; index >= 0; index -= 1) {
    const value = metric.read(records[index]!);
    if (value !== null) return value;
  }
  return null;
};

const metricValues = (
  records: readonly HistoryRecord[],
  metric: ContinuousMetricDefinition
): readonly number[] =>
  records.flatMap((record) => {
    const value = metric.read(record);
    return value === null ? [] : [value];
  });

type ClimateHistoryChartProps = {
  records: readonly HistoryRecord[];
  locale: string;
  labels: ClimateHistoryChartLabels;
};

export const ClimateHistoryChart = ({
  records,
  locale,
  labels
}: ClimateHistoryChartProps) => {
  const [hiddenMetricIds, setHiddenMetricIds] = useState<ReadonlySet<MetricId>>(
    () => new Set()
  );
  const number = useMemo(
    () => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }),
    [locale]
  );
  const fullDateTime = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }),
    [locale]
  );
  const clock = useMemo(
    () => new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }),
    [locale]
  );
  const day = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }),
    [locale]
  );

  const availableMetrics = METRICS.filter((metric) =>
    records.some((record) => metric.read(record) !== null)
  );
  const availableContinuousMetrics = CONTINUOUS_METRICS.filter((metric) =>
    availableMetrics.some((available) => available.id === metric.id)
  );
  const visibleMetrics = availableMetrics.filter((metric) => !hiddenMetricIds.has(metric.id));
  const visibleContinuousMetrics = availableContinuousMetrics.filter(
    (metric) => !hiddenMetricIds.has(metric.id)
  );
  const outputVisible =
    availableMetrics.some((metric) => metric.id === 'output') && !hiddenMetricIds.has('output');

  const axisMode = resolveHistoryAxisMode(records);
  const xValues = records.map((record, index) => historyXValueFor(record, index, axisMode));
  const ticks = historyDomainTicks(xValues, axisMode);
  const xStart = xValues.length > 0 ? Math.min(...xValues) : 0;
  const xEnd = xValues.length > 0 ? Math.max(...xValues) : xStart;
  const xSpan = xEnd - xStart;

  const domains = useMemo(() => {
    const next = new Map<HistoryContinuousMetricId, HistoryMetricDomain>();
    for (const metric of availableContinuousMetrics) {
      next.set(metric.id, historyMetricDomain(metric.id, metricValues(records, metric)));
    }
    return next;
  }, [availableContinuousMetrics, records]);

  const formatMetric = (metric: MetricDefinition, value: number): string => {
    if (metric.id === 'output') return value >= 0.5 ? labels.on : labels.off;
    return `${number.format(value)} ${metric.unit}`;
  };

  const formatAxisX = (value: number): string => {
    if (axisMode === 'timestamp') {
      const date = new Date(value * 1000);
      return xSpan <= TIMESTAMP_CLOCK_THRESHOLD_SEC ? clock.format(date) : day.format(date);
    }
    if (axisMode === 'uptime') {
      const elapsed = Math.max(0, value - xStart);
      return elapsed === 0 ? '0s' : `+${formatHistoryUptime(elapsed)}`;
    }

    const record = records[Math.round(value)];
    if (!record) return '';
    if (record.timestampUnixSec !== null) {
      return clock.format(new Date(record.timestampUnixSec * 1000));
    }
    return formatHistoryUptime(record.uptimeSec);
  };

  const chartData: readonly ChartSeries[] = [
    ...visibleContinuousMetrics.map((metric) => {
      const domain = domains.get(metric.id)!;
      return {
        id: metric.id,
        data: records.map((record, index) => {
          const value = metric.read(record);
          return {
            x: xValues[index]!,
            y: value === null ? null : normalizeHistoryMetricValue(value, domain),
            recordIndex: index
          };
        })
      };
    }),
    {
      id: 'output',
      data: records.map((_, index) => ({
        x: xValues[index]!,
        y: OUTPUT_INTERACTION_Y,
        recordIndex: index
      }))
    }
  ];
  const chartColors = [
    ...visibleContinuousMetrics.map((metric) => metric.color),
    'transparent'
  ];

  const toggleMetric = (metricId: MetricId) => {
    setHiddenMetricIds((current) => {
      const next = new Set(current);
      if (next.has(metricId)) next.delete(metricId);
      else next.add(metricId);
      return next;
    });
  };

  const outputTrackLayer = ({
    xScale,
    innerHeight,
    innerWidth
  }: LineCustomSvgLayerProps<ChartSeries>) => {
    if (!outputVisible || records.length === 0) return null;

    const offY = innerHeight - 5;
    const onY = innerHeight - 14;
    const yFor = (record: HistoryRecord) => (record.finalRelayOn ? onY : offY);
    const firstX = xScale(xValues[0]!);
    let path = `M ${firstX} ${yFor(records[0]!)}`;

    for (let index = 1; index < records.length; index += 1) {
      const x = xScale(xValues[index]!);
      path += ` H ${x} V ${yFor(records[index]!)}`;
    }

    return (
      <g aria-hidden="true">
        <line
          className="climate-history-chart__output-baseline"
          x1={0}
          x2={innerWidth}
          y1={offY}
          y2={offY}
        />
        {records.length === 1 ? (
          <circle
            className="climate-history-chart__output-track"
            cx={firstX}
            cy={yFor(records[0]!)}
            r={2.5}
          />
        ) : (
          <path className="climate-history-chart__output-track" d={path} />
        )}
      </g>
    );
  };

  return (
    <div className="climate-history-chart">
      <div
        className="climate-history-chart__metrics"
        role="group"
        aria-label={labels.title}
      >
        {availableMetrics.map((metric) => {
          const latest = latestMetricValue(records, metric)!;
          const value = formatMetric(metric, latest);
          const visible = !hiddenMetricIds.has(metric.id);
          return (
            <button
              className="climate-history-chart__metric"
              data-metric={metric.id}
              type="button"
              aria-label={`${labels[metric.id]}, ${value}`}
              aria-pressed={visible}
              key={metric.id}
              onClick={() => toggleMetric(metric.id)}
            >
              <span className="climate-history-chart__metric-dot" aria-hidden="true" />
              <span className="climate-history-chart__metric-label">
                {labels[metric.id]}
              </span>
              <strong>{value}</strong>
            </button>
          );
        })}
      </div>

      <div className="climate-history-chart__plot">
        <ResponsiveLine<ChartSeries>
          data={chartData}
          margin={CHART_MARGIN}
          xScale={{ type: 'linear', min: 'auto', max: 'auto' }}
          yScale={{ type: 'linear', min: 0, max: 1, stacked: false, reverse: false }}
          xFormat={(value) => formatAxisX(Number(value))}
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickValues: ticks,
            format: (value) => formatAxisX(Number(value)),
            tickSize: 0,
            tickPadding: 10
          }}
          axisLeft={null}
          colors={chartColors}
          curve="linear"
          lineWidth={2.25}
          enablePoints={records.length <= 2}
          pointSize={5}
          pointColor={{ from: 'series.color' }}
          pointBorderWidth={0}
          enableGridX={false}
          enableGridY
          gridYValues={[0.35, 0.6, 0.85]}
          enableArea={false}
          enableSlices="x"
          enableCrosshair
          crosshairType="x"
          enableTouchCrosshair
          useMesh={false}
          animate={false}
          theme={CHART_THEME}
          layers={[
            'grid',
            'markers',
            'axes',
            outputTrackLayer,
            'lines',
            'points',
            'crosshair',
            'slices'
          ]}
          role="img"
          ariaLabel={labels.title}
          sliceTooltip={({ slice }) => {
            const point = slice.points[0];
            if (!point) return null;
            const record = records[point.data.recordIndex];
            if (!record) return null;

            const time =
              record.timestampUnixSec === null
                ? `${labels.uptime} ${formatHistoryUptime(record.uptimeSec)}`
                : fullDateTime.format(new Date(record.timestampUnixSec * 1000));

            return (
              <div className="climate-history-chart__tooltip">
                <span className="climate-history-chart__tooltip-time">{time}</span>
                {visibleMetrics.map((metric) => {
                  const metricValue = metric.read(record);
                  return (
                    <div
                      className="climate-history-chart__tooltip-value"
                      data-metric={metric.id}
                      key={metric.id}
                    >
                      <span
                        className="climate-history-chart__metric-dot"
                        aria-hidden="true"
                      />
                      <span>{labels[metric.id]}</span>
                      <strong>
                        {metricValue === null ? '—' : formatMetric(metric, metricValue)}
                      </strong>
                    </div>
                  );
                })}
                <span className="climate-history-chart__tooltip-state">
                  {record.controlMode === 'manual' ? labels.manual : labels.automatic} ·{' '}
                  {record.finalRelayOn ? labels.on : labels.off}
                </span>
              </div>
            );
          }}
        />
      </div>
    </div>
  );
};
