import {
  RPC_METHODS,
  type Result,
  type ShellyClientError,
  type ShellyInstallResult,
  type ShellyScriptBackup,
  type ShellyScriptReplacementOptions
} from '../model.js';
import { validationError } from '../rpc/errors.js';
import { hashScriptCode } from './hash.js';
import { DEFAULT_PUT_CODE_CHUNK_SIZE_BYTES } from './installLifecycle.js';
import { readShellyScriptCode, readShellyScriptList } from './read.js';
import {
  confirmReplacementRelayOff,
  putReplacementCode,
  restoreScriptBackup,
  scriptReplacementError,
  verifyReplacementScript,
  type ReplacementLifecycle
} from './replaceLifecycle.js';

const describeError = (error: ShellyClientError): string =>
  error.technicalMessage ?? error.kind;

export const replaceShellyScript = async (
  lifecycle: ReplacementLifecycle,
  scriptId: number,
  code: string,
  options: ShellyScriptReplacementOptions = {},
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
  if (
    options.relayId !== undefined &&
    (!Number.isInteger(options.relayId) || options.relayId < 0)
  ) {
    return {
      ok: false,
      error: validationError(`Invalid Shelly relay id: ${options.relayId}.`)
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
  const sourceHash = hashScriptCode(source.value);
  if (
    options.expectedCurrentHash !== undefined &&
    sourceHash !== options.expectedCurrentHash
  ) {
    return {
      ok: false,
      error: scriptReplacementError(
        'Shelly script source changed since the installed automation was recorded.'
      )
    };
  }

  const backup: ShellyScriptBackup = {
    scriptId,
    name: target.name,
    enable: target.enable,
    running: target.running,
    code: source.value,
    codeHash: sourceHash
  };

  let mutationStarted = false;
  const fail = async (error: ShellyClientError): Promise<Result<ShellyInstallResult>> => {
    if (!mutationStarted) return { ok: false, error };
    const rollback = await restoreScriptBackup(lifecycle, backup, chunkSizeBytes);
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

  if (options.relayId !== undefined) {
    const relayOff = await confirmReplacementRelayOff(lifecycle, options.relayId);
    if (!relayOff.ok) return fail(relayOff.error);
    mutationStarted = true;
  }

  mutationStarted = true;
  const uploaded = await putReplacementCode(
    lifecycle.callMutation,
    scriptId,
    code,
    chunkSizeBytes
  );
  if (!uploaded.ok) return fail(uploaded.error);

  const configured = await lifecycle.callMutation({
    method: RPC_METHODS.ScriptSetConfig,
    params: { id: scriptId, config: { enable: target.enable } }
  });
  if (!configured.ok) return fail(configured.error);

  if (target.running) {
    const started = await lifecycle.callMutation({
      method: RPC_METHODS.ScriptStart,
      params: { id: scriptId }
    });
    if (!started.ok) return fail(started.error);
  }

  const verified = await verifyReplacementScript(
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
