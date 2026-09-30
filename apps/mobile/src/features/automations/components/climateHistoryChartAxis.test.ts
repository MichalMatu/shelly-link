import { describe, expect, it } from 'vitest';
import {
  formatHistoryUptime,
  historyTickIndexes,
  historyXValueFor,
  resolveHistoryAxisMode
} from './climateHistoryChartAxis.js';

const point = (timestampUnixSec: number | null, uptimeSec: number) => ({
  timestampUnixSec,
  uptimeSec
});

describe('climateHistoryChartAxis', () => {
  it('uses real timestamps when every record has one', () => {
    const records = [point(100, 10), point(160, 70)];
    expect(resolveHistoryAxisMode(records)).toBe('timestamp');
    expect(historyXValueFor(records[1]!, 1, 'timestamp')).toBe(160);
  });

  it('uses monotonic uptime when timestamps are incomplete', () => {
    const records = [point(null, 10), point(160, 70)];
    expect(resolveHistoryAxisMode(records)).toBe('uptime');
    expect(historyXValueFor(records[1]!, 1, 'uptime')).toBe(70);
  });

  it('falls back to record order when uptime resets', () => {
    const records = [point(null, 70), point(null, 10)];
    expect(resolveHistoryAxisMode(records)).toBe('sequence');
    expect(historyXValueFor(records[1]!, 1, 'sequence')).toBe(1);
  });

  it('keeps ticks sparse and formats uptime compactly', () => {
    expect(historyTickIndexes(5)).toEqual([0, 1, 3, 4]);
    expect(formatHistoryUptime(45)).toBe('45s');
    expect(formatHistoryUptime(125)).toBe('2m');
    expect(formatHistoryUptime(7_380)).toBe('2h 3m');
  });
});
