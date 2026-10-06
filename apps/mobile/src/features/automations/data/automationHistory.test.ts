import {
  HISTORY_FORMAT_VERSION,
  HISTORY_KVS_META_KEY,
  encodeHistoryMeta,
  encodeHistorySegment,
  historySegmentKey,
  type HistoryRecord
} from '@lcl/automation-core';
import {
  RPC_METHODS,
  type Result,
  type ShellyClientError,
  type ShellyRpcRequest,
  type ShellyRpcTransport
} from '@lcl/shelly-client';
import { readAutomationHistory } from './automationHistory.js';

const record = (uptimeSec: number, finalRelayOn: boolean): HistoryRecord => ({
  timestampUnixSec: 1_790_000_000 + uptimeSec,
  uptimeSec,
  temperatureC: 22.5,
  humidityPct: 58,
  vpdKpa: 1.12,
  requestedRelayOn: finalRelayOn,
  finalRelayOn,
  controlMode: 'auto',
  manualRequestOn: false,
  reasonCode: finalRelayOn ? 'bl' : 'ab',
  automationFault: null,
  safetyLockout: false,
  safetyReason: null,
  powerW: finalRelayOn ? 12.3 : 0,
  currentA: finalRelayOn ? 0.055 : 0
});

const encodedMeta = (): string => {
  const result = encodeHistoryMeta({
    version: HISTORY_FORMAT_VERSION,
    slots: 24,
    nextSlot: 3,
    validSlots: 3
  });
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
};

const encodedSegment = (value: HistoryRecord): string => {
  const result = encodeHistorySegment({
    version: HISTORY_FORMAT_VERSION,
    records: [value]
  });
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
};

const successfulTransport = (): ShellyRpcTransport => ({
  async call<TResponse>(request: ShellyRpcRequest) {
    if (request.method !== RPC_METHODS.KvsGetMany) {
      throw new Error(`Unexpected RPC method: ${request.method}`);
    }
    return {
      ok: true,
      value: {
        items: [
          {
            key: historySegmentKey(1),
            etag: 's1',
            value: encodedSegment(record(20, true))
          },
          { key: HISTORY_KVS_META_KEY, etag: 'meta', value: encodedMeta() },
          {
            key: historySegmentKey(0),
            etag: 's0',
            value: encodedSegment(record(10, false))
          },
          { key: historySegmentKey(2), etag: 'bad', value: '{not-json' },
          { key: 'shellylink.history.extra', etag: 'extra', value: 'ignored' }
        ],
        offset: 0,
        total: 5
      } as TResponse
    };
  }
});

describe('readAutomationHistory', () => {
  it('reads matching KVS values and decodes ordered History v2 records', async () => {
    const result = await readAutomationHistory(successfulTransport());

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.meta).toEqual({
      version: HISTORY_FORMAT_VERSION,
      slots: 24,
      nextSlot: 3,
      validSlots: 3
    });
    expect(result.value.records).toEqual([record(10, false), record(20, true)]);
    expect(result.value.invalidKeys).toEqual([historySegmentKey(2)]);
    expect(result.value.segments.map(({ slot }) => slot)).toEqual([0, 1]);
  });

  it('propagates Shelly KVS transport failures without inventing History data', async () => {
    const error: ShellyClientError = {
      kind: 'shelly-offline',
      userMessageKey: 'errors.shellyOffline',
      technicalMessage: 'offline in test',
      retryable: true
    };
    const transport: ShellyRpcTransport = {
      async call<TResponse>(): Promise<Result<TResponse>> {
        return { ok: false, error };
      }
    };

    await expect(readAutomationHistory(transport)).resolves.toEqual({ ok: false, error });
  });
});
