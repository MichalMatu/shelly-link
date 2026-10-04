import {
  RPC_METHODS,
  type Result,
  type ShellyClientError,
  type ShellyRpcRequest,
  type ShellyRpcTransport,
  type ShellyScriptBackup
} from '../model.js';
import { validationError } from '../rpc/errors.js';
import { scriptStatusSchema, switchStatusSchema } from '../rpc/validators.js';
import { readShellyScriptCode, readShellyScriptList } from './read.js';

export type ReplacementMutationCaller = (
  request: ShellyRpcRequest
) => Promise<Result<unknown>>;

export type ReplacementLifecycle = {
  transport: ShellyRpcTransport;
  callMutation: ReplacementMutationCaller;
};

export const scriptReplacementError = (message: string): ShellyClientError => ({
  kind: 'script-upload-failed',
  userMessageKey: 'errors.scriptUploadFailed',
  technicalMessage: message,
  retryable: true
});

const chunkUtf8String = (value: string, maxBytes: number): string[] => {
  const encoder = new TextEncoder();
  const chunks: string[] = [];
  let chunk = '';
  let chunkBytes = 0;

  for (const character of value) {
    const characterBytes = encoder.encode(character).length;
    if (chunk !== '' && chunkBytes + characterBytes > maxBytes) {
      chunks.push(chunk);
      chunk = '';
      chunkBytes = 0;
    }
    chunk += character;
    chunkBytes += characterBytes;
  }

  if (chunk !== '') return [...chunks, chunk];
  return chunks.length > 0 ? chunks : [''];
};

export const putReplacementCode = async (
  callMutation: ReplacementMutationCaller,
  scriptId: number,
  code: string,
  chunkSizeBytes: number
): Promise<Result<null>> => {
  for (const [index, chunk] of chunkUtf8String(code, chunkSizeBytes).entries()) {
    const result = await callMutation({
      method: RPC_METHODS.ScriptPutCode,
      params: { id: scriptId, code: chunk, append: index > 0 }
    });
    if (!result.ok) return result;
  }
  return { ok: true, value: null };
};

const setScriptEnabled = (
  callMutation: ReplacementMutationCaller,
  scriptId: number,
  enable: boolean
): Promise<Result<unknown>> =>
  callMutation({
    method: RPC_METHODS.ScriptSetConfig,
    params: { id: scriptId, config: { enable } }
  });

const readScriptStatus = async (
  transport: ShellyRpcTransport,
  scriptId: number
): Promise<Result<ReturnType<typeof scriptStatusSchema.parse>>> => {
  const result = await transport.call<unknown>({
    method: RPC_METHODS.ScriptGetStatus,
    params: { id: scriptId }
  });
  if (!result.ok) return result;

  const parsed = scriptStatusSchema.safeParse(result.value);
  return parsed.success
    ? { ok: true, value: parsed.data }
    : { ok: false, error: validationError(parsed.error.message) };
};

export const verifyReplacementScript = async (
  lifecycle: ReplacementLifecycle,
  scriptId: number,
  expectedCode: string,
  expectedEnable: boolean,
  expectedRunning: boolean
): Promise<Result<ReturnType<typeof scriptStatusSchema.parse>>> => {
  const [code, list, status] = await Promise.all([
    readShellyScriptCode(lifecycle.transport, scriptId),
    readShellyScriptList(lifecycle.transport),
    readScriptStatus(lifecycle.transport, scriptId)
  ]);
  if (!code.ok) return code;
  if (!list.ok) return list;
  if (!status.ok) return status;

  if (code.value !== expectedCode) {
    return {
      ok: false,
      error: scriptReplacementError('Shelly did not preserve the expected script source.')
    };
  }

  const entry = list.value.find((script) => script.id === scriptId);
  if (!entry || entry.enable !== expectedEnable || entry.running !== expectedRunning) {
    return {
      ok: false,
      error: scriptReplacementError(
        'Shelly did not preserve the expected script id, enable flag and running state.'
      )
    };
  }

  if (status.value.running !== expectedRunning) {
    return {
      ok: false,
      error: scriptReplacementError(
        'Script.GetStatus returned an unexpected running state.'
      )
    };
  }

  if (
    expectedRunning &&
    (status.value.error !== undefined || (status.value.errors?.length ?? 0) > 0)
  ) {
    return {
      ok: false,
      error: scriptReplacementError(
        'Script.GetStatus reported an error after replacement.'
      )
    };
  }

  return status;
};

export const confirmReplacementRelayOff = async (
  lifecycle: ReplacementLifecycle,
  relayId: number
): Promise<Result<null>> => {
  const off = await lifecycle.callMutation({
    method: RPC_METHODS.SwitchSet,
    params: { id: relayId, on: false }
  });
  if (!off.ok) return off;

  const status = await lifecycle.transport.call<unknown>({
    method: RPC_METHODS.SwitchGetStatus,
    params: { id: relayId }
  });
  if (!status.ok) return status;
  const parsed = switchStatusSchema.safeParse(status.value);
  if (!parsed.success) {
    return { ok: false, error: validationError(parsed.error.message) };
  }
  if (parsed.data.output) {
    return {
      ok: false,
      error: scriptReplacementError(
        'Shelly relay did not confirm OFF before script replacement.'
      )
    };
  }
  return { ok: true, value: null };
};

export const restoreScriptBackup = async (
  lifecycle: ReplacementLifecycle,
  backup: ShellyScriptBackup,
  chunkSizeBytes: number
): Promise<Result<null>> => {
  if (backup.code === undefined) {
    return {
      ok: false,
      error: scriptReplacementError(
        'Rollback backup does not contain the original script source.'
      )
    };
  }

  const stop = await lifecycle.callMutation({
    method: RPC_METHODS.ScriptStop,
    params: { id: backup.scriptId }
  });
  if (!stop.ok) return stop;

  const restoredCode = await putReplacementCode(
    lifecycle.callMutation,
    backup.scriptId,
    backup.code,
    chunkSizeBytes
  );
  if (!restoredCode.ok) return restoredCode;

  const restoredConfig = await setScriptEnabled(
    lifecycle.callMutation,
    backup.scriptId,
    backup.enable
  );
  if (!restoredConfig.ok) return restoredConfig;

  if (backup.running) {
    const start = await lifecycle.callMutation({
      method: RPC_METHODS.ScriptStart,
      params: { id: backup.scriptId }
    });
    if (!start.ok) return start;
  }

  const verified = await verifyReplacementScript(
    lifecycle,
    backup.scriptId,
    backup.code,
    backup.enable,
    backup.running
  );
  return verified.ok ? { ok: true, value: null } : verified;
};
