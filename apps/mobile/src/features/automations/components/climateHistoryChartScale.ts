export type HistoryContinuousMetricId =
  'temperature' | 'humidity' | 'vpd' | 'power' | 'current';

export type HistoryMetricDomain = readonly [min: number, max: number];

type MetricScalePolicy = {
  minimumSpan: number;
  paddingRatio: number;
  tickStep: number;
  baselineZero?: boolean;
  clampMin?: number;
  clampMax?: number;
};

const SCALE_POLICIES: Record<HistoryContinuousMetricId, MetricScalePolicy> = {
  temperature: { minimumSpan: 4, paddingRatio: 0.1, tickStep: 1 },
  humidity: {
    minimumSpan: 20,
    paddingRatio: 0.1,
    tickStep: 5,
    clampMin: 0,
    clampMax: 100
  },
  vpd: { minimumSpan: 0.5, paddingRatio: 0.1, tickStep: 0.1, clampMin: 0 },
  power: {
    minimumSpan: 50,
    paddingRatio: 0.04,
    tickStep: 10,
    baselineZero: true,
    clampMin: 0
  },
  current: {
    minimumSpan: 0.6,
    paddingRatio: 0.04,
    tickStep: 0.1,
    baselineZero: true,
    clampMin: 0
  }
};

const finiteValues = (values: readonly number[]): readonly number[] =>
  values.filter((value) => Number.isFinite(value));

const cleanNumber = (value: number): number => Number(value.toFixed(6));

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

  return [cleanNumber(min), cleanNumber(max)];
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
    const targetMax = Math.max(
      policy.minimumSpan,
      Math.max(0, rawMax) * (1 + policy.paddingRatio)
    );
    const max = Math.ceil(targetMax / policy.tickStep) * policy.tickStep;
    return clampDomainPreservingSpan([0, max], policy.clampMin, policy.clampMax);
  }

  const rawSpan = rawMax - rawMin;
  const targetSpan = Math.max(
    policy.minimumSpan,
    rawSpan * (1 + policy.paddingRatio * 2)
  );
  const pairStep = policy.tickStep * 2;
  const span = Math.ceil(targetSpan / pairStep) * pairStep;
  const rawCenter = (rawMin + rawMax) / 2;
  const center = Math.round(rawCenter / policy.tickStep) * policy.tickStep;

  return clampDomainPreservingSpan(
    [center - span / 2, center + span / 2],
    policy.clampMin,
    policy.clampMax
  );
};
