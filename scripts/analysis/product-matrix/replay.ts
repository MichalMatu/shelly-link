import {
  createInitialAutomationState,
  dailyScheduleTimespec,
  evaluatePulseCycle,
  evaluateThresholdDecision,
  expectedRelayOnForClockTime,
  validatePulseCycleConfig,
  type DailyTimeAutomationConfig,
  type PulseCycleConfig,
  type ThermostatMeasurement,
  type ThermostatRule
} from '@lcl/automation-core';
import {
  SHELLY_STANDALONE_PULSE_SCRIPT_MAX_BYTES,
  SHELLY_THERMOSTAT_SCRIPT_MAX_BYTES,
  climateSensorAggregationForConfig,
  climateSensorsForConfig,
  configHash,
  decodeShellyStandalonePulseScript,
  decodeShellyThermostatScript,
  decodeShellyTimePulseScript,
  generateShellyStandalonePulseScript,
  generateShellyThermostatScript,
  generateShellyTimePulseScript,
  normalizeConfig,
  standalonePulseAutomationConfigSchema,
  timePulseAutomationConfigSchema,
  type ShellyStandalonePulseAutomationConfig,
  type ShellyThermostatConfig,
  type ShellyTimePulseAutomationConfig
} from '@lcl/script-generator';
import {
  PRODUCT_MATRIX_CASE_SCHEMA,
  type ProductMatrixCase,
  type ProductMatrixMode
} from './cases.js';

const textEncoder = new TextEncoder();
const TIME_PULSE_SCRIPT_MAX_BYTES = SHELLY_THERMOSTAT_SCRIPT_MAX_BYTES;
const BASE_NOW_MS = 1_900_000_000_000;

const invariant = (condition: unknown, message: string): asserts condition => {
  if (!condition) throw new Error(message);
};

const jsonEqual = (left: unknown, right: unknown): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

const scriptBytes = (script: string): number => textEncoder.encode(script).length;

const assertScriptIsStableAndValid = (
  script: string,
  regenerated: string,
  maximumBytes: number,
  label: string
): void => {
  invariant(script === regenerated, `${label}: script generation is not deterministic.`);
  invariant(scriptBytes(script) <= maximumBytes, `${label}: generated script exceeds ${maximumBytes} B.`);
  invariant(!script.includes('{{'), `${label}: unresolved template marker found.`);
  invariant(!script.includes('__PLACEHOLDER__'), `${label}: unresolved placeholder found.`);
  try {
    // Shelly Script is JavaScript. Parsing it here catches malformed generated source without executing it.
    new Function(script);
  } catch (error) {
    throw new Error(`${label}: generated script does not parse: ${String(error)}`);
  }
};

const assertPulseBoundaries = (pulse: PulseCycleConfig, label: string): void => {
  validatePulseCycleConfig(pulse);
  const startedAtMs = 10_000;
  const atStart = evaluatePulseCycle(pulse, startedAtMs, startedAtMs);

  if (pulse.initialDelayMs > 0) {
    invariant(atStart.status === 'delay', `${label}: initial delay must start in delay state.`);
    invariant(atStart.relayOn === false, `${label}: initial delay must be relay OFF.`);
    const beforeBoundary = evaluatePulseCycle(
      pulse,
      startedAtMs,
      startedAtMs + pulse.initialDelayMs - 1
    );
    invariant(beforeBoundary.status === 'delay', `${label}: delay ended one millisecond early.`);
  }

  const activeStart = evaluatePulseCycle(
    pulse,
    startedAtMs,
    startedAtMs + pulse.initialDelayMs
  );
  invariant(activeStart.status === 'running', `${label}: active boundary must enter running state.`);
  invariant(activeStart.phase === pulse.startPhase, `${label}: wrong start phase.`);
  invariant(
    activeStart.relayOn === (pulse.startPhase === 'on'),
    `${label}: relay output does not match start phase.`
  );

  if (pulse.execution.mode === 'continuous') {
    const later = evaluatePulseCycle(
      pulse,
      startedAtMs,
      startedAtMs + pulse.initialDelayMs + pulse.onMs + pulse.offMs + 1
    );
    invariant(later.status === 'running', `${label}: continuous Pulse unexpectedly completed.`);
    return;
  }

  const completionElapsedMs =
    pulse.execution.mode === 'duration'
      ? pulse.execution.durationMs
      : pulse.startPhase === 'on'
        ? (pulse.execution.count - 1) * (pulse.onMs + pulse.offMs) + pulse.onMs
        : pulse.execution.count * (pulse.onMs + pulse.offMs);
  const completed = evaluatePulseCycle(
    pulse,
    startedAtMs,
    startedAtMs + pulse.initialDelayMs + completionElapsedMs
  );
  invariant(completed.status === 'completed', `${label}: bounded Pulse did not complete at boundary.`);
  invariant(completed.relayOn === false, `${label}: completed Pulse must finish OFF.`);
  invariant(completed.nextTransitionAtMs === null, `${label}: completed Pulse retained a transition.`);
};

const controlMeasurement = (
  rule: ThermostatRule,
  seenAtMs: number,
  controlValue?: number
): ThermostatMeasurement => ({
  temperatureC:
    rule.control.metric === 'temperature' ? (controlValue ?? rule.control.onThreshold) : 24,
  humidityPct:
    rule.control.metric === 'humidity' ? (controlValue ?? rule.control.onThreshold) : 60,
  rssi: -55,
  seenAtMs
});

const assertClimateFailSafeInvariants = (config: ShellyThermostatConfig, label: string): void => {
  const rule = config.rule as ThermostatRule;
  const stale = evaluateThresholdDecision({
    rule,
    state: {
      ...createInitialAutomationState(),
      relayOn: true,
      onStartedMs: BASE_NOW_MS - 60_000,
      lastChangeMs: BASE_NOW_MS - 60_000
    },
    measurement: controlMeasurement(
      rule,
      BASE_NOW_MS - rule.staleTimeoutSec * 1_000 - 1
    ),
    nowMs: BASE_NOW_MS
  });
  invariant(stale.requestedRelayOn === false, `${label}: stale sensor did not request OFF.`);
  invariant(stale.reason === 'sensor-stale', `${label}: stale sensor reason changed.`);

  const boot = evaluateThresholdDecision({
    rule,
    state: {
      ...createInitialAutomationState(),
      relayOn: true,
      onStartedMs: BASE_NOW_MS - 60_000,
      lastChangeMs: BASE_NOW_MS - 60_000
    },
    measurement: controlMeasurement(rule, BASE_NOW_MS),
    nowMs: BASE_NOW_MS,
    event: 'boot'
  });
  invariant(boot.requestedRelayOn === false, `${label}: boot did not request safe OFF.`);
  invariant(boot.reason === 'boot-safe-off', `${label}: boot safe-OFF reason changed.`);
};

const replayClimate = (matrixCase: ProductMatrixCase): void => {
  if (matrixCase.expectation === 'reject') {
    let rejected = false;
    try {
      normalizeConfig(matrixCase.config);
    } catch {
      rejected = true;
    }
    invariant(rejected, `${matrixCase.name}: invalid Climate config was accepted.`);
    return;
  }

  const config = normalizeConfig(matrixCase.config);
  const script = generateShellyThermostatScript(config);
  assertScriptIsStableAndValid(
    script,
    generateShellyThermostatScript(config),
    SHELLY_THERMOSTAT_SCRIPT_MAX_BYTES,
    matrixCase.name
  );

  const decoded = decodeShellyThermostatScript(script);
  invariant(decoded !== null, `${matrixCase.name}: generated Climate script did not decode.`);
  invariant(decoded.runtimeMode === 'climate-engine-v1', `${matrixCase.name}: wrong Climate runtime mode.`);
  invariant(decoded.configHash === configHash(config), `${matrixCase.name}: Climate config hash mismatch.`);
  invariant(decoded.settings.mode === config.rule.mode, `${matrixCase.name}: Climate mode did not round-trip.`);
  invariant(decoded.settings.relayId === config.output.relayId, `${matrixCase.name}: relay id did not round-trip.`);
  invariant(
    jsonEqual(decoded.settings.execution ?? null, config.execution ?? null),
    `${matrixCase.name}: Climate execution config did not round-trip.`
  );
  invariant(
    decoded.settings.aggregation === climateSensorAggregationForConfig(config),
    `${matrixCase.name}: sensor aggregation did not round-trip.`
  );

  const configuredSensors = climateSensorsForConfig(config);
  invariant(
    decoded.settings.sensors.length === configuredSensors.length,
    `${matrixCase.name}: Climate sensor count did not round-trip.`
  );
  configuredSensors.forEach((sensor, index) => {
    const decodedSensor = decoded.settings.sensors[index];
    invariant(decodedSensor !== undefined, `${matrixCase.name}: missing decoded sensor ${index}.`);
    invariant(
      decodedSensor.runtimeAddress === sensor.runtimeAddress,
      `${matrixCase.name}: sensor ${index} address did not round-trip.`
    );
    invariant(
      decodedSensor.sensorProfileId === sensor.profileId,
      `${matrixCase.name}: sensor ${index} profile did not round-trip.`
    );
    invariant(
      decodedSensor.sensorDisplayName === sensor.displayName,
      `${matrixCase.name}: sensor ${index} name did not round-trip.`
    );
  });

  assertClimateFailSafeInvariants(config, matrixCase.name);
  if (config.execution?.pulse) assertPulseBoundaries(config.execution.pulse, matrixCase.name);
};

const replayTimeSteady = (matrixCase: ProductMatrixCase): void => {
  const config = matrixCase.config as DailyTimeAutomationConfig;
  if (matrixCase.expectation === 'reject') {
    let rejected = false;
    try {
      expectedRelayOnForClockTime(config, config.onTime);
    } catch {
      rejected = true;
    }
    invariant(rejected, `${matrixCase.name}: invalid steady Time config was accepted.`);
    return;
  }

  invariant(typeof config.onTime === 'string' && typeof config.offTime === 'string', `${matrixCase.name}: invalid Time shape.`);
  invariant(dailyScheduleTimespec(config.onTime).length > 0, `${matrixCase.name}: ON timespec missing.`);
  invariant(dailyScheduleTimespec(config.offTime).length > 0, `${matrixCase.name}: OFF timespec missing.`);
  invariant(
    expectedRelayOnForClockTime(config, config.onTime) === true,
    `${matrixCase.name}: schedule must be active at ON boundary.`
  );
  invariant(
    expectedRelayOnForClockTime(config, config.offTime) === false,
    `${matrixCase.name}: schedule must be inactive at OFF boundary.`
  );
};

const replayTimePulse = (matrixCase: ProductMatrixCase): void => {
  if (matrixCase.expectation === 'reject') {
    const parsed = timePulseAutomationConfigSchema.safeParse(matrixCase.config);
    invariant(!parsed.success, `${matrixCase.name}: invalid Time + Pulse config was accepted.`);
    return;
  }

  const config = timePulseAutomationConfigSchema.parse(
    matrixCase.config
  ) as ShellyTimePulseAutomationConfig;
  const script = generateShellyTimePulseScript(config);
  assertScriptIsStableAndValid(
    script,
    generateShellyTimePulseScript(config),
    TIME_PULSE_SCRIPT_MAX_BYTES,
    matrixCase.name
  );
  const decoded = decodeShellyTimePulseScript(script);
  invariant(decoded !== null, `${matrixCase.name}: Time + Pulse script did not decode.`);
  invariant(jsonEqual(decoded, config), `${matrixCase.name}: Time + Pulse config did not round-trip.`);
  invariant(
    expectedRelayOnForClockTime(config.schedule, config.schedule.onTime) === true,
    `${matrixCase.name}: Time + Pulse ON boundary is inactive.`
  );
  invariant(
    expectedRelayOnForClockTime(config.schedule, config.schedule.offTime) === false,
    `${matrixCase.name}: Time + Pulse OFF boundary is active.`
  );
  assertPulseBoundaries(config.pulse, matrixCase.name);
};

const replayStandalonePulse = (matrixCase: ProductMatrixCase): void => {
  if (matrixCase.expectation === 'reject') {
    const parsed = standalonePulseAutomationConfigSchema.safeParse(matrixCase.config);
    invariant(!parsed.success, `${matrixCase.name}: invalid standalone Pulse config was accepted.`);
    return;
  }

  const config = standalonePulseAutomationConfigSchema.parse(
    matrixCase.config
  ) as ShellyStandalonePulseAutomationConfig;
  const script = generateShellyStandalonePulseScript(config);
  assertScriptIsStableAndValid(
    script,
    generateShellyStandalonePulseScript(config),
    SHELLY_STANDALONE_PULSE_SCRIPT_MAX_BYTES,
    matrixCase.name
  );
  const decoded = decodeShellyStandalonePulseScript(script);
  invariant(decoded !== null, `${matrixCase.name}: standalone Pulse script did not decode.`);
  invariant(jsonEqual(decoded, config), `${matrixCase.name}: standalone Pulse config did not round-trip.`);
  assertPulseBoundaries(config.pulse, matrixCase.name);
};

const replayPulseCore = (matrixCase: ProductMatrixCase): void => {
  const config = matrixCase.config as PulseCycleConfig;
  if (matrixCase.expectation === 'reject') {
    let rejected = false;
    try {
      validatePulseCycleConfig(config);
    } catch {
      rejected = true;
    }
    invariant(rejected, `${matrixCase.name}: invalid Pulse core config was accepted.`);
    return;
  }
  assertPulseBoundaries(config, matrixCase.name);
};

export const isProductMatrixCase = (value: unknown): value is ProductMatrixCase => {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    record.schema === PRODUCT_MATRIX_CASE_SCHEMA &&
    typeof record.name === 'string' &&
    typeof record.caseIndex === 'number' &&
    typeof record.seed === 'number' &&
    typeof record.kind === 'string' &&
    (record.expectation === 'accept' || record.expectation === 'reject') &&
    Array.isArray(record.tags) &&
    !!record.dimensions &&
    typeof record.dimensions === 'object' &&
    'config' in record
  );
};

export const replayProductMatrixCase = (matrixCase: ProductMatrixCase): void => {
  switch (matrixCase.kind) {
    case 'climate':
      replayClimate(matrixCase);
      break;
    case 'time-steady':
      replayTimeSteady(matrixCase);
      break;
    case 'time-pulse':
      replayTimePulse(matrixCase);
      break;
    case 'standalone-pulse':
      replayStandalonePulse(matrixCase);
      break;
    case 'pulse-core':
      replayPulseCore(matrixCase);
      break;
    default: {
      const neverKind: never = matrixCase.kind;
      throw new Error(`Unsupported product matrix kind: ${String(neverKind)}`);
    }
  }
};

export interface ProductMatrixCoverageReport {
  total: number;
  accepted: number;
  rejected: number;
  byKind: Record<string, number>;
  dimensions: Record<string, string[]>;
}

export const buildProductMatrixCoverageReport = (
  cases: readonly ProductMatrixCase[]
): ProductMatrixCoverageReport => {
  const byKind: Record<string, number> = {};
  const dimensionSets = new Map<string, Set<string>>();
  let accepted = 0;
  let rejected = 0;

  for (const matrixCase of cases) {
    byKind[matrixCase.kind] = (byKind[matrixCase.kind] ?? 0) + 1;
    if (matrixCase.expectation === 'accept') accepted += 1;
    else rejected += 1;
    for (const [name, value] of Object.entries(matrixCase.dimensions)) {
      const values = dimensionSets.get(name) ?? new Set<string>();
      values.add(String(value));
      dimensionSets.set(name, values);
    }
  }

  return {
    total: cases.length,
    accepted,
    rejected,
    byKind,
    dimensions: Object.fromEntries(
      [...dimensionSets.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([name, values]) => [name, [...values].sort()])
    )
  };
};

const requireDimensionValues = (
  report: ProductMatrixCoverageReport,
  name: string,
  values: readonly (string | number | boolean)[]
): void => {
  const actual = new Set(report.dimensions[name] ?? []);
  for (const value of values) {
    invariant(actual.has(String(value)), `Product matrix coverage is missing ${name}=${String(value)}.`);
  }
};

export const assertProductMatrixCoverage = (
  cases: readonly ProductMatrixCase[],
  mode: ProductMatrixMode
): ProductMatrixCoverageReport => {
  const report = buildProductMatrixCoverageReport(cases);
  for (const kind of ['climate', 'time-steady', 'time-pulse', 'standalone-pulse', 'pulse-core']) {
    invariant((report.byKind[kind] ?? 0) > 0, `Product matrix coverage is missing ${kind}.`);
  }

  if (mode !== 'invalid') {
    invariant(report.accepted > 0, 'Product matrix coverage has no accepted cases.');
    requireDimensionValues(report, 'mode', [
      'heating',
      'cooling',
      'humidifying',
      'dehumidifying'
    ]);
    requireDimensionValues(report, 'sensorCount', [1, 2, 3, 4]);
    requireDimensionValues(report, 'profilePattern', ['xiaomi', 'tp357', 'mixed']);
    requireDimensionValues(report, 'aggregation', ['avg', 'min', 'max', 'firstValid']);
    requireDimensionValues(report, 'vpd', [true, false]);
    requireDimensionValues(report, 'executionShape', ['none', 'window', 'pulse', 'pulse-window']);
    requireDimensionValues(report, 'windowKind', ['day', 'overnight']);
    requireDimensionValues(report, 'pulseMode', ['continuous', 'cycles', 'duration']);
    requireDimensionValues(report, 'startPhase', ['on', 'off']);
  }
  if (mode !== 'valid') {
    invariant(report.rejected > 0, 'Product matrix coverage has no rejected cases.');
  }
  return report;
};
