import type { Measurement } from '@lcl/ble-core';
import type { SensorProfileId } from '@lcl/device-profiles';

export type SavedSensorCardDevice = {
  id: string;
  name: string;
  runtimeAddress: string;
  profileId: SensorProfileId;
};

export const sensorProfileDisplayLabels = {
  xiaomi_lywsd03mmc_bthome_v2: 'BTHome v2',
  tp357_custom_v1: 'TP357'
} as const;

export const formatSensorMetric = (
  value: number | null | undefined,
  suffix = '',
  fractionDigits = 1,
  missingLabel: string
): string =>
  typeof value === 'number' && Number.isFinite(value)
    ? `${value.toFixed(fractionDigits)}${suffix}`
    : missingLabel;

export const formatBattery = (
  sample: Measurement | null,
  missingLabel: string
): string => {
  if (typeof sample?.batteryPct === 'number') {
    return formatSensorMetric(sample.batteryPct, '%', 0, missingLabel);
  }
  if (typeof sample?.voltageV === 'number') {
    return formatSensorMetric(sample.voltageV, ' V', 2, missingLabel);
  }
  return missingLabel;
};

export const formatSeenAt = (
  sample: Measurement | null,
  locale: string,
  missingLabel: string
): string =>
  sample
    ? new Intl.DateTimeFormat(locale, {
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date(sample.seenAtMs))
    : missingLabel;

export const latestSample = (samples: readonly Measurement[]): Measurement | null =>
  samples.at(-1) ?? null;

export const SENSOR_SAMPLE_PULSE_MS = 650;

type NumericSampleMetric = 'temperatureC' | 'humidityPct' | 'rssi';

export const latestNumericSample = (
  samples: readonly Measurement[],
  metric: NumericSampleMetric
): Measurement | null => {
  for (let index = samples.length - 1; index >= 0; index -= 1) {
    const sample = samples[index];
    if (sample && typeof sample[metric] === 'number') {
      return sample;
    }
  }
  return null;
};

export const latestBatterySample = (
  samples: readonly Measurement[]
): Measurement | null => {
  for (let index = samples.length - 1; index >= 0; index -= 1) {
    const sample = samples[index];
    if (
      sample &&
      (typeof sample.batteryPct === 'number' || typeof sample.voltageV === 'number')
    ) {
      return sample;
    }
  }
  return null;
};
