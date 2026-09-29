export const LCL_HISTORY_FORMAT_VERSION = 2 as const;
export const LCL_HISTORY_KVS_PREFIX = 'lcl.hist.';
export const LCL_HISTORY_KVS_META_KEY = 'lcl.hist.m';
export const LCL_HISTORY_DEFAULT_SLOT_COUNT = 24;
export const LCL_HISTORY_MAX_SLOT_COUNT = 32;
export const LCL_HISTORY_MAX_VALUE_CHARS = 253;
export const LCL_HISTORY_MAX_CONTEXT_CHARS = 24;

export type LclHistoryControlMode = 'auto' | 'manual';

export interface LclHistorySample {
  timestampSec: number | null;
  uptimeSec: number;
  temperatureC: number | null;
  humidityPct: number | null;
  vpdKpa: number | null;
  automationRequestedOn: boolean;
  finalRelayOn: boolean;
  controlMode: LclHistoryControlMode;
  manualRequestOn: boolean;
  reason: string | null;
  automationFault: string | null;
  safetyLockout: boolean;
  safetyReason: string | null;
  powerW: number | null;
  currentA: number | null;
}

export interface LclHistorySegment {
  version: typeof LCL_HISTORY_FORMAT_VERSION;
  generation: number;
  samples: readonly LclHistorySample[];
}

export interface LclHistoryMeta {
  version: typeof LCL_HISTORY_FORMAT_VERSION;
  slots: number;
  nextSlot: number;
  validSlots: number;
  nextGeneration: number;
}

export interface LclHistoryWriteCursor {
  slots: number;
  nextSlot: number;
  validSlots: number;
  nextGeneration: number;
}

export type LclHistoryCodecErrorCode = 'invalid-value' | 'value-too-long';

export interface LclHistoryCodecError {
  code: LclHistoryCodecErrorCode;
  message: string;
}

export type LclHistoryCodecResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: LclHistoryCodecError };

export interface LclHistoryKvsItem {
  key: string;
  value: unknown;
}

export interface LclHistoryDecodedStore {
  meta: LclHistoryMeta | null;
  segments: ReadonlyArray<{ slot: number; segment: LclHistorySegment }>;
  samples: readonly LclHistorySample[];
  invalidKeys: readonly string[];
  cursor: LclHistoryWriteCursor;
}

type EncodedRecord = [
  timestampDeltaSec: number | null,
  uptimeDeltaSec: number,
  temperatureDeciC: number | null,
  humidityDeciPct: number | null,
  vpdCentiKpa: number | null,
  flags: number,
  reason: string | null,
  automationFault: string | null,
  safetyReason: string | null,
  powerDeciW: number | null,
  currentMilliA: number | null
];

type EncodedSegment = [
  version: typeof LCL_HISTORY_FORMAT_VERSION,
  generation: number,
  baseTimestampSec: number | null,
  baseUptimeSec: number,
  records: EncodedRecord[]
];

type EncodedMeta = [
  version: typeof LCL_HISTORY_FORMAT_VERSION,
  slots: number,
  nextSlot: number,
  validSlots: number,
  nextGeneration: number
];

const FLAG_AUTOMATION_REQUESTED_ON = 1;
const FLAG_FINAL_RELAY_ON = 2;
const FLAG_MANUAL_MODE = 4;
const FLAG_MANUAL_REQUEST_ON = 8;
const FLAG_SAFETY_LOCKOUT = 16;
const KNOWN_FLAGS_MASK = 31;

const success = <T>(value: T): LclHistoryCodecResult<T> => ({ ok: true, value });
const failure = (
  code: LclHistoryCodecErrorCode,
  message: string
): LclHistoryCodecResult<never> => ({ ok: false, error: { code, message } });

const isIntegerAtLeast = (value: unknown, minimum: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= minimum;

const isInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value);

const isFiniteInRange = (value: number, minimum: number, maximum: number): boolean =>
  Number.isFinite(value) && value >= minimum && value <= maximum;

const validContext = (value: string | null): boolean =>
  value === null || (value.length > 0 && value.length <= LCL_HISTORY_MAX_CONTEXT_CHARS);

const validateSample = (sample: LclHistorySample): LclHistoryCodecResult<LclHistorySample> => {
  if (sample.timestampSec !== null && !isIntegerAtLeast(sample.timestampSec, 0)) {
    return failure('invalid-value', 'History timestamp is invalid.');
  }
  if (!isIntegerAtLeast(sample.uptimeSec, 0)) {
    return failure('invalid-value', 'History uptime is invalid.');
  }
  if (sample.temperatureC !== null && !isFiniteInRange(sample.temperatureC, -100, 200)) {
    return failure('invalid-value', 'History temperature is outside the supported range.');
  }
  if (sample.humidityPct !== null && !isFiniteInRange(sample.humidityPct, 0, 100)) {
    return failure('invalid-value', 'History humidity is outside the supported range.');
  }
  if (sample.vpdKpa !== null && !isFiniteInRange(sample.vpdKpa, 0, 20)) {
    return failure('invalid-value', 'History VPD is outside the supported range.');
  }
  if (sample.powerW !== null && !isFiniteInRange(sample.powerW, 0, 100_000)) {
    return failure('invalid-value', 'History power is outside the supported range.');
  }
  if (sample.currentA !== null && !isFiniteInRange(sample.currentA, 0, 1_000)) {
    return failure('invalid-value', 'History current is outside the supported range.');
  }
  if (![sample.reason, sample.automationFault, sample.safetyReason].every(validContext)) {
    return failure('invalid-value', 'History context text is invalid.');
  }
  if (sample.controlMode === 'auto' && sample.manualRequestOn) {
    return failure('invalid-value', 'AUTO history samples cannot contain a manual relay request.');
  }
  if (sample.safetyLockout && sample.safetyReason === null) {
    return failure('invalid-value', 'Safety lockout history samples require a safety reason.');
  }
  if (!sample.safetyLockout && sample.safetyReason !== null) {
    return failure('invalid-value', 'Safety reason requires an active safety lockout.');
  }
  if (sample.safetyLockout && sample.finalRelayOn) {
    return failure('invalid-value', 'Safety lockout history samples must record relay OFF.');
  }
  return success(sample);
};

const scale = (value: number | null, multiplier: number): number | null =>
  value === null ? null : Math.round(value * multiplier);

const unscale = (value: number | null, multiplier: number): number | null =>
  value === null ? null : value / multiplier;

const encodeFlags = (sample: LclHistorySample): number =>
  (sample.automationRequestedOn ? FLAG_AUTOMATION_REQUESTED_ON : 0) |
  (sample.finalRelayOn ? FLAG_FINAL_RELAY_ON : 0) |
  (sample.controlMode === 'manual' ? FLAG_MANUAL_MODE : 0) |
  (sample.manualRequestOn ? FLAG_MANUAL_REQUEST_ON : 0) |
  (sample.safetyLockout ? FLAG_SAFETY_LOCKOUT : 0);

const contextFromUnknown = (value: unknown): string | null | undefined => {
  if (value === null) return null;
  if (typeof value !== 'string' || !validContext(value)) return undefined;
  return value;
};

export const lclHistorySegmentKey = (slot: number): string => {
  if (!Number.isInteger(slot) || slot < 0 || slot >= LCL_HISTORY_MAX_SLOT_COUNT) {
    throw new RangeError(`Invalid history slot: ${slot}.`);
  }
  return `${LCL_HISTORY_KVS_PREFIX}${slot.toString().padStart(2, '0')}`;
};

export const parseLclHistorySegmentSlot = (key: string): number | null => {
  if (!key.startsWith(LCL_HISTORY_KVS_PREFIX)) return null;
  const suffix = key.slice(LCL_HISTORY_KVS_PREFIX.length);
  if (!/^\d{2}$/.test(suffix)) return null;
  const slot = Number(suffix);
  return slot < LCL_HISTORY_MAX_SLOT_COUNT ? slot : null;
};

export const encodeLclHistoryMeta = (meta: LclHistoryMeta): LclHistoryCodecResult<string> => {
  if (
    meta.version !== LCL_HISTORY_FORMAT_VERSION ||
    !isIntegerAtLeast(meta.slots, 1) ||
    meta.slots > LCL_HISTORY_MAX_SLOT_COUNT ||
    !isIntegerAtLeast(meta.nextSlot, 0) ||
    meta.nextSlot >= meta.slots ||
    !isIntegerAtLeast(meta.validSlots, 0) ||
    meta.validSlots > meta.slots ||
    !isIntegerAtLeast(meta.nextGeneration, 0)
  ) {
    return failure('invalid-value', 'History metadata is invalid.');
  }

  const text = JSON.stringify([
    LCL_HISTORY_FORMAT_VERSION,
    meta.slots,
    meta.nextSlot,
    meta.validSlots,
    meta.nextGeneration
  ] satisfies EncodedMeta);
  return text.length <= LCL_HISTORY_MAX_VALUE_CHARS
    ? success(text)
    : failure('value-too-long', 'History metadata exceeds the Shelly KVS value limit.');
};

export const decodeLclHistoryMeta = (value: unknown): LclHistoryCodecResult<LclHistoryMeta> => {
  if (typeof value !== 'string') {
    return failure('invalid-value', 'History metadata must be a JSON string.');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return failure('invalid-value', 'History metadata is not valid JSON.');
  }
  if (!Array.isArray(parsed) || parsed.length !== 5) {
    return failure('invalid-value', 'History metadata shape is invalid.');
  }
  const [version, slots, nextSlot, validSlots, nextGeneration] = parsed;
  const meta: LclHistoryMeta = {
    version: version as typeof LCL_HISTORY_FORMAT_VERSION,
    slots: slots as number,
    nextSlot: nextSlot as number,
    validSlots: validSlots as number,
    nextGeneration: nextGeneration as number
  };
  const encoded = encodeLclHistoryMeta(meta);
  return encoded.ok ? success(meta) : encoded;
};

export const encodeLclHistorySegment = (
  segment: LclHistorySegment
): LclHistoryCodecResult<string> => {
  if (
    segment.version !== LCL_HISTORY_FORMAT_VERSION ||
    !isIntegerAtLeast(segment.generation, 0) ||
    segment.samples.length === 0
  ) {
    return failure('invalid-value', 'History segment header is invalid.');
  }

  const validatedSamples: LclHistorySample[] = [];
  for (const sample of segment.samples) {
    const validated = validateSample(sample);
    if (!validated.ok) return validated;
    validatedSamples.push(validated.value);
  }

  const baseUptimeSec = validatedSamples[0]!.uptimeSec;
  const baseTimestampSec =
    validatedSamples.find((sample) => sample.timestampSec !== null)?.timestampSec ?? null;
  let previousUptimeSec = baseUptimeSec;
  const records: EncodedRecord[] = [];

  for (const sample of validatedSamples) {
    if (sample.uptimeSec < previousUptimeSec) {
      return failure('invalid-value', 'History sample uptime must be monotonic within a segment.');
    }
    previousUptimeSec = sample.uptimeSec;
    records.push([
      sample.timestampSec === null || baseTimestampSec === null
        ? null
        : sample.timestampSec - baseTimestampSec,
      sample.uptimeSec - baseUptimeSec,
      scale(sample.temperatureC, 10),
      scale(sample.humidityPct, 10),
      scale(sample.vpdKpa, 100),
      encodeFlags(sample),
      sample.reason,
      sample.automationFault,
      sample.safetyReason,
      scale(sample.powerW, 10),
      scale(sample.currentA, 1_000)
    ]);
  }

  const text = JSON.stringify([
    LCL_HISTORY_FORMAT_VERSION,
    segment.generation,
    baseTimestampSec,
    baseUptimeSec,
    records
  ] satisfies EncodedSegment);
  return text.length <= LCL_HISTORY_MAX_VALUE_CHARS
    ? success(text)
    : failure('value-too-long', 'History segment exceeds the Shelly KVS value limit.');
};

export const decodeLclHistorySegment = (
  value: unknown
): LclHistoryCodecResult<LclHistorySegment> => {
  if (typeof value !== 'string') {
    return failure('invalid-value', 'History segment must be a JSON string.');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return failure('invalid-value', 'History segment is not valid JSON.');
  }
  if (!Array.isArray(parsed) || parsed.length !== 5) {
    return failure('invalid-value', 'History segment shape is invalid.');
  }

  const [version, generation, baseTimestampSec, baseUptimeSec, rawRecords] = parsed;
  if (
    version !== LCL_HISTORY_FORMAT_VERSION ||
    !isIntegerAtLeast(generation, 0) ||
    (baseTimestampSec !== null && !isIntegerAtLeast(baseTimestampSec, 0)) ||
    !isIntegerAtLeast(baseUptimeSec, 0) ||
    !Array.isArray(rawRecords) ||
    rawRecords.length === 0
  ) {
    return failure('invalid-value', 'History segment header is invalid.');
  }

  const samples: LclHistorySample[] = [];
  let previousUptimeSec = baseUptimeSec;
  for (const rawRecord of rawRecords) {
    if (!Array.isArray(rawRecord) || rawRecord.length !== 11) {
      return failure('invalid-value', 'History record shape is invalid.');
    }
    const [
      timestampDeltaSec,
      uptimeDeltaSec,
      temperatureDeciC,
      humidityDeciPct,
      vpdCentiKpa,
      flags,
      rawReason,
      rawAutomationFault,
      rawSafetyReason,
      powerDeciW,
      currentMilliA
    ] = rawRecord;
    if (
      (timestampDeltaSec !== null && !isInteger(timestampDeltaSec)) ||
      !isIntegerAtLeast(uptimeDeltaSec, 0) ||
      !isIntegerAtLeast(flags, 0) ||
      flags > KNOWN_FLAGS_MASK ||
      [temperatureDeciC, humidityDeciPct, vpdCentiKpa, powerDeciW, currentMilliA].some(
        (entry) => entry !== null && !isInteger(entry)
      )
    ) {
      return failure('invalid-value', 'History record value is invalid.');
    }
    if (timestampDeltaSec !== null && baseTimestampSec === null) {
      return failure('invalid-value', 'History timestamp delta requires a base timestamp.');
    }

    const reason = contextFromUnknown(rawReason);
    const automationFault = contextFromUnknown(rawAutomationFault);
    const safetyReason = contextFromUnknown(rawSafetyReason);
    if (reason === undefined || automationFault === undefined || safetyReason === undefined) {
      return failure('invalid-value', 'History context text is invalid.');
    }

    const uptimeSec = baseUptimeSec + uptimeDeltaSec;
    if (!Number.isSafeInteger(uptimeSec) || uptimeSec < previousUptimeSec) {
      return failure('invalid-value', 'History sample uptime is invalid.');
    }
    previousUptimeSec = uptimeSec;

    const timestampSec =
      timestampDeltaSec === null || baseTimestampSec === null
        ? null
        : baseTimestampSec + timestampDeltaSec;
    if (timestampSec !== null && (!Number.isSafeInteger(timestampSec) || timestampSec < 0)) {
      return failure('invalid-value', 'History sample timestamp is invalid.');
    }

    const sample: LclHistorySample = {
      timestampSec,
      uptimeSec,
      temperatureC: unscale(temperatureDeciC as number | null, 10),
      humidityPct: unscale(humidityDeciPct as number | null, 10),
      vpdKpa: unscale(vpdCentiKpa as number | null, 100),
      automationRequestedOn: (flags & FLAG_AUTOMATION_REQUESTED_ON) !== 0,
      finalRelayOn: (flags & FLAG_FINAL_RELAY_ON) !== 0,
      controlMode: (flags & FLAG_MANUAL_MODE) !== 0 ? 'manual' : 'auto',
      manualRequestOn: (flags & FLAG_MANUAL_REQUEST_ON) !== 0,
      reason,
      automationFault,
      safetyLockout: (flags & FLAG_SAFETY_LOCKOUT) !== 0,
      safetyReason,
      powerW: unscale(powerDeciW as number | null, 10),
      currentA: unscale(currentMilliA as number | null, 1_000)
    };
    const validated = validateSample(sample);
    if (!validated.ok) return validated;
    samples.push(sample);
  }

  return success({
    version: LCL_HISTORY_FORMAT_VERSION,
    generation,
    samples
  });
};

export const createLclHistorySegment = (
  generation: number,
  sample: LclHistorySample
): LclHistoryCodecResult<LclHistorySegment> => {
  const segment: LclHistorySegment = {
    version: LCL_HISTORY_FORMAT_VERSION,
    generation,
    samples: [sample]
  };
  const encoded = encodeLclHistorySegment(segment);
  return encoded.ok ? success(segment) : encoded;
};

export const appendLclHistorySample = (
  segment: LclHistorySegment,
  sample: LclHistorySample
): LclHistoryCodecResult<LclHistorySegment> => {
  const candidate: LclHistorySegment = {
    ...segment,
    samples: [...segment.samples, sample]
  };
  const encoded = encodeLclHistorySegment(candidate);
  return encoded.ok ? success(candidate) : encoded;
};

export const decodeLclHistoryKvsItems = (
  items: readonly LclHistoryKvsItem[]
): LclHistoryDecodedStore => {
  let meta: LclHistoryMeta | null = null;
  const decodedSegments: Array<{ slot: number; segment: LclHistorySegment }> = [];
  const invalidKeys: string[] = [];

  for (const item of items) {
    if (item.key === LCL_HISTORY_KVS_META_KEY) {
      const decoded = decodeLclHistoryMeta(item.value);
      if (decoded.ok) meta = decoded.value;
      else invalidKeys.push(item.key);
      continue;
    }
    const slot = parseLclHistorySegmentSlot(item.key);
    if (slot === null) continue;
    const decoded = decodeLclHistorySegment(item.value);
    if (decoded.ok) decodedSegments.push({ slot, segment: decoded.value });
    else invalidKeys.push(item.key);
  }

  const slots = meta?.slots ?? Math.min(
    LCL_HISTORY_MAX_SLOT_COUNT,
    Math.max(
      LCL_HISTORY_DEFAULT_SLOT_COUNT,
      decodedSegments.reduce((maximum, entry) => Math.max(maximum, entry.slot + 1), 0)
    )
  );
  const segments = decodedSegments
    .filter((entry) => entry.slot < slots)
    .sort((left, right) =>
      left.segment.generation === right.segment.generation
        ? left.slot - right.slot
        : left.segment.generation - right.segment.generation
    );
  const latest = segments.at(-1) ?? null;
  const nextGeneration = Math.max(
    meta?.nextGeneration ?? 0,
    latest ? latest.segment.generation + 1 : 0
  );
  const nextSlot = latest ? (latest.slot + 1) % slots : (meta?.nextSlot ?? 0);
  const validSlots = Math.min(segments.length, slots);

  return {
    meta,
    segments,
    samples: segments.flatMap(({ segment }) => segment.samples),
    invalidKeys,
    cursor: { slots, nextSlot, validSlots, nextGeneration }
  };
};
