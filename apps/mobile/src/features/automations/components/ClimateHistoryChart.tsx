import type { HistoryRecord } from '@lcl/automation-core';
import { useMemo } from 'react';
import {
  formatHistoryUptime,
  historyDomainTicks,
  historyXValueFor,
  resolveHistoryAxisMode
} from './climateHistoryChartAxis.js';
import { ClimateHistoryMetricPanel } from './ClimateHistoryMetricPanel.js';
import {
  HISTORY_PANEL_METRICS,
  historyMetricValues,
  latestHistoryMetricValue,
  type HistoryMetricDefinition
} from './climateHistoryChartMetrics.js';
import { historyMetricDomain } from './climateHistoryChartScale.js';
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

const TIMESTAMP_CLOCK_THRESHOLD_SEC = 36 * 60 * 60;

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
  const number = useMemo(
    () => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }),
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

  const axisMode = resolveHistoryAxisMode(records);
  const xValues = records.map((record, index) =>
    historyXValueFor(record, index, axisMode)
  );
  const xTicks = historyDomainTicks(xValues, axisMode);
  const xStart = xValues.length > 0 ? Math.min(...xValues) : 0;
  const xEnd = xValues.length > 0 ? Math.max(...xValues) : xStart;
  const xSpan = xEnd - xStart;

  const formatAxisX = (value: number): string => {
    if (axisMode === 'timestamp') {
      const date = new Date(value * 1000);
      return xSpan <= TIMESTAMP_CLOCK_THRESHOLD_SEC
        ? clock.format(date)
        : day.format(date);
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

  const formatMetricValue = (
    metric: HistoryMetricDefinition,
    value: number | null
  ): string => {
    if (value === null) return '—';
    if (metric.id === 'output') return value >= 0.5 ? labels.on : labels.off;
    return `${number.format(value)} ${metric.unit}`;
  };

  const formatRange = (metric: HistoryMetricDefinition): string => {
    if (metric.id === 'output') return '—';
    const values = historyMetricValues(records, metric);
    if (values.length === 0) return '—';
    const min = Math.min(...values);
    const max = Math.max(...values);
    return `${number.format(min)} – ${number.format(max)} ${metric.unit}`;
  };

  return (
    <div className="climate-history-chart" role="group" aria-label={labels.title}>
      {HISTORY_PANEL_METRICS.map((metric) => {
        const values = historyMetricValues(records, metric);
        const domain =
          metric.id === 'output'
            ? ([0, 1] as const)
            : historyMetricDomain(metric.id, values);
        const latest = latestHistoryMetricValue(records, metric);

        return (
          <ClimateHistoryMetricPanel
            key={metric.id}
            metric={metric}
            metricLabel={labels[metric.id]}
            records={records}
            xValues={xValues}
            xTicks={xTicks}
            domain={domain}
            currentValue={formatMetricValue(metric, latest)}
            rangeValue={formatRange(metric)}
            formatY={(value) => number.format(value)}
            onLabel={labels.on}
            offLabel={labels.off}
          />
        );
      })}

      <div className="climate-history-chart__time-axis" aria-hidden="true">
        {xTicks.map((tick, index) => {
          const position = xSpan <= 0 ? 50 : ((tick - xStart) / xSpan) * 100;
          const edge =
            index === 0 ? 'start' : index === xTicks.length - 1 ? 'end' : 'middle';
          return (
            <span
              key={tick}
              data-edge={edge}
              style={{ left: `${Math.min(100, Math.max(0, position))}%` }}
            >
              {formatAxisX(tick)}
            </span>
          );
        })}
      </div>
    </div>
  );
};
