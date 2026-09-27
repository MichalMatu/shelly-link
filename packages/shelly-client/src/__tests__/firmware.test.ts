import {
  RPC_METHODS,
  RpcShellyFirmwareClient,
  type Result,
  type ShellyRpcRequest,
  type ShellyRpcTransport
} from '../index.js';

class QueueTransport implements ShellyRpcTransport {
  readonly requests: ShellyRpcRequest[] = [];

  constructor(private readonly responses: Result<unknown>[]) {}

  async call<TResponse>(request: ShellyRpcRequest): Promise<Result<TResponse>> {
    this.requests.push(request);
    const response = this.responses.shift();
    if (!response) throw new Error('Missing queued Shelly RPC response.');
    return response as Result<TResponse>;
  }
}

const ok = (value: unknown): Result<unknown> => ({ ok: true, value });

describe('RpcShellyFirmwareClient', () => {
  it('checks for stable firmware updates when supported', async () => {
    const transport = new QueueTransport([
      ok({ methods: ['Shelly.CheckForUpdate', 'Shelly.Update'] }),
      ok({
        stable: {
          version: '2.0.0',
          build_id: '20260713-120000/2.0.0-gabcdef'
        }
      })
    ]);

    await expect(new RpcShellyFirmwareClient(transport).read()).resolves.toEqual({
      ok: true,
      value: {
        supported: true,
        canUpdate: true,
        updates: {
          stable: {
            version: '2.0.0',
            build_id: '20260713-120000/2.0.0-gabcdef'
          }
        }
      }
    });
    expect(transport.requests.map((request) => request.method)).toEqual([
      RPC_METHODS.ShellyListMethods,
      RPC_METHODS.ShellyCheckForUpdate
    ]);
  });

  it('degrades cleanly when update checking is not advertised', async () => {
    const transport = new QueueTransport([ok({ methods: ['Shelly.GetStatus'] })]);

    await expect(new RpcShellyFirmwareClient(transport).read()).resolves.toEqual({
      ok: true,
      value: { supported: false }
    });
    expect(transport.requests).toHaveLength(1);
  });

  it('sends one explicit stable update mutation after capability verification', async () => {
    const transport = new QueueTransport([ok({ methods: ['Shelly.Update'] }), ok(null)]);

    await expect(new RpcShellyFirmwareClient(transport).updateStable()).resolves.toEqual({
      ok: true,
      value: null
    });
    expect(transport.requests).toEqual([
      { method: RPC_METHODS.ShellyListMethods },
      { method: RPC_METHODS.ShellyUpdate, params: { stage: 'stable' } }
    ]);
  });

  it('does not send an update mutation when Shelly.Update is unavailable', async () => {
    const transport = new QueueTransport([ok({ methods: ['Shelly.CheckForUpdate'] })]);

    const result = await new RpcShellyFirmwareClient(transport).updateStable();
    expect(result).toMatchObject({
      ok: false,
      error: { kind: 'validation-failed', retryable: false }
    });
    expect(transport.requests).toEqual([{ method: RPC_METHODS.ShellyListMethods }]);
  });
});
