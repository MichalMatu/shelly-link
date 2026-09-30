import type { HistoryRecord } from '@lcl/automation-core';

export type HistoryAxisMode = 'timestamp' | 'uptime' | 'sequence';

type HistoryAxisRecord = Pick<HistoryRecord, 'timestampUnixSec' | 'uptimeSec'>;

const TIME_STEPS_SEC = [
  1,
  5,
  10,
  15,
  30,
  60,
  120,
  300,
  600,
  900,
  1_800,
  3_600,
  7_200,
  10_800,
  21_600,
  43_200,
  86_400,
  172_800,
  604_800
] as const;

export const resolveHistoryAxisMode = (
  records: readonly HistoryAxisRecord[]
): HistoryAxisMode => {
  if (records.every((record) => record.timestampUnixSec !== null)) return 'timestamp';

  const uptimeMonotonic = records.every(
    (record, index) => index === 0 || record.uptimeSec >= records[index - 1]!.uptimeSec
  );
  return uptimeMonotonic ? 'uptime' : 'sequence';
};

export const historyXValueFor = (
  record: HistoryAxisRecord,
  index: number,
  mode: HistoryAxisMode
): number => {
  if (mode === 'timestamp') return record.timestampUnixSec!;
  if (mode === 'uptime') return record.uptimeSec;
  return index;
};

const sequenceTicks = (min: number, max: number): readonly number[] => {
  if (min === max) return [min];
  const middle = Math.round((min + max) / 2);
  return Array.from(new Set([min, middle, max]));
};

const timeStepFor = (span: number): number => {
  const idealStep = span / 2;
  return TIME_STEPS_SEC.find((step) => step >= idealStep) ?? TIME_STEPS_SEC.at(-1)!;
};

export const historyDomainTicks = (
  values: readonly number[],
  mode: HistoryAxisMode
): readonly number[] => {
  const finite = values.filter((value) => Number.isFinite(value));
  if (finite.length === 0) return [];

  const min = Math.min(...finite);
  const max = Math.max(...finite);
  if (mode === 'sequence') return sequenceTicks(min, max);
  if (min === max) return [min];

  const step = timeStepFor(max - min);
  const firstAligned = Math.ceil(min / step) * step;
  const aligned: number[] = [];
  for (let value = firstAligned; value < max; value += step) {
    if (value > min) aligned.push(value);
  }

  if (aligned.length === 0) return [min, max];
  const midpoint = (min + max) / 2;
  const middle = aligned.reduce((closest, value) =>
    Math.abs(value - midpoint) < Math.abs(closest - midpoint) ? value : closest
  );
  return Array.from(new Set([min, middle, max]));
};

export const formatHistoryUptime = (uptimeSec: number): string => {
  const hours = Math.floor(uptimeSec / 3600);
  const minutes = Math.floor((uptimeSec % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${Math.max(0, Math.round(uptimeSec))}s`;
};
