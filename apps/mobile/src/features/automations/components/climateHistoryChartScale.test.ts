import { describe, expect, it } from 'vitest';
import {
  historyMetricDomain,
  normalizeHistoryMetricValue
} from './climateHistoryChartScale.js';

describe('climateHistoryChartScale', () => {
  it('keeps tiny temperature movement visually small', () => {
    const domain = historyMetricDomain('temperature', [24.64, 24.7]);
    expect(domain[1] - domain[0]).toBeCloseTo(2);

    const low = normalizeHistoryMetricValue(24.64, domain);
    const high = normalizeHistoryMetricValue(24.7, domain);
    expect(high - low).toBeLessThan(0.03);
  });

  it('keeps tiny humidity movement visually small and inside physical bounds', () => {
    const domain = historyMetricDomain('humidity', [37.44, 37.48]);
    expect(domain[1] - domain[0]).toBeCloseTo(10);
    expect(domain[0]).toBeGreaterThanOrEqual(0);
    expect(domain[1]).toBeLessThanOrEqual(100);
  });

  it('uses a meaningful minimum VPD span', () => {
    const domain = historyMetricDomain('vpd', [1.1, 1.12]);
    expect(domain[1] - domain[0]).toBeCloseTo(0.5);
    expect(domain[0]).toBeGreaterThanOrEqual(0);
  });

  it('anchors power and current at zero without amplifying near-zero values', () => {
    expect(historyMetricDomain('power', [0, 16.2])).toEqual([0, 25]);
    expect(historyMetricDomain('current', [0, 0.11])).toEqual([0, 0.25]);
    expect(historyMetricDomain('power', [0, 0.01])).toEqual([0, 25]);
  });
});
