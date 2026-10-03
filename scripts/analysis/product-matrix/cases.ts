import {
  PULSE_MAX_CYCLES,
  PULSE_MAX_DURATION_MS,
  PULSE_MAX_INITIAL_DELAY_MS,
  PULSE_MAX_PHASE_MS,
  PULSE_MIN_DURATION_MS,
  PULSE_MIN_PHASE_MS,
  type PulseCycleConfig,
  type RulePresetId
} from '@lcl/automation-core';
import {
  createDefaultShellyThermostatConfig,
  type ShellyThermostatConfig
} from '@lcl/script-generator';

export const PRODUCT_MATRIX_CASE_SCHEMA = 'shelly-link-product-matrix-case.v1' as const;
export const PRODUCT_MATRIX_DEFAULT_CASES = 1_000;
export const PRODUCT_MATRIX_DEFAULT_SEED = 1_337;

export type ProductMatrixMode = 'valid' | 'invalid' | 'mixed';
export type ProductMatrixExpectation = 'accept' | 'reject';
export type ProductMatrixKind =
  'climate' | 'time-steady' | 'time-pulse' | 'standalone-pulse' | 'pulse-core';

export interface ProductMatrixCase {
  schema: typeof PRODUCT_MATRIX_CASE_SCHEMA;
  name: string;
  caseIndex: number;
  seed: number;
  kind: ProductMatrixKind;
  expectation: ProductMatrixExpectation;
  tags: string[];
  dimensions: Record<string, string | number | boolean>;
  config: unknown;
}

type CaseFactory = (
  caseIndex: number,
  caseSeed: number,
  rng: DeterministicRng,
  variantIndex: number
) => ProductMatrixCase;

type SensorProfileId = ShellyThermostatConfig['sensor']['profileId'];
type Aggregation = NonNullable<ShellyThermostatConfig['sensorSet']>['aggregation'];

const MODES = [
  'heating',
  'cooling',
  'humidifying',
  'dehumidifying'
] as const satisfies readonly RulePresetId[];
const SENSOR_PROFILES = [
  'xiaomi_lywsd03mmc_bthome_v2',
  'tp357_custom_v1'
] as const satisfies readonly SensorProfileId[];
const AGGREGATIONS = [
  'avg',
  'min',
  'max',
  'firstValid'
] as const satisfies readonly Aggregation[];
const DAY_WINDOWS = [
  ['06:00', '18:00'],
  ['08:15', '20:45'],
  ['12:00', '12:30']
] as const;
const OVERNIGHT_WINDOWS = [
  ['22:00', '06:00'],
  ['20:30', '07:15'],
  ['23:59', '00:01']
] as const;
const PULSE_PHASE_VALUES = [
  PULSE_MIN_PHASE_MS,
  2_000,
  10_000,
  60_000,
  PULSE_MAX_PHASE_MS
] as const;
const PULSE_DELAY_VALUES = [0, 1_000, 30_000, PULSE_MAX_INITIAL_DELAY_MS] as const;
const PULSE_CYCLE_VALUES = [1, 2, 7, 100, PULSE_MAX_CYCLES] as const;
const PULSE_DURATION_VALUES = [
  PULSE_MIN_DURATION_MS,
  5_000,
  60_000,
  3_600_000,
  PULSE_MAX_DURATION_MS
] as const;

export class DeterministicRng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  nextUint32(): number {
    let value = (this.state += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    this.state = value >>> 0;
    return (value ^ (value >>> 14)) >>> 0;
  }

  next(): number {
    return this.nextUint32() / 0x1_0000_0000;
  }

  int(minimum: number, maximum: number): number {
    return minimum + Math.floor(this.next() * (maximum - minimum + 1));
  }

  bool(): boolean {
    return (this.nextUint32() & 1) === 1;
  }

  pick<T>(values: readonly T[]): T {
    if (values.length === 0) throw new Error('Cannot pick from an empty list.');
    return values[this.int(0, values.length - 1)]!;
  }
}

const baseCase = (
  caseIndex: number,
  caseSeed: number,
  kind: ProductMatrixKind,
  name: string,
  expectation: ProductMatrixExpectation,
  config: unknown,
  tags: string[],
  dimensions: ProductMatrixCase['dimensions']
): ProductMatrixCase => ({
  schema: PRODUCT_MATRIX_CASE_SCHEMA,
  name,
  caseIndex,
  seed: caseSeed,
  kind,
  expectation,
  tags,
  dimensions,
  config
});

const addressFor = (caseIndex: number, sensorIndex: number): string => {
  const suffix = (caseIndex * 11 + sensorIndex * 37) >>> 0;
  const bytes = [
    0x02,
    0x4c,
    0x43,
    (suffix >>> 16) & 0xff,
    (suffix >>> 8) & 0xff,
    suffix & 0xff
  ];
  return bytes
    .map((value) => value.toString(16).padStart(2, '0'))
    .join(':')
    .toUpperCase();
};

const pulseConfig = (rng: DeterministicRng, variantIndex: number): PulseCycleConfig => {
  const executionModes = ['continuous', 'cycles', 'duration'] as const;
  const startPhases = ['on', 'off'] as const;
  const executionMode = executionModes[variantIndex % executionModes.length]!;
  return {
    onMs: rng.pick(PULSE_PHASE_VALUES),
    offMs: rng.pick(PULSE_PHASE_VALUES),
    initialDelayMs:
      PULSE_DELAY_VALUES[Math.floor(variantIndex / 6) % PULSE_DELAY_VALUES.length]!,
    startPhase: startPhases[Math.floor(variantIndex / 3) % startPhases.length]!,
    execution:
      executionMode === 'continuous'
        ? { mode: 'continuous' }
        : executionMode === 'cycles'
          ? { mode: 'cycles', count: rng.pick(PULSE_CYCLE_VALUES) }
          : { mode: 'duration', durationMs: rng.pick(PULSE_DURATION_VALUES) }
  };
};

const pulseDimensions = (pulse: PulseCycleConfig): ProductMatrixCase['dimensions'] => ({
  pulseMode: pulse.execution.mode,
  startPhase: pulse.startPhase,
  initialDelay: pulse.initialDelayMs === 0 ? 'none' : 'enabled',
  onMs: pulse.onMs,
  offMs: pulse.offMs
});

const timeWindow = (
  rng: DeterministicRng,
  forcedKind?: 'day' | 'overnight'
): { startTime: string; endTime: string; kind: 'day' | 'overnight' } => {
  const kind = forcedKind ?? rng.pick(['day', 'overnight'] as const);
  const [startTime, endTime] = rng.pick(kind === 'day' ? DAY_WINDOWS : OVERNIGHT_WINDOWS);
  return { startTime, endTime, kind };
};

const climateSensors = (
  config: ShellyThermostatConfig,
  caseIndex: number,
  count: number,
  profilePattern: 'xiaomi' | 'tp357' | 'mixed',
  aggregation: Aggregation
): ShellyThermostatConfig => {
  const profileAt = (index: number): SensorProfileId =>
    profilePattern === 'xiaomi'
      ? SENSOR_PROFILES[0]
      : profilePattern === 'tp357'
        ? SENSOR_PROFILES[1]
        : SENSOR_PROFILES[index % SENSOR_PROFILES.length]!;

  const sensors = Array.from({ length: count }, (_, index) => {
    const profileId = profileAt(index);
    return {
      profileId,
      sensorId: `matrix-${caseIndex}-${index}`,
      runtimeAddress: addressFor(caseIndex, index),
      displayName:
        profileId === 'tp357_custom_v1' ? `TP357 ${index + 1}` : `Xiaomi ${index + 1}`,
      parserValidated: true
    };
  });

  return {
    ...config,
    sensor: sensors[0]!,
    ...(count > 1
      ? {
          sensorSet: {
            aggregation,
            additionalSensors: sensors.slice(1)
          }
        }
      : { sensorSet: undefined })
  };
};

const validClimate: CaseFactory = (caseIndex, caseSeed, rng, variantIndex) => {
  const mode = MODES[variantIndex % MODES.length]!;
  const sensorCount = (Math.floor(variantIndex / 2) % 4) + 1;
  const profilePattern = ['xiaomi', 'tp357', 'mixed'][
    Math.floor(variantIndex / 3) % 3
  ] as 'xiaomi' | 'tp357' | 'mixed';
  const aggregation = AGGREGATIONS[Math.floor(variantIndex / 5) % AGGREGATIONS.length]!;
  const vpdEnabled = variantIndex % 2 === 1;
  const executionShape = ['none', 'window', 'pulse', 'pulse-window'][
    Math.floor(variantIndex / 4) % 4
  ] as 'none' | 'window' | 'pulse' | 'pulse-window';

  let config = climateSensors(
    createDefaultShellyThermostatConfig(
      SENSOR_PROFILES[variantIndex % SENSOR_PROFILES.length]!,
      mode
    ),
    caseIndex,
    sensorCount,
    profilePattern,
    aggregation
  );

  const defaultControl = config.rule.control;
  const delta =
    defaultControl.metric === 'temperature'
      ? rng.pick([0.5, 1, 2])
      : rng.pick([2, 5, 10]);
  const center =
    defaultControl.metric === 'temperature'
      ? rng.pick([18, 22, 28])
      : rng.pick([45, 60, 75]);
  const control =
    defaultControl.direction === 'below'
      ? { ...defaultControl, onThreshold: center - delta, offThreshold: center + delta }
      : { ...defaultControl, onThreshold: center + delta, offThreshold: center - delta };

  const execution: ShellyThermostatConfig['execution'] = {};
  let windowKind = 'none';
  if (executionShape === 'window' || executionShape === 'pulse-window') {
    const window = timeWindow(rng, variantIndex % 2 === 0 ? 'day' : 'overnight');
    execution.activeWindow = { startTime: window.startTime, endTime: window.endTime };
    windowKind = window.kind;
  }
  let pulse: PulseCycleConfig | undefined;
  if (executionShape === 'pulse' || executionShape === 'pulse-window') {
    pulse = pulseConfig(rng, variantIndex);
    execution.pulse = pulse;
  }

  config = {
    ...config,
    rule: {
      ...config.rule,
      control,
      vpdAssist: {
        enabled: vpdEnabled,
        targetKpa: rng.pick([0.8, 1.2, 1.6, 2.0])
      },
      staleTimeoutSec: rng.pick([30, 90, 300]),
      minChangeMs: rng.pick([1_000, 30_000, 120_000]),
      ...(rng.bool() ? { minimumOnMs: rng.pick([0, 5_000, 60_000]) } : {}),
      ...(rng.bool()
        ? {
            relayDebounce: {
              turnOnMs: rng.pick([0, 1_000, 5_000]),
              turnOffMs: rng.pick([0, 1_000, 5_000]) || 1_000
            }
          }
        : {}),
      maxOnMs: rng.pick([60_000, 3_600_000, 14_400_000]),
      rssiMin: rng.pick([-90, -80, -70]),
      consecutiveHits: rng.pick([1, 2, 4])
    },
    ...(executionShape === 'none' ? { execution: undefined } : { execution })
  };

  return baseCase(
    caseIndex,
    caseSeed,
    'climate',
    'valid-climate-composition',
    'accept',
    config,
    ['valid', 'climate', mode, profilePattern, executionShape],
    {
      mode,
      sensorCount,
      profilePattern,
      aggregation: sensorCount === 1 ? 'firstValid' : aggregation,
      vpd: vpdEnabled,
      executionShape,
      windowKind,
      ...(pulse ? pulseDimensions(pulse) : { pulseMode: 'none' })
    }
  );
};

const validTimeSteady: CaseFactory = (caseIndex, caseSeed, rng, variantIndex) => {
  const window = timeWindow(rng, variantIndex % 2 === 0 ? 'day' : 'overnight');
  const config = { relayId: 0, onTime: window.startTime, offTime: window.endTime };
  return baseCase(
    caseIndex,
    caseSeed,
    'time-steady',
    'valid-time-steady',
    'accept',
    config,
    ['valid', 'time', 'steady', window.kind],
    { windowKind: window.kind }
  );
};

const validTimePulse: CaseFactory = (caseIndex, caseSeed, rng, variantIndex) => {
  const window = timeWindow(rng, variantIndex % 2 === 0 ? 'day' : 'overnight');
  const pulse = pulseConfig(rng, variantIndex);
  return baseCase(
    caseIndex,
    caseSeed,
    'time-pulse',
    'valid-time-pulse',
    'accept',
    {
      schedule: { relayId: 0, onTime: window.startTime, offTime: window.endTime },
      pulse
    },
    ['valid', 'time', 'pulse', window.kind, pulse.execution.mode],
    { windowKind: window.kind, ...pulseDimensions(pulse) }
  );
};

const validStandalonePulse: CaseFactory = (caseIndex, caseSeed, rng, variantIndex) => {
  const pulse = pulseConfig(rng, variantIndex);
  return baseCase(
    caseIndex,
    caseSeed,
    'standalone-pulse',
    'valid-standalone-pulse',
    'accept',
    { relayId: 0, pulse },
    ['valid', 'standalone-pulse', pulse.execution.mode],
    pulseDimensions(pulse)
  );
};

const validPulseCore: CaseFactory = (caseIndex, caseSeed, rng, variantIndex) => {
  const pulse = pulseConfig(rng, variantIndex);
  return baseCase(
    caseIndex,
    caseSeed,
    'pulse-core',
    'valid-pulse-core-boundaries',
    'accept',
    pulse,
    ['valid', 'pulse-core', pulse.execution.mode],
    pulseDimensions(pulse)
  );
};

const invalidClimateThreshold: CaseFactory = (caseIndex, caseSeed) => {
  const config = createDefaultShellyThermostatConfig(
    'xiaomi_lywsd03mmc_bthome_v2',
    'heating'
  );
  return baseCase(
    caseIndex,
    caseSeed,
    'climate',
    'invalid-climate-threshold-order',
    'reject',
    {
      ...config,
      rule: {
        ...config.rule,
        control: { ...config.rule.control, onThreshold: 20, offThreshold: 20 }
      }
    },
    ['invalid', 'climate', 'threshold'],
    { invalidReason: 'threshold-order' }
  );
};

const invalidClimateDuplicateSensor: CaseFactory = (caseIndex, caseSeed) => {
  const config = createDefaultShellyThermostatConfig();
  const duplicate = { ...config.sensor, sensorId: 'duplicate' };
  return baseCase(
    caseIndex,
    caseSeed,
    'climate',
    'invalid-climate-duplicate-sensor',
    'reject',
    {
      ...config,
      sensorSet: { aggregation: 'avg', additionalSensors: [duplicate] }
    },
    ['invalid', 'climate', 'sensor-identity'],
    { invalidReason: 'duplicate-runtime-address' }
  );
};

const invalidClimateEmptyExecution: CaseFactory = (caseIndex, caseSeed) => {
  const config = createDefaultShellyThermostatConfig();
  return baseCase(
    caseIndex,
    caseSeed,
    'climate',
    'invalid-climate-empty-execution',
    'reject',
    { ...config, execution: {} },
    ['invalid', 'climate', 'execution'],
    { invalidReason: 'empty-execution' }
  );
};

const invalidTimeSteady: CaseFactory = (caseIndex, caseSeed) =>
  baseCase(
    caseIndex,
    caseSeed,
    'time-steady',
    'invalid-time-steady-equal-boundaries',
    'reject',
    { relayId: 0, onTime: '08:00', offTime: '08:00' },
    ['invalid', 'time', 'steady'],
    { invalidReason: 'equal-boundaries' }
  );

const invalidTimePulse: CaseFactory = (caseIndex, caseSeed) =>
  baseCase(
    caseIndex,
    caseSeed,
    'time-pulse',
    'invalid-time-pulse-phase-duration',
    'reject',
    {
      schedule: { relayId: 0, onTime: '08:00', offTime: '20:00' },
      pulse: {
        onMs: PULSE_MIN_PHASE_MS - 1,
        offMs: PULSE_MIN_PHASE_MS,
        initialDelayMs: 0,
        startPhase: 'on',
        execution: { mode: 'continuous' }
      }
    },
    ['invalid', 'time', 'pulse'],
    { invalidReason: 'pulse-on-too-short' }
  );

const invalidStandalonePulse: CaseFactory = (caseIndex, caseSeed) =>
  baseCase(
    caseIndex,
    caseSeed,
    'standalone-pulse',
    'invalid-standalone-negative-relay',
    'reject',
    {
      relayId: -1,
      pulse: {
        onMs: PULSE_MIN_PHASE_MS,
        offMs: PULSE_MIN_PHASE_MS,
        initialDelayMs: 0,
        startPhase: 'on',
        execution: { mode: 'cycles', count: 1 }
      }
    },
    ['invalid', 'standalone-pulse', 'relay-id'],
    { invalidReason: 'negative-relay-id' }
  );

const invalidPulseCore: CaseFactory = (caseIndex, caseSeed, rng) => {
  const variant = caseIndex % 3;
  const base = pulseConfig(rng, caseIndex);
  const config: PulseCycleConfig =
    variant === 0
      ? { ...base, onMs: PULSE_MIN_PHASE_MS - 1 }
      : variant === 1
        ? { ...base, execution: { mode: 'cycles', count: 0 } }
        : {
            ...base,
            execution: { mode: 'duration', durationMs: PULSE_MAX_DURATION_MS + 1 }
          };
  return baseCase(
    caseIndex,
    caseSeed,
    'pulse-core',
    'invalid-pulse-core-bounds',
    'reject',
    config,
    ['invalid', 'pulse-core', 'bounds'],
    { invalidReason: ['phase-too-short', 'zero-cycles', 'duration-too-long'][variant]! }
  );
};

export const VALID_FACTORIES: readonly CaseFactory[] = [
  validClimate,
  validTimeSteady,
  validTimePulse,
  validStandalonePulse,
  validPulseCore
];

export const INVALID_FACTORIES: readonly CaseFactory[] = [
  invalidClimateThreshold,
  invalidClimateDuplicateSensor,
  invalidClimateEmptyExecution,
  invalidTimeSteady,
  invalidTimePulse,
  invalidStandalonePulse,
  invalidPulseCore
];

const factoriesForMode = (mode: ProductMatrixMode): readonly CaseFactory[] => {
  if (mode === 'valid') return VALID_FACTORIES;
  if (mode === 'invalid') return INVALID_FACTORIES;
  const mixed: CaseFactory[] = [];
  const longest = Math.max(VALID_FACTORIES.length, INVALID_FACTORIES.length);
  for (let index = 0; index < longest; index += 1) {
    if (VALID_FACTORIES[index]) mixed.push(VALID_FACTORIES[index]);
    if (INVALID_FACTORIES[index]) mixed.push(INVALID_FACTORIES[index]);
  }
  return mixed;
};

export const generateProductMatrixCases = (
  caseCount: number,
  seed: number,
  mode: ProductMatrixMode
): ProductMatrixCase[] => {
  if (!Number.isInteger(caseCount) || caseCount < 1) {
    throw new RangeError('Product matrix case count must be a positive integer.');
  }
  if (!Number.isInteger(seed)) {
    throw new RangeError('Product matrix seed must be an integer.');
  }

  const rootRng = new DeterministicRng(seed);
  const factories = factoriesForMode(mode);
  const factoryCounts = new Map<CaseFactory, number>();
  return Array.from({ length: caseCount }, (_, caseIndex) => {
    const caseSeed = rootRng.nextUint32();
    const rng = new DeterministicRng(caseSeed);
    const factory = factories[caseIndex % factories.length]!;
    const variantIndex = factoryCounts.get(factory) ?? 0;
    factoryCounts.set(factory, variantIndex + 1);
    return factory(caseIndex, caseSeed, rng, variantIndex);
  });
};
