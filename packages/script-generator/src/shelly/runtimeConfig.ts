import {
  PULSE_MAX_CYCLES,
  PULSE_MAX_DURATION_MS,
  PULSE_MAX_INITIAL_DELAY_MS,
  PULSE_MAX_PHASE_MS,
  PULSE_MIN_DURATION_MS,
  PULSE_MIN_PHASE_MS
} from '@lcl/automation-core';
import { z } from 'zod';
import {
  climateSensorAggregationForConfig,
  climateSensorsForConfig,
  MAX_CLIMATE_SENSORS,
  type ClimateExecution,
  type ClimateSensor,
  type ClimateSensorAggregation,
  type ShellyThermostatConfig
} from './config.js';
import { configHash, stableStringify } from './hash.js';

export const SHELLY_RUNTIME_CONFIG_STORAGE_KEY = 'c';

const runtimeSensorSchema = z.tuple([
  z.string().min(1),
  z.string().min(1),
  z.union([z.literal(0), z.literal(1)])
]);

const runtimeAggregationSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3)
]);

const runtimePulseSchema = z
  .tuple([
    z.number().int().min(PULSE_MIN_PHASE_MS).max(PULSE_MAX_PHASE_MS),
    z.number().int().min(PULSE_MIN_PHASE_MS).max(PULSE_MAX_PHASE_MS),
    z.number().int().min(0).max(PULSE_MAX_INITIAL_DELAY_MS),
    z.union([z.literal(0), z.literal(1)]),
    z.number().int().min(-PULSE_MAX_DURATION_MS).max(PULSE_MAX_CYCLES)
  ])
  .superRefine((pulse, context) => {
    const limit = pulse[4];
    const valid =
      limit === 0 ||
      (limit >= 1 && limit <= PULSE_MAX_CYCLES) ||
      (limit <= -PULSE_MIN_DURATION_MS && limit >= -PULSE_MAX_DURATION_MS);
    if (!valid) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [4],
        message: 'Pulse runtime execution limit is invalid.'
      });
    }
  });

const runtimeActiveWindowSchema = z
  .tuple([
    z.number().int().min(0).max(1_439),
    z.number().int().min(0).max(1_439)
  ])
  .refine((window) => window[0] !== window[1], {
    message: 'Runtime active-window endpoints must differ.'
  });

export const shellyRuntimeConfigSchema = z
  .object({
    a: z.string().min(1),
    fa: z.string().min(1),
    n: z.string().min(1),
    k: z.string().min(1),
    i: z.number().int().min(0),
    r: z.number().int().min(-100).max(-20),
    on: z.number(),
    off: z.number(),
    d: z.union([z.literal(0), z.literal(1)]),
    m: z.union([z.literal(0), z.literal(1)]),
    h: z.number().int().min(1).max(10),
    c: z.number().int().positive(),
    u: z.number().int().nonnegative().optional(),
    y: z.number().int().nonnegative().optional(),
    z: z.number().int().nonnegative().optional(),
    s: z.number().int().positive(),
    x: z.number().int().positive(),
    v: z.number().int().positive(),
    vp: z.number().min(0).max(5),
    p: z.union([z.literal(0), z.literal(1)]).optional(),
    ss: z.array(runtimeSensorSchema).min(2).max(MAX_CLIMATE_SENSORS).optional(),
    ag: runtimeAggregationSchema.optional(),
    e: runtimePulseSchema.optional(),
    w: runtimeActiveWindowSchema.optional()
  })
  .superRefine((config, context) => {
    if ((config.ss === undefined) !== (config.ag === undefined)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: config.ss === undefined ? ['ss'] : ['ag'],
        message: 'Multi-sensor runtime config requires both ss and ag.'
      });
    }
  });

export type ShellyRuntimeConfig = z.infer<typeof shellyRuntimeConfigSchema>;
export type ShellyRuntimeSensor = z.infer<typeof runtimeSensorSchema>;
export type ShellyRuntimeAggregation = z.infer<typeof runtimeAggregationSchema>;
export type ShellyRuntimePulse = z.infer<typeof runtimePulseSchema>;
export type ShellyRuntimeActiveWindow = z.infer<typeof runtimeActiveWindowSchema>;

const compactAddress = (address: string): string =>
  address.replace(/[:-]/g, '').toUpperCase();

const sensorProfileFlag = (
  profileId: ShellyThermostatConfig['sensor']['profileId']
): 0 | 1 => (profileId === 'tp357_custom_v1' ? 1 : 0);

const runtimeSensorForConfig = (sensor: ClimateSensor): ShellyRuntimeSensor => [
  compactAddress(sensor.runtimeAddress),
  sensor.displayName,
  sensorProfileFlag(sensor.profileId)
];

const aggregationFlag = (
  aggregation: ClimateSensorAggregation
): ShellyRuntimeAggregation => {
  switch (aggregation) {
    case 'avg':
      return 0;
    case 'min':
      return 1;
    case 'max':
      return 2;
    case 'firstValid':
      return 3;
  }
};

export const runtimeAggregationFromFlag = (
  aggregation: ShellyRuntimeAggregation
): ClimateSensorAggregation => {
  switch (aggregation) {
    case 0:
      return 'avg';
    case 1:
      return 'min';
    case 2:
      return 'max';
    case 3:
      return 'firstValid';
  }
};

const runtimePulseForExecution = (
  pulse: NonNullable<ClimateExecution['pulse']>
): ShellyRuntimePulse => [
  pulse.onMs,
  pulse.offMs,
  pulse.initialDelayMs,
  pulse.startPhase === 'off' ? 1 : 0,
  pulse.execution.mode === 'continuous'
    ? 0
    : pulse.execution.mode === 'cycles'
      ? pulse.execution.count
      : -pulse.execution.durationMs
];

const clockTimeToMinute = (value: string): number => {
  const [hour, minute] = value.split(':').map(Number);
  return hour! * 60 + minute!;
};

const minuteToClockTime = (value: number): string =>
  `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;

export const climateExecutionFromRuntimeConfig = (
  config: ShellyRuntimeConfig
): ClimateExecution | undefined => {
  const pulse = config.e
    ? {
        onMs: config.e[0],
        offMs: config.e[1],
        initialDelayMs: config.e[2],
        startPhase: config.e[3] === 1 ? ('off' as const) : ('on' as const),
        execution:
          config.e[4] === 0
            ? ({ mode: 'continuous' } as const)
            : config.e[4] > 0
              ? ({ mode: 'cycles', count: config.e[4] } as const)
              : ({ mode: 'duration', durationMs: -config.e[4] } as const)
      }
    : undefined;
  const activeWindow = config.w
    ? {
        startTime: minuteToClockTime(config.w[0]),
        endTime: minuteToClockTime(config.w[1])
      }
    : undefined;

  return pulse || activeWindow
    ? { ...(pulse ? { pulse } : {}), ...(activeWindow ? { activeWindow } : {}) }
    : undefined;
};

export const createShellyRuntimeConfig = (
  config: ShellyThermostatConfig,
  hash: string
): ShellyRuntimeConfig => {
  const sensors = climateSensorsForConfig(config);
  const primaryRuntimeSensor = runtimeSensorForConfig(config.sensor);
  const multiSensorRuntime =
    sensors.length > 1
      ? {
          ss: sensors.map(runtimeSensorForConfig),
          ag: aggregationFlag(climateSensorAggregationForConfig(config))
        }
      : {};
  const debounce = config.rule.relayDebounce;
  const pulse = config.execution?.pulse;
  const activeWindow = config.execution?.activeWindow;

  return {
    a: primaryRuntimeSensor[0],
    fa: config.sensor.runtimeAddress,
    n: primaryRuntimeSensor[1],
    k: hash,
    i: config.output.relayId,
    r: config.rule.rssiMin,
    on: config.rule.control.onThreshold,
    off: config.rule.control.offThreshold,
    d: config.rule.control.direction === 'above' ? 1 : 0,
    m: config.rule.control.metric === 'humidity' ? 1 : 0,
    h: config.rule.consecutiveHits,
    c: config.rule.minChangeMs,
    ...(config.rule.minimumOnMs ? { u: config.rule.minimumOnMs } : {}),
    ...(debounce?.turnOnMs ? { y: debounce.turnOnMs } : {}),
    ...(debounce?.turnOffMs ? { z: debounce.turnOffMs } : {}),
    s: config.rule.staleTimeoutSec * 1000,
    x: config.rule.maxOnMs,
    v: config.version,
    vp: config.rule.vpdAssist.enabled ? config.rule.vpdAssist.targetKpa : 0,
    p: primaryRuntimeSensor[2],
    ...multiSensorRuntime,
    ...(pulse ? { e: runtimePulseForExecution(pulse) } : {}),
    ...(activeWindow
      ? {
          w: [
            clockTimeToMinute(activeWindow.startTime),
            clockTimeToMinute(activeWindow.endTime)
          ] as ShellyRuntimeActiveWindow
        }
      : {})
  };
};

export const serializeShellyRuntimeConfig = (config: ShellyThermostatConfig): string =>
  stableStringify(createShellyRuntimeConfig(config, configHash(config)));

export const shellyRuntimeConfigMatchesConfig = (
  runtimeConfig: ShellyRuntimeConfig,
  config: ShellyThermostatConfig
): boolean =>
  stableStringify(runtimeConfig) ===
  stableStringify(createShellyRuntimeConfig(config, runtimeConfig.k));

export const parseShellyRuntimeConfig = (input: unknown): ShellyRuntimeConfig | null => {
  const result = shellyRuntimeConfigSchema.safeParse(input);
  return result.success ? result.data : null;
};

export const decodeShellyRuntimeConfigJson = (
  value: string
): ShellyRuntimeConfig | null => {
  try {
    return parseShellyRuntimeConfig(JSON.parse(value) as unknown);
  } catch {
    return null;
  }
};

export const supportsShellyRuntimeConfigPersistence = (script: string): boolean =>
  script.includes('// m: climate-engine-v1') &&
  script.includes('function vc(c)') &&
  script.includes(`Script.storage.getItem("${SHELLY_RUNTIME_CONFIG_STORAGE_KEY}")`);

const runtimeConfigJsonFromScript = (script: string): unknown | null => {
  const marker = 'var C=';
  const markerStart = script.indexOf(marker);
  if (markerStart < 0) return null;

  const configStart = markerStart + marker.length;
  if (script[configStart] !== '{') return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = configStart; index < script.length; index += 1) {
    const character = script[index]!;
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }

    if (character === '"') {
      inString = true;
      continue;
    }
    if (character === '{') depth += 1;
    if (character === '}') {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(script.slice(configStart, index + 1)) as unknown;
        } catch {
          return null;
        }
      }
    }
  }

  return null;
};

export const decodeShellyRuntimeConfig = (script: string): ShellyRuntimeConfig | null =>
  parseShellyRuntimeConfig(runtimeConfigJsonFromScript(script));
