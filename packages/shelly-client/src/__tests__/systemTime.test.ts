import { describe, expect, it, vi } from 'vitest';
import {
  RPC_METHODS,
  setShellySystemTime,
  type ShellyRpcRequest,
  type ShellyRpcTransport
} from '../index.js';

class RecordingTransport implements ShellyRpcTransport {
  readonly requests: ShellyRpcRequest[] = [];

  async call<TResponse>(request: ShellyRpcRequest) {
    this.requests.push(request);
    return { ok: true as const, value: null as TResponse };
  }
}

describe('setShellySystemTime', () => {
  it('sends Sys.SetTime with phone epoch seconds capped to millisecond precision', async () => {
    const transport = new RecordingTransport();

    await expect(setShellySystemTime(transport, 1_800_000_000.1239)).resolves.toEqual({
      ok: true,
      value: null
    });
    expect(transport.requests).toEqual([
      {
        method: RPC_METHODS.SysSetTime,
        params: { unixtime: 1_800_000_000.123 }
      }
    ]);
  });

  it('rejects invalid time before sending an RPC mutation', async () => {
    const transport = new RecordingTransport();
    const callSpy = vi.spyOn(transport, 'call');

    await expect(setShellySystemTime(transport, Number.NaN)).resolves.toMatchObject({
      ok: false,
      error: { kind: 'validation-failed' }
    });
    expect(callSpy).not.toHaveBeenCalled();
  });
});
