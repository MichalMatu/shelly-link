import { describe, expect, it } from 'vitest';
import {
  RPC_METHODS,
  RpcShellyClient,
  type Result,
  type ShellyClientError,
  type ShellyRpcRequest,
  type ShellyRpcTransport
} from '../index.js';

type ScriptState = {
  id: number;
  name: string;
  enable: boolean;
  running: boolean;
  code: string;
};

const failure = (message: string): Result<never> => ({
  ok: false,
  error: {
    kind: 'script-upload-failed',
    userMessageKey: 'errors.scriptUploadFailed',
    technicalMessage: message,
    retryable: true
  }
});

class ReplacementTransport implements ShellyRpcTransport {
  readonly requests: ShellyRpcRequest[] = [];
  failNextPut = false;
  failNextSetConfig = false;
  failNextStart = false;
  failNextStatusVerification = false;
  failRollbackPut = false;
  relayOn = true;
  readonly originalCode: string;

  constructor(readonly script: ScriptState) {
    this.originalCode = script.code;
  }

  async call<TResponse>(
    request: ShellyRpcRequest
  ): Promise<Result<TResponse, ShellyClientError>> {
    this.requests.push(request);

    if (request.method === RPC_METHODS.ScriptList) {
      return {
        ok: true,
        value: {
          scripts: [
            {
              id: this.script.id,
              name: this.script.name,
              enable: this.script.enable,
              running: this.script.running
            }
          ]
        } as TResponse
      };
    }

    if (request.method === RPC_METHODS.ScriptGetCode) {
      const params = request.params as { offset?: number; len?: number };
      const offset = params.offset ?? 0;
      const len = params.len ?? 1024;
      const data = this.script.code.slice(offset, offset + len);
      return {
        ok: true,
        value: {
          data,
          left: Math.max(this.script.code.length - offset - data.length, 0)
        } as TResponse
      };
    }

    if (request.method === RPC_METHODS.ScriptStop) {
      this.script.running = false;
      return { ok: true, value: null as TResponse };
    }

    if (request.method === RPC_METHODS.SwitchSet) {
      const params = request.params as { on: boolean };
      this.relayOn = params.on;
      return { ok: true, value: null as TResponse };
    }

    if (request.method === RPC_METHODS.SwitchGetStatus) {
      return {
        ok: true,
        value: { id: 2, output: this.relayOn } as TResponse
      };
    }

    if (request.method === RPC_METHODS.ScriptPutCode) {
      const params = request.params as { code: string; append?: boolean };
      if (this.failNextPut) {
        this.failNextPut = false;
        return failure('replacement upload failed') as Result<
          TResponse,
          ShellyClientError
        >;
      }
      if (this.failRollbackPut && !params.append && params.code === this.originalCode) {
        return failure('rollback upload failed') as Result<TResponse, ShellyClientError>;
      }
      this.script.code = params.append ? this.script.code + params.code : params.code;
      return { ok: true, value: null as TResponse };
    }

    if (request.method === RPC_METHODS.ScriptSetConfig) {
      if (this.failNextSetConfig) {
        this.failNextSetConfig = false;
        return failure('replacement config failed') as Result<
          TResponse,
          ShellyClientError
        >;
      }
      const params = request.params as { config: { enable: boolean } };
      this.script.enable = params.config.enable;
      return { ok: true, value: null as TResponse };
    }

    if (request.method === RPC_METHODS.ScriptStart) {
      if (this.failNextStart) {
        this.failNextStart = false;
        return failure('replacement start failed') as Result<
          TResponse,
          ShellyClientError
        >;
      }
      this.script.running = true;
      return { ok: true, value: null as TResponse };
    }

    if (request.method === RPC_METHODS.ScriptGetStatus) {
      const errors = this.failNextStatusVerification ? ['verification failed'] : [];
      this.failNextStatusVerification = false;
      return {
        ok: true,
        value: {
          id: this.script.id,
          running: this.script.running,
          mem_used: 12,
          mem_free: 34,
          errors
        } as TResponse
      };
    }

    throw new Error(`Unexpected RPC method: ${request.method}`);
  }
}

const createClient = (transport: ShellyRpcTransport) =>
  new RpcShellyClient(transport, { mutationDelayMs: 0 });

describe('transactional script replacement', () => {
  it('replaces a running script in place and preserves its runtime state', async () => {
    const transport = new ReplacementTransport({
      id: 7,
      name: 'Pulse',
      enable: true,
      running: true,
      code: 'old-source'
    });

    const result = await createClient(transport).replaceScript(7, 'new-source');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.scriptId).toBe(7);
    expect(result.value.running).toBe(true);
    expect(result.value.backup).toMatchObject({
      scriptId: 7,
      enable: true,
      running: true,
      code: 'old-source'
    });
    expect(transport.script).toMatchObject({
      id: 7,
      enable: true,
      running: true,
      code: 'new-source'
    });
  });

  it('keeps a paused script paused without starting it for verification', async () => {
    const transport = new ReplacementTransport({
      id: 8,
      name: 'Pulse',
      enable: true,
      running: false,
      code: 'paused-old'
    });

    const result = await createClient(transport).replaceScript(8, 'paused-new');

    expect(result.ok).toBe(true);
    expect(transport.script).toMatchObject({
      id: 8,
      enable: true,
      running: false,
      code: 'paused-new'
    });
    expect(
      transport.requests.some((request) => request.method === RPC_METHODS.ScriptStart)
    ).toBe(false);
  });

  it('rejects source drift before the first mutation', async () => {
    const transport = new ReplacementTransport({
      id: 10,
      name: 'Pulse',
      enable: true,
      running: true,
      code: 'externally-modified-source'
    });

    const result = await createClient(transport).replaceScript(10, 'new-source', {
      expectedCurrentHash: 'stale-recorded-hash',
      relayId: 2
    });

    expect(result.ok).toBe(false);
    expect(transport.script.running).toBe(true);
    expect(transport.relayOn).toBe(true);
    expect(
      transport.requests.some((request) =>
        [
          RPC_METHODS.ScriptStop,
          RPC_METHODS.SwitchSet,
          RPC_METHODS.ScriptPutCode
        ].includes(request.method as never)
      )
    ).toBe(false);
  });

  it('stops the running script before forcing the relay OFF and uploading code', async () => {
    const transport = new ReplacementTransport({
      id: 11,
      name: 'Pulse',
      enable: true,
      running: true,
      code: 'old-source'
    });

    const result = await createClient(transport).replaceScript(11, 'new-source', {
      relayId: 2
    });

    expect(result.ok).toBe(true);
    expect(transport.relayOn).toBe(false);
    const methods = transport.requests.map((request) => request.method);
    expect(methods.indexOf(RPC_METHODS.ScriptStop)).toBeLessThan(
      methods.indexOf(RPC_METHODS.SwitchSet)
    );
    expect(methods.indexOf(RPC_METHODS.SwitchSet)).toBeLessThan(
      methods.indexOf(RPC_METHODS.ScriptPutCode)
    );
  });

  it('restores exact source and running state when upload fails', async () => {
    const transport = new ReplacementTransport({
      id: 9,
      name: 'Pulse',
      enable: true,
      running: true,
      code: 'exact-old-source'
    });
    transport.failNextPut = true;

    const result = await createClient(transport).replaceScript(9, 'broken-new-source');

    expect(result.ok).toBe(false);
    expect(transport.script).toEqual({
      id: 9,
      name: 'Pulse',
      enable: true,
      running: true,
      code: 'exact-old-source'
    });
    const startCalls = transport.requests.filter(
      (request) => request.method === RPC_METHODS.ScriptStart
    );
    expect(startCalls).toHaveLength(1);
  });

  it('restores exact source and running state when configuration fails', async () => {
    const transport = new ReplacementTransport({
      id: 13,
      name: 'Pulse',
      enable: true,
      running: true,
      code: 'config-old-source'
    });
    transport.failNextSetConfig = true;

    const result = await createClient(transport).replaceScript(13, 'config-new-source');

    expect(result.ok).toBe(false);
    expect(transport.script).toEqual({
      id: 13,
      name: 'Pulse',
      enable: true,
      running: true,
      code: 'config-old-source'
    });
  });

  it('restores exact source and running state when restart fails', async () => {
    const transport = new ReplacementTransport({
      id: 14,
      name: 'Pulse',
      enable: true,
      running: true,
      code: 'start-old-source'
    });
    transport.failNextStart = true;

    const result = await createClient(transport).replaceScript(14, 'start-new-source');

    expect(result.ok).toBe(false);
    expect(transport.script).toEqual({
      id: 14,
      name: 'Pulse',
      enable: true,
      running: true,
      code: 'start-old-source'
    });
  });

  it('surfaces rollback failure instead of hiding an incomplete restore', async () => {
    const transport = new ReplacementTransport({
      id: 15,
      name: 'Pulse',
      enable: true,
      running: true,
      code: 'rollback-old-source'
    });
    transport.failNextSetConfig = true;
    transport.failRollbackPut = true;

    const result = await createClient(transport).replaceScript(15, 'rollback-new-source');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.technicalMessage).toContain(
      'Rollback failed: rollback upload failed'
    );
    expect(transport.script.running).toBe(false);
  });

  it('restores exact source and running state when post-upload verification fails', async () => {
    const transport = new ReplacementTransport({
      id: 12,
      name: 'Pulse',
      enable: true,
      running: true,
      code: 'verified-old-source'
    });
    transport.failNextStatusVerification = true;

    const result = await createClient(transport).replaceScript(12, 'new-source');

    expect(result.ok).toBe(false);
    expect(transport.script).toEqual({
      id: 12,
      name: 'Pulse',
      enable: true,
      running: true,
      code: 'verified-old-source'
    });
    const putCalls = transport.requests.filter(
      (request) => request.method === RPC_METHODS.ScriptPutCode
    );
    expect(putCalls).toHaveLength(2);
  });
});
