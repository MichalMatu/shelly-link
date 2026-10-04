import {
  RPC_METHODS,
  type Result,
  type ShellyClientError,
  type ShellyInstallResult,
  type ShellyRpcRequest,
  type ShellyRpcTransport,
  type ShellyScriptBackup
} from '../model.js';
import { validationError } from '../rpc/errors.js';
import { scriptStatusSchema } from '../rpc/validators.js';
import { hashScriptCode } from './hash.js';
import { DEFAULT_PUT_CODE_CHUNK_SIZE_BYTES } from './installLifecycle.js';
import { readShellyScriptCode, readShellyScriptList } from './read.js';

type MutationCaller = (request: ShellyRpcRequest) => Promise<Result<unknown>>;

type ReplacementLifecycle = {
  transport: ShellyRpcTransport;
  callMutation: MutationCaller;
};

const scriptReplacementError = (message: string): ShellyClientError => ({
  kind: 'script-upload-failed',
  userMessageKey: 'errors.scriptUploadFailed',
  technicalMessage: message,
  retryable: true
});

const describeError = (error: ShellyClientError): string =>
  error.technicalMessage ?? error.kind;

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

const putCode = async (
  callMutation: MutationCaller,
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
  callMutation: MutationCaller,
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

const verifyScript = async (
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
      error: scriptReplacementError('Script.GetStatus returned an unexpected running state.')
    };
  }

  if (
    expectedRunning &&
    (status.value.error !== undefined || (status.value.errors?.length ?? 0) > 0)
  ) {
    return {
      ok: false,
      error: scriptReplacementError('Script.GetStatus reported an error after replacement.')
    };
  }

  return status;
};

const restoreBackup = async (
  lifecycle: ReplacementLifecycle,
  backup: ShellyScriptBackup,
  chunkSizeBytes: number
): Promise<Result<null>> => {
  if (backup.code === undefined) {
    return {
      ok: false,
      error: scriptReplacementError('Rollback backup does not contain the original script source.')
    };
  }

  const stop = await lifecycle.callMutation({
    method: RPC_METHODS.ScriptStop,
    params: { id: backup.scriptId }
  });
  if (!stop.ok) return stop;

  const restoredCode = await putCode(
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

  const verified = await verifyScript(
    lifecycle,
    backup.scriptId,
    backup.code,
    backup.enable,
    backup.running
  );
  return verified.ok ? { ok: true, value: null } : verified;
};

export const replaceShellyScript = async (
  lifecycle: ReplacementLifecycle,
  scriptId: number,
  code: string,
  chunkSizeBytes = DEFAULT_PUT_CODE_CHUNK_SIZE_BYTES
): Promise<Result<ShellyInstallResult>> => {
  if (!Number.isInteger(scriptId) || scriptId < 0) {
    return { ok: false, error: validationError(`Invalid Shelly script id: ${scriptId}.`) };
  }
  if (code.length === 0) {
    return { ok: false, error: validationError('Replacement script code must not be empty.') };
  }
  if (!Number.isInteger(chunkSizeBytes) || chunkSizeBytes <= 0) {
    return {
      ok: false,
      error: validationError(`Invalid Shelly script chunk size: ${chunkSizeBytes}.`)
    };
  }

  const list = await readShellyScriptList(lifecycle.transport);
  if (!list.ok) return list;
  const target = list.value.find((script) => script.id === scriptId);
  if (!target) {
    return {
      ok: false,
      error: scriptReplacementError(`Shelly script ${scriptId} no longer exists.`)
    };
  }

  const source = await readShellyScriptCode(lifecycle.transport, scriptId, { chunkSizeBytes });
  if (!source.ok) return source;
  const backup: ShellyScriptBackup = {
    scriptId,
    name: target.name,
    enable: target.enable,
    running: target.running,
    code: source.value,
    codeHash: hashScriptCode(source.value)
  };

  let mutationStarted = false;
  const fail = async (error: ShellyClientError): Promise<Result<ShellyInstallResult>> => {
    if (!mutationStarted) return { ok: false, error };
    const rollback = await restoreBackup(lifecycle, backup, chunkSizeBytes);
    if (rollback.ok) return { ok: false, error };
    return {
      ok: false,
      error: {
        ...error,
        technicalMessage: `${describeError(error)} Rollback failed: ${describeError(
          rollback.error
        )}`
      }
    };
  };

  if (target.running) {
    const stop = await lifecycle.callMutation({
      method: RPC_METHODS.ScriptStop,
      params: { id: scriptId }
    });
    if (!stop.ok) return stop;
    mutationStarted = true;
  }

  mutationStarted = true;
  const uploaded = await putCode(lifecycle.callMutation, scriptId, code, chunkSizeBytes);
  if (!uploaded.ok) return fail(uploaded.error);

  const configured = await setScriptEnabled(lifecycle.callMutation, scriptId, target.enable);
  if (!configured.ok) return fail(configured.error);

  if (target.running) {
    const started = await lifecycle.callMutation({
      method: RPC_METHODS.ScriptStart,
      params: { id: scriptId }
    });
    if (!started.ok) return fail(started.error);
  }

  const verified = await verifyScript(
    lifecycle,
    scriptId,
    code,
    target.enable,
    target.running
  );
  if (!verified.ok) return fail(verified.error);

  return {
    ok: true,
    value: {
      scriptId,
      running: target.running,
      memUsed: verified.value.mem_used,
      memFree: verified.value.mem_free,
      scriptHash: hashScriptCode(code),
      backup
    }
  };
};
