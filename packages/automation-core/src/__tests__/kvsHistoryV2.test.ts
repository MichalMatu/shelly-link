import { describe, expect, it } from 'vitest';
import {
  HISTORY_FORMAT_VERSION,
  HISTORY_KVS_META_KEY,
  HISTORY_MAX_VALUE_CHARS,
  appendHistoryRecord,
  createHistorySegment,
  decodeHistoryKvsItems,
  decodeHistorySegment,
  encodeHistoryMeta,
  encodeHistorySegment,
  historyRecordChangedEnough,
  historySegmentKey,
  parseHistorySegmentSlot,
  type HistoryRecord
} from '../history/kvsHistoryV2.js';

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

describe('History v2 KVS codec', () => {
  it('round-trips the complete operational context with compact precision', () => {
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

  it('supports unsynced wall time while preserving uptime ordering', () => {
    const segment = createHistorySegment(
      record({ timestampUnixSec: null, uptimeSec: 321, powerW: null, currentA: null })
    );
    expect(segment.ok).toBe(true);
    if (!segment.ok) return;

    const encoded = encodeHistorySegment(segment.value);
    expect(encoded.ok).toBe(true);
    if (!encoded.ok) return;

    const decoded = decodeHistorySegment(encoded.value);
    expect(decoded).toMatchObject({ ok: true });
    if (!decoded.ok) return;
    expect(decoded.value.records[0]).toMatchObject({
      timestampUnixSec: null,
      uptimeSec: 321,
      powerW: null,
      currentA: null
    });
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

  it('rejects malformed flags, out-of-range values and unknown versions', () => {
    expect(
      decodeHistorySegment('[2,[[1,2,230,500,1000,32,"ok",null,null,0,0]]]')
    ).toMatchObject({
      ok: false,
      error: { code: 'invalid-value' }
    });
    expect(createHistorySegment(record({ humidityPct: 101 }))).toMatchObject({
      ok: false,
      error: { code: 'invalid-value' }
    });
    expect(decodeHistorySegment('[1,[]]')).toMatchObject({
      ok: false,
      error: { code: 'invalid-value' }
    });
  });

  it('orders wrapped ring slots using metadata and reports corrupt slots', () => {
    const a = encodeHistorySegment({
      version: HISTORY_FORMAT_VERSION,
      records: [record()]
    });
    const b = encodeHistorySegment({
      version: HISTORY_FORMAT_VERSION,
      records: [record({ timestampUnixSec: 1_790_700_001 })]
    });
    const c = encodeHistorySegment({
      version: HISTORY_FORMAT_VERSION,
      records: [record({ timestampUnixSec: 1_790_700_002 })]
    });
    const meta = encodeHistoryMeta({
      version: HISTORY_FORMAT_VERSION,
      slots: 3,
      nextSlot: 1,
      validSlots: 3
    });
    expect(a.ok && b.ok && c.ok && meta.ok).toBe(true);
    if (!a.ok || !b.ok || !c.ok || !meta.ok) return;

    const decoded = decodeHistoryKvsItems([
      { key: HISTORY_KVS_META_KEY, value: meta.value },
      { key: historySegmentKey(0), value: a.value },
      { key: historySegmentKey(1), value: b.value },
      { key: historySegmentKey(2), value: c.value },
      { key: historySegmentKey(3), value: 'broken' }
    ]);

    expect(decoded.segments.map(({ slot }) => slot)).toEqual([1, 2, 0]);
    expect(decoded.invalidKeys).toEqual([historySegmentKey(3)]);
  });

  it('treats control/safety transitions as significant even without climate change', () => {
    const base = record();
    expect(historyRecordChangedEnough(base, { ...base, finalRelayOn: false })).toBe(true);
    expect(historyRecordChangedEnough(base, { ...base, safetyLockout: true })).toBe(true);
    expect(historyRecordChangedEnough(base, { ...base, reasonCode: 'mc' })).toBe(true);
    expect(historyRecordChangedEnough(base, { ...base, temperatureC: 23.5 })).toBe(false);
    expect(historyRecordChangedEnough(base, { ...base, temperatureC: 23.8 })).toBe(true);
  });

  it('uses bounded namespaced slot keys', () => {
    expect(historySegmentKey(0)).toBe('shellylink.history.00');
    expect(parseHistorySegmentSlot('shellylink.history.31')).toBe(31);
    expect(parseHistorySegmentSlot('shellylink.history.32')).toBeNull();
    expect(() => historySegmentKey(32)).toThrow(RangeError);
  });
});
