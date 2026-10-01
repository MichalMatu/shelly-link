import { describe, expect, it } from 'vitest';
import { historyMetricDomain } from './climateHistoryChartScale.js';

describe('climateHistoryChartScale', () => {
  it('keeps tiny temperature movement inside a calm four-degree window', () => {
    expect(historyMetricDomain('temperature', [25.84, 25.91])).toEqual([24, 28]);
  });

  it('keeps humidity movement inside a calm twenty-point window', () => {
    expect(historyMetricDomain('humidity', [67, 71])).toEqual([60, 80]);
    expect(historyMetricDomain('humidity', [1, 2])).toEqual([0, 20]);
    expect(historyMetricDomain('humidity', [98, 99])).toEqual([80, 100]);
  });

  it('keeps a meaningful minimum VPD span for recorded data', () => {
    const domain = historyMetricDomain('vpd', [1.1, 1.12]);
    expect(domain[1] - domain[0]).toBeGreaterThanOrEqual(0.5);
    expect(domain[0]).toBeGreaterThanOrEqual(0);
  });

  it('uses stable zero-based electrical scales', () => {
    expect(historyMetricDomain('power', [0, 16.2])).toEqual([0, 50]);
    expect(historyMetricDomain('power', [0, 48])).toEqual([0, 50]);
    expect(historyMetricDomain('current', [0, 0.11])).toEqual([0, 0.6]);
  });
});
