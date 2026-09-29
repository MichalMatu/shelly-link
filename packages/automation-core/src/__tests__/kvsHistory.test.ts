import { describe, expect, it } from 'vitest';
import {
  LCL_HISTORY_FORMAT_VERSION,
  LCL_HISTORY_KVS_META_KEY,
  LCL_HISTORY_MAX_VALUE_CHARS,
  appendLclHistorySample,
  createLclHistorySegment,
  decodeLclHistoryKvsItems,
  decodeLclHistoryMeta,
  decodeLclHistorySegment,
  encodeLclHistoryMeta,
  encodeLclHistorySegment,
  lclHistorySegmentKey,
  parseLclHistorySegmentSlot,
  type LclHistorySample
} from '../history/kvsHistory.js';

const sample = (overrides: Partial<LclHistorySample> = {}): LclHistorySample => ({
  timestampSec: 1_790_000_000,
  uptimeSec: 12_000,
  temperatureC: 23.4,
  humidityPct: 55.1,
  vpdKpa: 1.27,
  automationRequestedOn: true,
  finalRelayOn: true,
  controlMode: 'auto',
  manualRequestOn: false,
  reason: 'ab',
  automationFault: null,
  safetyLockout: false,
  safetyReason: null,
  powerW: 31.2,
  currentA: 0.136,
  ...overrides
});

describe('History v2 KVS codec', () => {
  it('round-trips full operational context', () => {
    const segment = createLclHistorySegment(17, sample());
    expect(segment.ok).toBe(true);
    if (!segment.ok) return;

    const encoded = encodeLclHistorySegment(segment.value);
    expect(encoded.ok).toBe(true);
    if (!encoded.ok) return;
    expect(encoded.value.length).toBeLessThanOrEqual(LCL_HISTORY_MAX_VALUE_CHARS);

    expect(decodeLclHistorySegment(encoded.value)).toEqual({
      ok: true,
      value: segment.value
    });
  });

  it('preserves missing wall clock and optional telemetry', () => {
    const source = sample({
      timestampSec: null,
      temperatureC: null,
      humidityPct: null,
      vpdKpa: null,
      automationRequestedOn: false,
      finalRelayOn: false,
      reason: 'st',
      automationFault: 'st',
      powerW: null,
      currentA: null
    });
    const segment = createLclHistorySegment(0, source);
    expect(segment.ok).toBe(true);
    if (!segment.ok) return;
    const encoded = encodeLclHistorySegment(segment.value);
    expect(encoded.ok).toBe(true);
    if (!encoded.ok) return;
    expect(decodeLclHistorySegment(encoded.value)).toEqual({
      ok: true,
      value: segment.value
    });
  });

  it('packs samples until the Shelly KVS value boundary', () => {
    const created = createLclHistorySegment(3, sample());
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    let segment = created.value;
    let rejected = false;
    for (let index = 1; index <= 20; index += 1) {
      const next = appendLclHistorySample(
        segment,
        sample({
          timestampSec: 1_790_000_000 + index * 60,
          uptimeSec: 12_000 + index * 60,
          reason: index % 2 === 0 ? 'ib' : 'ab'
        })
      );
      if (!next.ok) {
        expect(next.error.code).toBe('value-too-long');
        rejected = true;
        break;
      }
      segment = next.value;
    }

    expect(rejected).toBe(true);
    expect(segment.samples.length).toBeGreaterThan(1);
    const encoded = encodeLclHistorySegment(segment);
    expect(encoded.ok).toBe(true);
    if (encoded.ok) {
      expect(encoded.value.length).toBeLessThanOrEqual(LCL_HISTORY_MAX_VALUE_CHARS);
    }
  });

  it('orders wrapped slots by generation and recovers a stale write cursor', () => {
    const meta = encodeLclHistoryMeta({
      version: LCL_HISTORY_FORMAT_VERSION,
      slots: 4,
      nextSlot: 3,
      validSlots: 1,
      nextGeneration: 9
    });
    const older = createLclHistorySegment(8, sample({ uptimeSec: 100 }));
    const newer = createLclHistorySegment(
      9,
      sample({ timestampSec: 1_790_000_060, uptimeSec: 160, finalRelayOn: false })
    );
    expect(meta.ok && older.ok && newer.ok).toBe(true);
    if (!meta.ok || !older.ok || !newer.ok) return;

    const olderEncoded = encodeLclHistorySegment(older.value);
    const newerEncoded = encodeLclHistorySegment(newer.value);
    expect(olderEncoded.ok && newerEncoded.ok).toBe(true);
    if (!olderEncoded.ok || !newerEncoded.ok) return;

    const decoded = decodeLclHistoryKvsItems([
      { key: LCL_HISTORY_KVS_META_KEY, value: meta.value },
      { key: lclHistorySegmentKey(3), value: newerEncoded.value },
      { key: lclHistorySegmentKey(2), value: olderEncoded.value }
    ]);

    expect(decoded.segments.map(({ segment }) => segment.generation)).toEqual([8, 9]);
    expect(decoded.samples).toHaveLength(2);
    expect(decoded.cursor).toEqual({
      slots: 4,
      nextSlot: 0,
      validSlots: 2,
      nextGeneration: 10
    });
  });

  it('validates metadata and history slot keys', () => {
    const encoded = encodeLclHistoryMeta({
      version: LCL_HISTORY_FORMAT_VERSION,
      slots: 24,
      nextSlot: 7,
      validSlots: 24,
      nextGeneration: 81
    });
    expect(encoded.ok).toBe(true);
    if (!encoded.ok) return;
    expect(decodeLclHistoryMeta(encoded.value)).toEqual({
      ok: true,
      value: {
        version: LCL_HISTORY_FORMAT_VERSION,
        slots: 24,
        nextSlot: 7,
        validSlots: 24,
        nextGeneration: 81
      }
    });
    expect(lclHistorySegmentKey(0)).toBe('lcl.hist.00');
    expect(parseLclHistorySegmentSlot('lcl.hist.31')).toBe(31);
    expect(parseLclHistorySegmentSlot('lcl.hist.32')).toBeNull();
    expect(parseLclHistorySegmentSlot('lcl.tail.00')).toBeNull();
  });

  it('rejects impossible safety and control state combinations', () => {
    expect(
      createLclHistorySegment(
        0,
        sample({ controlMode: 'auto', manualRequestOn: true })
      )
    ).toMatchObject({ ok: false, error: { code: 'invalid-value' } });
    expect(
      createLclHistorySegment(
        0,
        sample({ safetyLockout: true, safetyReason: 'lk', finalRelayOn: true })
      )
    ).toMatchObject({ ok: false, error: { code: 'invalid-value' } });
    expect(
      createLclHistorySegment(0, sample({ safetyLockout: true, safetyReason: null }))
    ).toMatchObject({ ok: false, error: { code: 'invalid-value' } });
  });
});
