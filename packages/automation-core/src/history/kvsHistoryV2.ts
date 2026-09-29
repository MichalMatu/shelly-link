import {
  HISTORY_FORMAT_VERSION,
  HISTORY_MAX_VALUE_CHARS,
  decodeHistoryRecord,
  encodeHistoryRecord,
  validateHistoryRecord,
  type EncodedHistoryRecord,
  type HistoryCodecErrorCode,
  type HistoryCodecResult,
  type HistoryRecord
} from './historyV2Record.js';

export {
  HISTORY_FORMAT_VERSION,
  HISTORY_MAX_VALUE_CHARS,
  type HistoryCodecError,
  type HistoryCodecErrorCode,
  type HistoryCodecResult,
  type HistoryControlMode,
  type HistoryRecord
} from './historyV2Record.js';

export const HISTORY_KVS_PREFIX = 'shellylink.history.';
export const HISTORY_KVS_META_KEY = 'shellylink.history.meta';
export const HISTORY_DEFAULT_SLOT_COUNT = 24;
export const HISTORY_MAX_SLOT_COUNT = 32;

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

type EncodedSegment = [
  version: typeof HISTORY_FORMAT_VERSION,
  records: EncodedHistoryRecord[]
];

type EncodedMeta = [
  version: typeof HISTORY_FORMAT_VERSION,
  slots: number,
  nextSlot: number,
  validSlots: number
];

const success = <T>(value: T): HistoryCodecResult<T> => ({ ok: true, value });
const failure = (
  code: HistoryCodecErrorCode,
  message: string
): HistoryCodecResult<never> => ({ ok: false, error: { code, message } });

const isIntegerAtLeast = (value: unknown, minimum: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= minimum;

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

  const records: EncodedHistoryRecord[] = [];
  for (const record of segment.records) {
    const validated = validateHistoryRecord(record);
    if (!validated.ok) return validated;
    records.push(encodeHistoryRecord(record));
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
    const decoded = decodeHistoryRecord(rawRecord);
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
