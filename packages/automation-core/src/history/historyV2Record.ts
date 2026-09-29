export const HISTORY_FORMAT_VERSION = 2 as const;
export const HISTORY_MAX_VALUE_CHARS = 253;

export type HistoryControlMode = 'auto' | 'manual';

export interface HistoryRecord {
  timestampUnixSec: number | null;
  uptimeSec: number;
  temperatureC: number | null;
  humidityPct: number | null;
  vpdKpa: number | null;
  requestedRelayOn: boolean;
  finalRelayOn: boolean;
  controlMode: HistoryControlMode;
  manualRequestOn: boolean;
  reasonCode: string;
  automationFault: string | null;
  safetyLockout: boolean;
  safetyReason: string | null;
  powerW: number | null;
  currentA: number | null;
}

export type HistoryCodecErrorCode = 'invalid-value' | 'value-too-long';

export interface HistoryCodecError {
  code: HistoryCodecErrorCode;
  message: string;
}

export type HistoryCodecResult<T> =
  { ok: true; value: T } | { ok: false; error: HistoryCodecError };

export type EncodedHistoryRecord = [
  timestampUnixSec: number | null,
  uptimeSec: number,
  temperatureDeciC: number | null,
  humidityDeciPct: number | null,
  vpdMilliKpa: number | null,
  flags: number,
  reasonCode: string,
  automationFault: string | null,
  safetyReason: string | null,
  powerDeciW: number | null,
  currentMilliA: number | null
];

const FLAG_REQUESTED_ON = 1 << 0;
const FLAG_FINAL_ON = 1 << 1;
const FLAG_MANUAL_MODE = 1 << 2;
const FLAG_MANUAL_REQUEST_ON = 1 << 3;
const FLAG_SAFETY_LOCKOUT = 1 << 4;
const KNOWN_FLAGS =
  FLAG_REQUESTED_ON |
  FLAG_FINAL_ON |
  FLAG_MANUAL_MODE |
  FLAG_MANUAL_REQUEST_ON |
  FLAG_SAFETY_LOCKOUT;

const success = <T>(value: T): HistoryCodecResult<T> => ({ ok: true, value });
const failure = (
  code: HistoryCodecErrorCode,
  message: string
): HistoryCodecResult<never> => ({ ok: false, error: { code, message } });

const isIntegerAtLeast = (value: unknown, minimum: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= minimum;

const isFiniteInRange = (value: number, minimum: number, maximum: number): boolean =>
  Number.isFinite(value) && value >= minimum && value <= maximum;

const isNullableInteger = (value: unknown): value is number | null =>
  value === null || (typeof value === 'number' && Number.isInteger(value));

const hasControlCharacter = (value: string): boolean => {
  for (let index = 0; index < value.length; index += 1) {
    if (value.charCodeAt(index) < 32) return true;
  }
  return false;
};

const validShortText = (value: string | null, allowNull: boolean): boolean =>
  value === null
    ? allowNull
    : value.length > 0 && value.length <= 24 && !hasControlCharacter(value);

export const validateHistoryRecord = (
  record: HistoryRecord
): HistoryCodecResult<HistoryRecord> => {
  if (record.timestampUnixSec !== null && !isIntegerAtLeast(record.timestampUnixSec, 0)) {
    return failure('invalid-value', 'History timestamp is invalid.');
  }
  if (!isIntegerAtLeast(record.uptimeSec, 0)) {
    return failure('invalid-value', 'History uptime is invalid.');
  }
  if (record.temperatureC !== null && !isFiniteInRange(record.temperatureC, -100, 200)) {
    return failure(
      'invalid-value',
      'History temperature is outside the supported range.'
    );
  }
  if (record.humidityPct !== null && !isFiniteInRange(record.humidityPct, 0, 100)) {
    return failure('invalid-value', 'History humidity is outside the supported range.');
  }
  if (record.vpdKpa !== null && !isFiniteInRange(record.vpdKpa, 0, 20)) {
    return failure('invalid-value', 'History VPD is outside the supported range.');
  }
  if (record.controlMode !== 'auto' && record.controlMode !== 'manual') {
    return failure('invalid-value', 'History control mode is invalid.');
  }
  if (!validShortText(record.reasonCode, false)) {
    return failure('invalid-value', 'History reason code is invalid.');
  }
  if (!validShortText(record.automationFault, true)) {
    return failure('invalid-value', 'History automation fault is invalid.');
  }
  if (!validShortText(record.safetyReason, true)) {
    return failure('invalid-value', 'History safety reason is invalid.');
  }
  if (record.powerW !== null && !isFiniteInRange(record.powerW, -100_000, 100_000)) {
    return failure('invalid-value', 'History power is outside the supported range.');
  }
  if (record.currentA !== null && !isFiniteInRange(record.currentA, 0, 1_000)) {
    return failure('invalid-value', 'History current is outside the supported range.');
  }
  return success(record);
};

const scale = (value: number | null, multiplier: number): number | null =>
  value === null ? null : Math.round(value * multiplier);

const unscale = (value: number | null, multiplier: number): number | null =>
  value === null ? null : value / multiplier;

const recordFlags = (record: HistoryRecord): number =>
  (record.requestedRelayOn ? FLAG_REQUESTED_ON : 0) |
  (record.finalRelayOn ? FLAG_FINAL_ON : 0) |
  (record.controlMode === 'manual' ? FLAG_MANUAL_MODE : 0) |
  (record.manualRequestOn ? FLAG_MANUAL_REQUEST_ON : 0) |
  (record.safetyLockout ? FLAG_SAFETY_LOCKOUT : 0);

export const encodeHistoryRecord = (record: HistoryRecord): EncodedHistoryRecord => [
  record.timestampUnixSec,
  record.uptimeSec,
  scale(record.temperatureC, 10),
  scale(record.humidityPct, 10),
  scale(record.vpdKpa, 1_000),
  recordFlags(record),
  record.reasonCode,
  record.automationFault,
  record.safetyReason,
  scale(record.powerW, 10),
  scale(record.currentA, 1_000)
];

export const decodeHistoryRecord = (raw: unknown): HistoryCodecResult<HistoryRecord> => {
  if (!Array.isArray(raw) || raw.length !== 11) {
    return failure('invalid-value', 'History record shape is invalid.');
  }

  const [
    timestampUnixSec,
    uptimeSec,
    temperatureDeciC,
    humidityDeciPct,
    vpdMilliKpa,
    flags,
    reasonCode,
    automationFault,
    safetyReason,
    powerDeciW,
    currentMilliA
  ] = raw;

  if (
    !isNullableInteger(timestampUnixSec) ||
    !isIntegerAtLeast(uptimeSec, 0) ||
    !isNullableInteger(temperatureDeciC) ||
    !isNullableInteger(humidityDeciPct) ||
    !isNullableInteger(vpdMilliKpa) ||
    !isIntegerAtLeast(flags, 0) ||
    (flags & ~KNOWN_FLAGS) !== 0 ||
    typeof reasonCode !== 'string' ||
    (automationFault !== null && typeof automationFault !== 'string') ||
    (safetyReason !== null && typeof safetyReason !== 'string') ||
    !isNullableInteger(powerDeciW) ||
    !isNullableInteger(currentMilliA)
  ) {
    return failure('invalid-value', 'History record value is invalid.');
  }

  return validateHistoryRecord({
    timestampUnixSec,
    uptimeSec,
    temperatureC: unscale(temperatureDeciC, 10),
    humidityPct: unscale(humidityDeciPct, 10),
    vpdKpa: unscale(vpdMilliKpa, 1_000),
    requestedRelayOn: (flags & FLAG_REQUESTED_ON) !== 0,
    finalRelayOn: (flags & FLAG_FINAL_ON) !== 0,
    controlMode: (flags & FLAG_MANUAL_MODE) !== 0 ? 'manual' : 'auto',
    manualRequestOn: (flags & FLAG_MANUAL_REQUEST_ON) !== 0,
    reasonCode,
    automationFault,
    safetyLockout: (flags & FLAG_SAFETY_LOCKOUT) !== 0,
    safetyReason,
    powerW: unscale(powerDeciW, 10),
    currentA: unscale(currentMilliA, 1_000)
  });
};
