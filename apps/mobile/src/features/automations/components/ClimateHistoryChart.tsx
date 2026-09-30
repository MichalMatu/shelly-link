import type { HistoryRecord } from '@lcl/automation-core';
import { ResponsiveLine } from '@nivo/line';
import { useMemo, useState } from 'react';
import {
  formatHistoryUptime,
  historyTickIndexes,
  historyXValueFor,
  resolveHistoryAxisMode
} from './climateHistoryChartAxis.js';
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

type MetricId = 'temperature' | 'humidity' | 'vpd' | 'output' | 'power' | 'current';

type MetricDefinition = {
  id: MetricId;
  unit: string;
  color: string;
  read(record: HistoryRecord): number | null;
};

const METRICS: readonly MetricDefinition[] = [
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
    id: 'output',
    unit: '',
    color: 'var(--history-color-output)',
    read: (record) => (record.finalRelayOn ? 1 : 0)
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

const CHART_MARGIN = { top: 12, right: 12, bottom: 40, left: 42 } as const;

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
  const [requestedMetricId, setRequestedMetricId] = useState<MetricId>('temperature');
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
  const activeMetric =
    availableMetrics.find((metric) => metric.id === requestedMetricId) ??
    availableMetrics[0]!;
  const axisMode = resolveHistoryAxisMode(records);
  const xValues = records.map((record, index) =>
    historyXValueFor(record, index, axisMode)
  );
  const ticks = Array.from(
    new Set(historyTickIndexes(records.length).map((index) => xValues[index]!))
  );
  const timestampDays = records
    .filter((record) => record.timestampUnixSec !== null)
    .map((record) => new Date(record.timestampUnixSec! * 1000).toDateString());
  const timestampsShareDay =
    timestampDays.length > 0 && new Set(timestampDays).size === 1;

  const formatMetric = (metric: MetricDefinition, value: number): string => {
    if (metric.id === 'output') return value >= 0.5 ? labels.on : labels.off;
    return `${number.format(value)} ${metric.unit}`;
  };

  const formatAxisX = (value: number): string => {
    if (axisMode === 'timestamp') {
      const date = new Date(value * 1000);
      return timestampsShareDay ? clock.format(date) : day.format(date);
    }
    if (axisMode === 'uptime') return formatHistoryUptime(value);

    const record = records[Math.round(value)];
    if (!record) return '';
    if (record.timestampUnixSec !== null) {
      const date = new Date(record.timestampUnixSec * 1000);
      return timestampsShareDay ? clock.format(date) : day.format(date);
    }
    return formatHistoryUptime(record.uptimeSec);
  };

  const chartData = [
    {
      id: labels[activeMetric.id],
      data: records.map((record, index) => ({
        x: xValues[index]!,
        y: activeMetric.read(record),
        recordIndex: index
      }))
    }
  ];

  return (
    <div className="climate-history-chart" data-active-metric={activeMetric.id}>
      <div
        className="climate-history-chart__metrics"
        role="group"
        aria-label={labels.title}
      >
        {availableMetrics.map((metric) => {
          const latest = latestMetricValue(records, metric)!;
          const value = formatMetric(metric, latest);
          return (
            <button
              className="climate-history-chart__metric"
              data-metric={metric.id}
              type="button"
              aria-label={`${labels[metric.id]}, ${value}`}
              aria-pressed={metric.id === activeMetric.id}
              key={metric.id}
              onClick={() => setRequestedMetricId(metric.id)}
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
        <ResponsiveLine
          data={chartData}
          margin={CHART_MARGIN}
          xScale={{ type: 'linear', min: 'auto', max: 'auto' }}
          yScale={{
            type: 'linear',
            min: activeMetric.id === 'output' ? 0 : 'auto',
            max: activeMetric.id === 'output' ? 1 : 'auto',
            stacked: false,
            reverse: false,
            nice: true
          }}
          xFormat={(value) => formatAxisX(Number(value))}
          yFormat={(value) => formatMetric(activeMetric, Number(value))}
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickValues: ticks,
            format: (value) => formatAxisX(Number(value)),
            tickSize: 0,
            tickPadding: 10
          }}
          axisLeft={{
            tickValues: activeMetric.id === 'output' ? [0, 1] : 4,
            format: (value) =>
              activeMetric.id === 'output'
                ? Number(value) >= 0.5
                  ? labels.on
                  : labels.off
                : number.format(Number(value)),
            tickSize: 0,
            tickPadding: 8
          }}
          colors={[activeMetric.color]}
          curve={activeMetric.id === 'output' ? 'stepAfter' : 'linear'}
          lineWidth={2.5}
          enablePoints={records.length <= 12 || activeMetric.id === 'output'}
          pointSize={6}
          pointColor={{ from: 'series.color' }}
          pointBorderWidth={0}
          enableGridX={false}
          enableGridY
          enableArea={false}
          enableSlices="x"
          enableCrosshair
          crosshairType="x"
          enableTouchCrosshair
          useMesh={false}
          animate={false}
          theme={CHART_THEME}
          role="img"
          ariaLabel={`${labels.title}: ${labels[activeMetric.id]}`}
          sliceTooltip={({ slice }) => {
            const point = slice.points[0];
            if (!point) return null;
            const datum = point.data as typeof point.data & { recordIndex: number };
            const record = records[datum.recordIndex];
            if (!record) return null;

            const time =
              record.timestampUnixSec === null
                ? `${labels.uptime} ${formatHistoryUptime(record.uptimeSec)}`
                : fullDateTime.format(new Date(record.timestampUnixSec * 1000));
            const metricValue = activeMetric.read(record);
            if (metricValue === null) return null;

            return (
              <div className="climate-history-chart__tooltip">
                <span className="climate-history-chart__tooltip-time">{time}</span>
                <div className="climate-history-chart__tooltip-value">
                  <span
                    className="climate-history-chart__metric-dot"
                    aria-hidden="true"
                  />
                  <span>{labels[activeMetric.id]}</span>
                  <strong>{formatMetric(activeMetric, metricValue)}</strong>
                </div>
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
