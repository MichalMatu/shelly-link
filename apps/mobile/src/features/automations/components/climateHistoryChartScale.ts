export type HistoryContinuousMetricId =
  | 'temperature'
  | 'humidity'
  | 'vpd'
  | 'power'
  | 'current';

export type HistoryMetricDomain = readonly [min: number, max: number];

type MetricScalePolicy = {
  minimumSpan: number;
  paddingRatio: number;
  baselineZero?: boolean;
  clampMin?: number;
  clampMax?: number;
};

const SCALE_POLICIES: Record<HistoryContinuousMetricId, MetricScalePolicy> = {
  temperature: { minimumSpan: 2, paddingRatio: 0.1 },
  humidity: { minimumSpan: 10, paddingRatio: 0.1, clampMin: 0, clampMax: 100 },
  vpd: { minimumSpan: 0.5, paddingRatio: 0.1, clampMin: 0 },
  power: { minimumSpan: 25, paddingRatio: 0.12, baselineZero: true, clampMin: 0 },
  current: { minimumSpan: 0.25, paddingRatio: 0.12, baselineZero: true, clampMin: 0 }
};

export const HISTORY_CONTINUOUS_VISUAL_MIN = 0.18;
export const HISTORY_CONTINUOUS_VISUAL_MAX = 0.94;

const finiteValues = (values: readonly number[]): readonly number[] =>
  values.filter((value) => Number.isFinite(value));

const clampDomainPreservingSpan = (
  domain: HistoryMetricDomain,
  clampMin: number | undefined,
  clampMax: number | undefined
): HistoryMetricDomain => {
  let [min, max] = domain;
  const span = max - min;

  if (clampMin !== undefined && min < clampMin) {
    min = clampMin;
    max = min + span;
  }
  if (clampMax !== undefined && max > clampMax) {
    max = clampMax;
    min = max - span;
  }

  if (clampMin !== undefined) min = Math.max(clampMin, min);
  if (clampMax !== undefined) max = Math.min(clampMax, max);

  return [min, max];
};

export const historyMetricDomain = (
  metricId: HistoryContinuousMetricId,
  values: readonly number[]
): HistoryMetricDomain => {
  const policy = SCALE_POLICIES[metricId];
  const usableValues = finiteValues(values);

  if (usableValues.length === 0) {
    return policy.baselineZero
      ? [0, policy.minimumSpan]
      : clampDomainPreservingSpan(
          [-policy.minimumSpan / 2, policy.minimumSpan / 2],
          policy.clampMin,
          policy.clampMax
        );
  }

  const rawMin = Math.min(...usableValues);
  const rawMax = Math.max(...usableValues);

  if (policy.baselineZero) {
    const paddedMax = Math.max(0, rawMax) * (1 + policy.paddingRatio);
    return [0, Math.max(policy.minimumSpan, paddedMax)];
  }

  const rawSpan = rawMax - rawMin;
  const span = Math.max(policy.minimumSpan, rawSpan * (1 + policy.paddingRatio * 2));
  const center = (rawMin + rawMax) / 2;

  return clampDomainPreservingSpan(
    [center - span / 2, center + span / 2],
    policy.clampMin,
    policy.clampMax
  );
};

export const normalizeHistoryMetricValue = (
  value: number,
  domain: HistoryMetricDomain
): number => {
  const [min, max] = domain;
  const span = max - min;
  if (!Number.isFinite(value) || span <= 0) return HISTORY_CONTINUOUS_VISUAL_MIN;

  const ratio = Math.min(1, Math.max(0, (value - min) / span));
  return (
    HISTORY_CONTINUOUS_VISUAL_MIN +
    ratio * (HISTORY_CONTINUOUS_VISUAL_MAX - HISTORY_CONTINUOUS_VISUAL_MIN)
  );
};
