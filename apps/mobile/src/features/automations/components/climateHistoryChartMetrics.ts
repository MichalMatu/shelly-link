import type { HistoryRecord } from '@lcl/automation-core';
import type { HistoryContinuousMetricId } from './climateHistoryChartScale.js';

export type HistoryMetricId = HistoryContinuousMetricId | 'output';

export type HistoryMetricDefinition = {
  id: HistoryMetricId;
  unit: string;
  color: string;
  read(record: HistoryRecord): number | null;
};

export type HistoryContinuousMetricDefinition = HistoryMetricDefinition & {
  id: HistoryContinuousMetricId;
};

export type HistoryChartDatum = {
  x: number;
  y: number | null;
  recordIndex: number;
};

export type HistoryChartSeries = {
  id: HistoryMetricId;
  data: readonly HistoryChartDatum[];
};

export const CONTINUOUS_HISTORY_METRICS: readonly HistoryContinuousMetricDefinition[] = [
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

export const OUTPUT_HISTORY_METRIC: HistoryMetricDefinition = {
  id: 'output',
  unit: '',
  color: 'var(--history-color-output)',
  read: (record) => (record.finalRelayOn ? 1 : 0)
};

export const HISTORY_METRICS: readonly HistoryMetricDefinition[] = [
  CONTINUOUS_HISTORY_METRICS[0]!,
  CONTINUOUS_HISTORY_METRICS[1]!,
  CONTINUOUS_HISTORY_METRICS[2]!,
  OUTPUT_HISTORY_METRIC,
  CONTINUOUS_HISTORY_METRICS[3]!,
  CONTINUOUS_HISTORY_METRICS[4]!
];

export const latestHistoryMetricValue = (
  records: readonly HistoryRecord[],
  metric: HistoryMetricDefinition
): number | null => {
  for (let index = records.length - 1; index >= 0; index -= 1) {
    const value = metric.read(records[index]!);
    if (value !== null) return value;
  }
  return null;
};

export const historyMetricValues = (
  records: readonly HistoryRecord[],
  metric: HistoryContinuousMetricDefinition
): readonly number[] =>
  records.flatMap((record) => {
    const value = metric.read(record);
    return value === null ? [] : [value];
  });
