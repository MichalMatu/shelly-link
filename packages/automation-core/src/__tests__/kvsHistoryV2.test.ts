import { describe, expect, it } from 'vitest';
import {
  HISTORY_FORMAT_VERSION,
  HISTORY_KVS_META_KEY,
  HISTORY_KVS_PREFIX,
  HISTORY_MAX_SLOT_COUNT,
  HISTORY_MAX_VALUE_CHARS,
  appendHistoryRecord,
  createHistorySegment,
  decodeHistoryKvsItems,
  decodeHistoryMeta,
  decodeHistorySegment,
  encodeHistoryMeta,
  encodeHistorySegment,
  historyRecordChangedEnough,
  historySegmentKey,
  parseHistorySegmentSlot,
  type HistoryCodecResult,
  type HistoryMeta,
  type HistoryRecord,
  type HistorySegment
} from '../history/kvsHistoryV2.js';
import {
  decodeHistoryRecord,
  encodeHistoryRecord,
  validateHistoryRecord,
  type EncodedHistoryRecord
} from '../history/historyV2Record.js';

const record = (patch: Partial<HistoryRecord> = {}): HistoryRecord => ({
  timestampUnixSec: 1_790_700_000,
  uptimeSec: 12_345,
  temperatureC: 23.4,
  humidityPct: 55.1,
  vpdKpa: 1.234,
  requestedRelayOn: true,
  finalRelayOn: true,
  controlMode: 'auto',
  manualRequestOn: false,
  reasonCode: 'ab',
  automationFault: null,
  safetyLockout: false,
  safetyReason: null,
  powerW: 123.4,
  currentA: 0.456,
  ...patch
});

const expectInvalid = (result: HistoryCodecResult<unknown>) => {
  expect(result).toMatchObject({ ok: false, error: { code: 'invalid-value' } });
};

const mutateEncodedRecord = (
  source: EncodedHistoryRecord,
  index: number,
  value: unknown
): unknown[] => {
  const mutated: unknown[] = [...source];
  mutated[index] = value;
  return mutated;
};

const encodedSegment = (value: HistoryRecord = record()): string => {
  const encoded = encodeHistorySegment({
    version: HISTORY_FORMAT_VERSION,
    records: [value]
  });
  expect(encoded.ok).toBe(true);
  if (!encoded.ok) throw new Error(encoded.error.message);
  return encoded.value;
};

describe('History v2 record codec', () => {
  it('round-trips every flag and nullable telemetry branch', () => {
    const allFlags = record({
      requestedRelayOn: true,
      finalRelayOn: true,
      controlMode: 'manual',
      manualRequestOn: true,
      automationFault: 'sensor-stale',
      safetyLockout: true,
      safetyReason: 'max-on'
    });
    expect(decodeHistoryRecord(encodeHistoryRecord(allFlags))).toEqual({
      ok: true,
      value: allFlags
    });

    const allClear = record({
      timestampUnixSec: null,
      temperatureC: null,
      humidityPct: null,
      vpdKpa: null,
      requestedRelayOn: false,
      finalRelayOn: false,
      controlMode: 'auto',
      manualRequestOn: false,
      automationFault: null,
      safetyLockout: false,
      safetyReason: null,
      powerW: null,
      currentA: null
    });
    expect(decodeHistoryRecord(encodeHistoryRecord(allClear))).toEqual({
      ok: true,
      value: allClear
    });
  });

  it('rejects every invalid domain field at the record boundary', () => {
    const invalidRecords: HistoryRecord[] = [
      record({ timestampUnixSec: -1 }),
      record({ uptimeSec: -1 }),
      record({ uptimeSec: 1.5 }),
      record({ temperatureC: Number.NaN }),
      record({ humidityPct: -1 }),
      record({ humidityPct: 101 }),
      record({ vpdKpa: 21 }),
      record({ controlMode: 'invalid' as HistoryRecord['controlMode'] }),
      record({ reasonCode: '' }),
      record({ reasonCode: 'x'.repeat(25) }),
      record({ reasonCode: 'bad\ncode' }),
      record({ reasonCode: null as unknown as string }),
      record({ automationFault: 'x'.repeat(25) }),
      record({ automationFault: 'bad\nfault' }),
      record({ safetyReason: 'x'.repeat(25) }),
      record({ safetyReason: 'bad\nsafety' }),
      record({ powerW: 100_001 }),
      record({ currentA: -1 }),
      record({ currentA: 1_001 })
    ];

    for (const invalidRecord of invalidRecords) {
      expectInvalid(validateHistoryRecord(invalidRecord));
    }
    expect(validateHistoryRecord(record())).toEqual({ ok: true, value: record() });
  });

  it('rejects every malformed compact record field', () => {
    const valid = encodeHistoryRecord(
      record({ automationFault: 'fault', safetyReason: 'safe', controlMode: 'manual' })
    );
    const malformed: unknown[] = [
      null,
      valid.slice(0, 10),
      mutateEncodedRecord(valid, 0, 'bad'),
      mutateEncodedRecord(valid, 1, -1),
      mutateEncodedRecord(valid, 2, 1.5),
      mutateEncodedRecord(valid, 3, 'bad'),
      mutateEncodedRecord(valid, 4, 1.5),
      mutateEncodedRecord(valid, 5, 'bad'),
      mutateEncodedRecord(valid, 5, 32),
      mutateEncodedRecord(valid, 6, 7),
      mutateEncodedRecord(valid, 7, 7),
      mutateEncodedRecord(valid, 8, 7),
      mutateEncodedRecord(valid, 9, 1.5),
      mutateEncodedRecord(valid, 10, 'bad')
    ];

    for (const raw of malformed) expectInvalid(decodeHistoryRecord(raw));
  });
});

describe('History v2 KVS codec', () => {
  it('round-trips the complete operational context within the KVS value limit', () => {
    const segment = createHistorySegment(
      record({
        controlMode: 'manual',
        manualRequestOn: true,
        automationFault: 'sensor-stale',
        safetyLockout: true,
        safetyReason: 'max-on'
      })
    );
    expect(segment.ok).toBe(true);
    if (!segment.ok) return;

    const encoded = encodeHistorySegment(segment.value);
    expect(encoded.ok).toBe(true);
    if (!encoded.ok) return;
    expect(encoded.value.length).toBeLessThanOrEqual(HISTORY_MAX_VALUE_CHARS);
    expect(decodeHistorySegment(encoded.value)).toEqual({
      ok: true,
      value: segment.value
    });
  });

  it('validates every metadata bound and decode failure mode', () => {
    const valid: HistoryMeta = {
      version: HISTORY_FORMAT_VERSION,
      slots: 3,
      nextSlot: 1,
      validSlots: 2
    };
    expect(encodeHistoryMeta(valid)).toEqual({ ok: true, value: '[2,3,1,2]' });

    const invalidMeta: HistoryMeta[] = [
      { ...valid, version: 1 as typeof HISTORY_FORMAT_VERSION },
      { ...valid, slots: 'bad' as unknown as number },
      { ...valid, slots: 0 },
      { ...valid, slots: 1.5 },
      { ...valid, slots: HISTORY_MAX_SLOT_COUNT + 1 },
      { ...valid, nextSlot: -1 },
      { ...valid, nextSlot: 1.5 },
      { ...valid, nextSlot: valid.slots },
      { ...valid, validSlots: -1 },
      { ...valid, validSlots: 1.5 },
      { ...valid, validSlots: valid.slots + 1 }
    ];
    for (const meta of invalidMeta) expectInvalid(encodeHistoryMeta(meta));

    expectInvalid(decodeHistoryMeta(42));
    expectInvalid(decodeHistoryMeta('{'));
    expectInvalid(decodeHistoryMeta('{}'));
    expectInvalid(decodeHistoryMeta('[2,3,1]'));
    expectInvalid(decodeHistoryMeta('[2,0,0,0]'));
    expect(decodeHistoryMeta('[2,3,1,2]')).toEqual({ ok: true, value: valid });
  });

  it('rejects every malformed segment envelope and invalid record', () => {
    const wrongVersion: HistorySegment = {
      version: 1 as typeof HISTORY_FORMAT_VERSION,
      records: [record()]
    };
    expectInvalid(encodeHistorySegment(wrongVersion));
    expectInvalid(encodeHistorySegment({ version: HISTORY_FORMAT_VERSION, records: [] }));
    expectInvalid(
      encodeHistorySegment({
        version: HISTORY_FORMAT_VERSION,
        records: [record({ humidityPct: 101 })]
      })
    );
    expectInvalid(createHistorySegment(record({ currentA: -1 })));

    expectInvalid(decodeHistorySegment(42));
    expectInvalid(decodeHistorySegment('{'));
    expectInvalid(decodeHistorySegment('{}'));
    expectInvalid(decodeHistorySegment('[2]'));
    expectInvalid(decodeHistorySegment('[1,[[1,2,3]]]'));
    expectInvalid(decodeHistorySegment('[2,{}]'));
    expectInvalid(decodeHistorySegment('[2,[]]'));
    expectInvalid(decodeHistorySegment('[2,[[1,2,230,500,1000,32,"ok",null,null,0,0]]]'));
  });

  it('appends records only while the Shelly KVS value limit is respected', () => {
    const first = createHistorySegment(record());
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    let segment = first.value;
    let appended = 0;
    for (let index = 0; index < 20; index += 1) {
      const next = appendHistoryRecord(
        segment,
        record({ timestampUnixSec: 1_790_700_001 + index, uptimeSec: 12_346 + index })
      );
      if (!next.ok) {
        expect(next.error.code).toBe('value-too-long');
        break;
      }
      appended += 1;
      segment = next.value;
    }

    expect(appended).toBeGreaterThan(0);
    const encoded = encodeHistorySegment(segment);
    expect(encoded.ok).toBe(true);
    if (encoded.ok)
      expect(encoded.value.length).toBeLessThanOrEqual(HISTORY_MAX_VALUE_CHARS);
  });

  it('covers every slot-key parser and range boundary', () => {
    expect(historySegmentKey(0)).toBe('shellylink.history.00');
    expect(historySegmentKey(31)).toBe('shellylink.history.31');
    expect(() => historySegmentKey(0.5)).toThrow(RangeError);
    expect(() => historySegmentKey(-1)).toThrow(RangeError);
    expect(() => historySegmentKey(32)).toThrow(RangeError);

    expect(parseHistorySegmentSlot('other.00')).toBeNull();
    expect(parseHistorySegmentSlot(`${HISTORY_KVS_PREFIX}x`)).toBeNull();
    expect(parseHistorySegmentSlot(`${HISTORY_KVS_PREFIX}000`)).toBeNull();
    expect(parseHistorySegmentSlot(`${HISTORY_KVS_PREFIX}31`)).toBe(31);
    expect(parseHistorySegmentSlot(`${HISTORY_KVS_PREFIX}32`)).toBeNull();
  });

  it('treats every control and safety transition as significant', () => {
    const base = record();
    const transitions: HistoryRecord[] = [
      { ...base, requestedRelayOn: false },
      { ...base, finalRelayOn: false },
      { ...base, controlMode: 'manual' },
      { ...base, manualRequestOn: true },
      { ...base, reasonCode: 'mc' },
      { ...base, automationFault: 'fault' },
      { ...base, safetyLockout: true },
      { ...base, safetyReason: 'safe' }
    ];
    expect(historyRecordChangedEnough(null, base)).toBe(true);
    for (const next of transitions)
      expect(historyRecordChangedEnough(base, next)).toBe(true);
  });

  it('checks climate deltas, nullable values and explicit thresholds', () => {
    const base = record();
    expect(historyRecordChangedEnough(base, base)).toBe(false);
    expect(historyRecordChangedEnough(base, { ...base, temperatureC: 23.8 })).toBe(true);
    expect(historyRecordChangedEnough(base, { ...base, humidityPct: 56.1 })).toBe(true);
    expect(historyRecordChangedEnough(base, { ...base, vpdKpa: 1.284 })).toBe(true);
    expect(historyRecordChangedEnough({ ...base, temperatureC: null }, base)).toBe(true);
    expect(historyRecordChangedEnough(base, { ...base, temperatureC: null })).toBe(true);
    expect(
      historyRecordChangedEnough(
        { ...base, temperatureC: null },
        { ...base, temperatureC: null }
      )
    ).toBe(false);
    expect(
      historyRecordChangedEnough(
        base,
        { ...base, temperatureC: 23.8 },
        {
          temperatureDeltaC: 1,
          humidityDeltaPct: 2,
          vpdDeltaKpa: 0.2
        }
      )
    ).toBe(false);
  });

  it('orders wrapped ring slots and reports corrupt metadata and segments', () => {
    const a = encodedSegment(record({ timestampUnixSec: 1 }));
    const b = encodedSegment(record({ timestampUnixSec: 2 }));
    const c = encodedSegment(record({ timestampUnixSec: 3 }));
    const meta = encodeHistoryMeta({
      version: HISTORY_FORMAT_VERSION,
      slots: 3,
      nextSlot: 1,
      validSlots: 3
    });
    expect(meta.ok).toBe(true);
    if (!meta.ok) return;

    const decoded = decodeHistoryKvsItems([
      { key: HISTORY_KVS_META_KEY, value: meta.value },
      { key: historySegmentKey(0), value: a },
      { key: historySegmentKey(1), value: b },
      { key: historySegmentKey(2), value: c },
      { key: historySegmentKey(3), value: 'broken' },
      { key: 'unrelated', value: 'ignored' }
    ]);

    expect(decoded.segments.map(({ slot }) => slot)).toEqual([1, 2, 0]);
    expect(decoded.records.map(({ timestampUnixSec }) => timestampUnixSec)).toEqual([
      2, 3, 1
    ]);
    expect(decoded.invalidKeys).toEqual([historySegmentKey(3)]);

    const corruptMeta = decodeHistoryKvsItems([
      { key: HISTORY_KVS_META_KEY, value: 'broken' },
      { key: historySegmentKey(2), value: c },
      { key: historySegmentKey(0), value: a }
    ]);
    expect(corruptMeta.meta).toBeNull();
    expect(corruptMeta.segments.map(({ slot }) => slot)).toEqual([0, 2]);
    expect(corruptMeta.invalidKeys).toEqual([HISTORY_KVS_META_KEY]);
  });

  it('skips missing and zero-length ring windows without inventing records', () => {
    const meta = encodeHistoryMeta({
      version: HISTORY_FORMAT_VERSION,
      slots: 3,
      nextSlot: 0,
      validSlots: 2
    });
    const emptyMeta = encodeHistoryMeta({
      version: HISTORY_FORMAT_VERSION,
      slots: 3,
      nextSlot: 0,
      validSlots: 0
    });
    expect(meta.ok && emptyMeta.ok).toBe(true);
    if (!meta.ok || !emptyMeta.ok) return;

    const onlySlot = {
      key: historySegmentKey(1),
      value: encodedSegment(record({ timestampUnixSec: 1 }))
    };
    expect(
      decodeHistoryKvsItems([
        { key: HISTORY_KVS_META_KEY, value: meta.value },
        onlySlot
      ]).segments.map(({ slot }) => slot)
    ).toEqual([1]);
    expect(
      decodeHistoryKvsItems([
        { key: HISTORY_KVS_META_KEY, value: emptyMeta.value },
        onlySlot
      ]).segments
    ).toEqual([]);
  });
});
