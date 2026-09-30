import type { HistoryRecord } from '@lcl/automation-core';

export type HistoryAxisMode = 'timestamp' | 'uptime' | 'sequence';

type HistoryAxisRecord = Pick<HistoryRecord, 'timestampUnixSec' | 'uptimeSec'>;

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

export const historyTickIndexes = (count: number): readonly number[] => {
  if (count <= 4) return Array.from({ length: count }, (_, index) => index);

  return Array.from(
    new Set([
      0,
      Math.round((count - 1) / 3),
      Math.round(((count - 1) * 2) / 3),
      count - 1
    ])
  );
};

export const formatHistoryUptime = (uptimeSec: number): string => {
  const hours = Math.floor(uptimeSec / 3600);
  const minutes = Math.floor((uptimeSec % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${uptimeSec}s`;
};
