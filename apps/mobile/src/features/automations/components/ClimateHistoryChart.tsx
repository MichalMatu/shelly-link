import type { HistoryRecord } from '@lcl/automation-core';
import { ResponsiveLine } from '@nivo/line';
import { useMemo, useRef, useState } from 'react';
import {
  formatHistoryUptime,
  historyDomainTicks,
  historyXValueFor,
  resolveHistoryAxisMode
} from './climateHistoryChartAxis.js';
import { ClimateHistoryChartLegend } from './ClimateHistoryChartLegend.js';
import {
  CONTINUOUS_HISTORY_METRICS,
  HISTORY_METRICS,
  historyMetricValues,
  latestHistoryMetricValue,
  type HistoryChartSeries,
  type HistoryMetricDefinition,
  type HistoryMetricId
} from './climateHistoryChartMetrics.js';
import { createClimateHistoryOutputTrack } from './ClimateHistoryOutputTrack.js';
import {
  createClimateHistorySelectionCrosshair,
  historyRecordIndexFromInteraction,
  historySelectionSide
} from './ClimateHistorySelectionLayer.js';
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

const CHART_MARGIN = { top: 8, right: 8, bottom: 36, left: 8 } as const;
const OUTPUT_INTERACTION_Y = 0.08;
const TIMESTAMP_CLOCK_THRESHOLD_SEC = 36 * 60 * 60;
const TOUCH_CLICK_DEDUPE_MS = 500;

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
  tooltip: {
    container: {
      background: 'transparent',
      boxShadow: 'none',
      padding: 0
    }
  }
} as const;

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
  const [hiddenMetricIds, setHiddenMetricIds] = useState<ReadonlySet<HistoryMetricId>>(
    () => new Set()
  );
  const [selectedRecordIndex, setSelectedRecordIndex] = useState<number | null>(null);
  const lastTouchSelectionAtMs = useRef(0);
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

  const availableMetrics = HISTORY_METRICS.filter((metric) =>
    records.some((record) => metric.read(record) !== null)
  );
  const availableContinuousMetrics = CONTINUOUS_HISTORY_METRICS.filter((metric) =>
    availableMetrics.some((available) => available.id === metric.id)
  );
  const visibleMetrics = availableMetrics.filter(
    (metric) => !hiddenMetricIds.has(metric.id)
  );
  const visibleContinuousMetrics = availableContinuousMetrics.filter(
    (metric) => !hiddenMetricIds.has(metric.id)
  );
  const outputVisible =
    availableMetrics.some((metric) => metric.id === 'output') &&
    !hiddenMetricIds.has('output');

  const axisMode = resolveHistoryAxisMode(records);
  const xValues = records.map((record, index) =>
    historyXValueFor(record, index, axisMode)
  );
  const ticks = historyDomainTicks(xValues, axisMode);
  const xStart = xValues.length > 0 ? Math.min(...xValues) : 0;
  const xEnd = xValues.length > 0 ? Math.max(...xValues) : xStart;
  const xSpan = xEnd - xStart;

  const domains = useMemo(() => {
    const next = new Map<HistoryContinuousMetricId, HistoryMetricDomain>();
    for (const metric of availableContinuousMetrics) {
      next.set(
        metric.id,
        historyMetricDomain(metric.id, historyMetricValues(records, metric))
      );
    }
    return next;
  }, [availableContinuousMetrics, records]);

  const formatMetric = (metric: HistoryMetricDefinition, value: number): string => {
    if (metric.id === 'output') return value >= 0.5 ? labels.on : labels.off;
    return `${number.format(value)} ${metric.unit}`;
  };

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

  const formatRecordTime = (record: HistoryRecord): string =>
    record.timestampUnixSec === null
      ? `${labels.uptime} ${formatHistoryUptime(record.uptimeSec)}`
      : fullDateTime.format(new Date(record.timestampUnixSec * 1000));

  const chartData: readonly HistoryChartSeries[] = [
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

  const toggleMetric = (metricId: HistoryMetricId) => {
    setHiddenMetricIds((current) => {
      const next = new Set(current);
      if (next.has(metricId)) next.delete(metricId);
      else next.add(metricId);
      return next;
    });
  };

  const toggleSelectedDatum = (datum: unknown) => {
    const recordIndex = historyRecordIndexFromInteraction(datum);
    if (recordIndex === null) return;
    setSelectedRecordIndex((current) =>
      current === recordIndex ? null : recordIndex
    );
  };

  const legendItems = availableMetrics.map((metric) => {
    const latest = latestHistoryMetricValue(records, metric)!;
    return {
      id: metric.id,
      label: labels[metric.id],
      value: formatMetric(metric, latest),
      visible: !hiddenMetricIds.has(metric.id)
    };
  });
  const outputTrackLayer = createClimateHistoryOutputTrack(
    records,
    xValues,
    outputVisible
  );
  const selectedRecord =
    selectedRecordIndex === null ? null : (records[selectedRecordIndex] ?? null);
  const selectedSide = historySelectionSide(xValues, selectedRecordIndex, xStart, xSpan);
  const selectedCrosshairLayer = createClimateHistorySelectionCrosshair(
    xValues,
    selectedRecordIndex
  );

  return (
    <div className="climate-history-chart">
      <ClimateHistoryChartLegend
        title={labels.title}
        items={legendItems}
        onToggle={toggleMetric}
      />

      <div className="climate-history-chart__plot">
        <ResponsiveLine<HistoryChartSeries>
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
          enableCrosshair={false}
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
            selectedCrosshairLayer,
            'slices'
          ]}
          role="img"
          ariaLabel={labels.title}
          sliceTooltip={() => null}
          onTouchEnd={(datum) => {
            lastTouchSelectionAtMs.current = Date.now();
            toggleSelectedDatum(datum);
          }}
          onClick={(datum) => {
            if (Date.now() - lastTouchSelectionAtMs.current < TOUCH_CLICK_DEDUPE_MS) return;
            toggleSelectedDatum(datum);
          }}
        />
        {selectedRecord && (
          <div
            className="climate-history-chart__tooltip-overlay"
            data-side={selectedSide}
          >
            <div className="climate-history-chart__tooltip">
              <span className="climate-history-chart__tooltip-time">
                {formatRecordTime(selectedRecord)}
              </span>
              {visibleMetrics.map((metric) => {
                const metricValue = metric.read(selectedRecord);
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
                {selectedRecord.controlMode === 'manual'
                  ? labels.manual
                  : labels.automatic}{' '}
                · {selectedRecord.finalRelayOn ? labels.on : labels.off}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
