export const HISTORY_FORMAT_VERSION = 2 as const;
export const HISTORY_KVS_PREFIX = 'shellylink.history.';
export const HISTORY_KVS_META_KEY = 'shellylink.history.meta';
export const HISTORY_DEFAULT_SLOT_COUNT = 24;
export const HISTORY_MAX_SLOT_COUNT = 32;
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

export interface HistorySegment {
  version: typeof HISTORY_FORMAT_VERSION;
  records: readonly HistoryRecord[];
}

export interface HistoryMeta {
  version: typeof HISTORY_FORMAT_VERSION;
  slots: number;
  nextSlot: number;
  validSlots: number;
}

export type HistoryCodecErrorCode = 'invalid-value' | 'value-too-long';

export interface HistoryCodecError {
  code: HistoryCodecErrorCode;
  message: string;
}

export type HistoryCodecResult<T> =
  { ok: true; value: T } | { ok: false; error: HistoryCodecError };

export interface HistoryKvsItem {
  key: string;
  value: unknown;
}

export interface DecodedHistoryStore {
  meta: HistoryMeta | null;
  segments: ReadonlyArray<{ slot: number; segment: HistorySegment }>;
  records: readonly HistoryRecord[];
  invalidKeys: readonly string[];
}

type EncodedRecord = [
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

type EncodedSegment = [version: typeof HISTORY_FORMAT_VERSION, records: EncodedRecord[]];

type EncodedMeta = [
  version: typeof HISTORY_FORMAT_VERSION,
  slots: number,
  nextSlot: number,
  validSlots: number
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

const validShortText = (value: string | null, allowNull: boolean): boolean =>
  value === null
    ? allowNull
    : value.length > 0 && value.length <= 24 && !/[\u0000-\u001f]/.test(value);

const validateRecord = (record: HistoryRecord): HistoryCodecResult<HistoryRecord> => {
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

const encodeRecord = (record: HistoryRecord): EncodedRecord => [
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

const decodeRecord = (raw: unknown): HistoryCodecResult<HistoryRecord> => {
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

  const record: HistoryRecord = {
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
  };

  return validateRecord(record);
};

export const historySegmentKey = (slot: number): string => {
  if (!Number.isInteger(slot) || slot < 0 || slot >= HISTORY_MAX_SLOT_COUNT) {
    throw new RangeError(`Invalid history slot: ${slot}.`);
  }
  return `${HISTORY_KVS_PREFIX}${slot.toString().padStart(2, '0')}`;
};

export const parseHistorySegmentSlot = (key: string): number | null => {
  if (!key.startsWith(HISTORY_KVS_PREFIX)) return null;
  const suffix = key.slice(HISTORY_KVS_PREFIX.length);
  if (!/^\d{2}$/.test(suffix)) return null;
  const slot = Number(suffix);
  return slot < HISTORY_MAX_SLOT_COUNT ? slot : null;
};

export const encodeHistoryMeta = (meta: HistoryMeta): HistoryCodecResult<string> => {
  if (
    meta.version !== HISTORY_FORMAT_VERSION ||
    !isIntegerAtLeast(meta.slots, 1) ||
    meta.slots > HISTORY_MAX_SLOT_COUNT ||
    !isIntegerAtLeast(meta.nextSlot, 0) ||
    meta.nextSlot >= meta.slots ||
    !isIntegerAtLeast(meta.validSlots, 0) ||
    meta.validSlots > meta.slots
  ) {
    return failure('invalid-value', 'History metadata is invalid.');
  }

  const text = JSON.stringify([
    HISTORY_FORMAT_VERSION,
    meta.slots,
    meta.nextSlot,
    meta.validSlots
  ] satisfies EncodedMeta);
  return text.length <= HISTORY_MAX_VALUE_CHARS
    ? success(text)
    : failure('value-too-long', 'History metadata exceeds the Shelly KVS value limit.');
};

export const decodeHistoryMeta = (value: unknown): HistoryCodecResult<HistoryMeta> => {
  if (typeof value !== 'string') {
    return failure('invalid-value', 'History metadata must be a JSON string.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return failure('invalid-value', 'History metadata is not valid JSON.');
  }
  if (!Array.isArray(parsed) || parsed.length !== 4) {
    return failure('invalid-value', 'History metadata shape is invalid.');
  }

  const [version, slots, nextSlot, validSlots] = parsed;
  const meta: HistoryMeta = {
    version: version as typeof HISTORY_FORMAT_VERSION,
    slots: slots as number,
    nextSlot: nextSlot as number,
    validSlots: validSlots as number
  };
  const encoded = encodeHistoryMeta(meta);
  return encoded.ok ? success(meta) : encoded;
};

export const encodeHistorySegment = (
  segment: HistorySegment
): HistoryCodecResult<string> => {
  if (segment.version !== HISTORY_FORMAT_VERSION || segment.records.length === 0) {
    return failure('invalid-value', 'History segment is invalid.');
  }

  const records: EncodedRecord[] = [];
  for (const record of segment.records) {
    const validated = validateRecord(record);
    if (!validated.ok) return validated;
    records.push(encodeRecord(record));
  }

  const text = JSON.stringify([HISTORY_FORMAT_VERSION, records] satisfies EncodedSegment);
  return text.length <= HISTORY_MAX_VALUE_CHARS
    ? success(text)
    : failure('value-too-long', 'History segment exceeds the Shelly KVS value limit.');
};

export const decodeHistorySegment = (
  value: unknown
): HistoryCodecResult<HistorySegment> => {
  if (typeof value !== 'string') {
    return failure('invalid-value', 'History segment must be a JSON string.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return failure('invalid-value', 'History segment is not valid JSON.');
  }
  if (!Array.isArray(parsed) || parsed.length !== 2) {
    return failure('invalid-value', 'History segment shape is invalid.');
  }

  const [version, rawRecords] = parsed;
  if (
    version !== HISTORY_FORMAT_VERSION ||
    !Array.isArray(rawRecords) ||
    rawRecords.length === 0
  ) {
    return failure('invalid-value', 'History segment header is invalid.');
  }

  const records: HistoryRecord[] = [];
  for (const rawRecord of rawRecords) {
    const decoded = decodeRecord(rawRecord);
    if (!decoded.ok) return decoded;
    records.push(decoded.value);
  }
  return success({ version: HISTORY_FORMAT_VERSION, records });
};

export const createHistorySegment = (
  record: HistoryRecord
): HistoryCodecResult<HistorySegment> => {
  const segment: HistorySegment = {
    version: HISTORY_FORMAT_VERSION,
    records: [record]
  };
  const encoded = encodeHistorySegment(segment);
  return encoded.ok ? success(segment) : encoded;
};

export const appendHistoryRecord = (
  segment: HistorySegment,
  record: HistoryRecord
): HistoryCodecResult<HistorySegment> => {
  const candidate: HistorySegment = {
    ...segment,
    records: [...segment.records, record]
  };
  const encoded = encodeHistorySegment(candidate);
  return encoded.ok ? success(candidate) : encoded;
};

export const historyRecordChangedEnough = (
  previous: HistoryRecord | null,
  next: HistoryRecord,
  thresholds: {
    temperatureDeltaC: number;
    humidityDeltaPct: number;
    vpdDeltaKpa: number;
  } = {
    temperatureDeltaC: 0.3,
    humidityDeltaPct: 1,
    vpdDeltaKpa: 0.05
  }
): boolean => {
  if (previous === null) return true;
  if (
    previous.requestedRelayOn !== next.requestedRelayOn ||
    previous.finalRelayOn !== next.finalRelayOn ||
    previous.controlMode !== next.controlMode ||
    previous.manualRequestOn !== next.manualRequestOn ||
    previous.reasonCode !== next.reasonCode ||
    previous.automationFault !== next.automationFault ||
    previous.safetyLockout !== next.safetyLockout ||
    previous.safetyReason !== next.safetyReason
  ) {
    return true;
  }

  const changed = (a: number | null, b: number | null, delta: number): boolean =>
    a === null || b === null ? a !== b : Math.abs(a - b) >= delta;

  return (
    changed(previous.temperatureC, next.temperatureC, thresholds.temperatureDeltaC) ||
    changed(previous.humidityPct, next.humidityPct, thresholds.humidityDeltaPct) ||
    changed(previous.vpdKpa, next.vpdKpa, thresholds.vpdDeltaKpa)
  );
};

export const decodeHistoryKvsItems = (
  items: readonly HistoryKvsItem[]
): DecodedHistoryStore => {
  let meta: HistoryMeta | null = null;
  const bySlot = new Map<number, HistorySegment>();
  const invalidKeys: string[] = [];

  for (const item of items) {
    if (item.key === HISTORY_KVS_META_KEY) {
      const decoded = decodeHistoryMeta(item.value);
      if (decoded.ok) meta = decoded.value;
      else invalidKeys.push(item.key);
      continue;
    }

    const slot = parseHistorySegmentSlot(item.key);
    if (slot === null) continue;
    const decoded = decodeHistorySegment(item.value);
    if (decoded.ok) bySlot.set(slot, decoded.value);
    else invalidKeys.push(item.key);
  }

  const segments: Array<{ slot: number; segment: HistorySegment }> = [];
  if (meta) {
    const count = Math.min(meta.validSlots, meta.slots);
    const first = (meta.nextSlot - count + meta.slots) % meta.slots;
    for (let index = 0; index < count; index += 1) {
      const slot = (first + index) % meta.slots;
      const segment = bySlot.get(slot);
      if (segment) segments.push({ slot, segment });
    }
  } else {
    for (const [slot, segment] of [...bySlot.entries()].sort((a, b) => a[0] - b[0])) {
      segments.push({ slot, segment });
    }
  }

  return {
    meta,
    segments,
    records: segments.flatMap(({ segment }) => segment.records),
    invalidKeys
  };
};
