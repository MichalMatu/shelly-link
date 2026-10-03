import { createHash } from 'node:crypto';
import {
  climateRuntimeControlStateEvalCode,
  climateRuntimeSetControlModeEvalCode,
  createDefaultShellyThermostatConfig,
  decodeClimateRuntimeControlState,
  generateShellyThermostatScript
} from '@lcl/script-generator';
import {
  FetchShellyRpcTransport,
  normalizeShellyDeviceId,
  readShellyScriptCode,
  RPC_METHODS,
  RpcShellyClient,
  ShellyKvsClient
} from '@lcl/shelly-client';

const baseUrl = 'http://192.168.0.10/';
const expectedId = normalizeShellyDeviceId('shellyplugsg3-e4b063d7f530');
const expectedSourceSha = '37ce58a4c759499d712922e2051cc7167b8fb31a0b2171bcdd6193df5d20889e';
const tempName = 'Shelly Link Debounce Smoke';
const transport = new FetchShellyRpcTransport({ baseUrl, defaultTimeoutMs: 8_000 });
const client = new RpcShellyClient(transport, { mutationDelayMs: 75 });
const kvsClient = new ShellyKvsClient(transport);
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const rpc = async <T>(method: string, params?: Record<string, unknown>): Promise<T> => {
  const result = await transport.call<T>({ method, ...(params ? { params } : {}) });
  if (!result.ok) throw new Error(`${method}: ${JSON.stringify(result.error)}`);
  return result.value;
};
const evalRaw = async (id: number, code: string): Promise<string> =>
  (await rpc<{ result: string }>(RPC_METHODS.ScriptEval, { id, code })).result;
const readState = async (id: number) => {
  const raw = await evalRaw(id, climateRuntimeControlStateEvalCode);
  const state = decodeClimateRuntimeControlState(raw);
  if (!state) throw new Error(`Invalid control state: ${raw}`);
  return state;
};
const readRelay = () => rpc<Record<string, unknown>>(RPC_METHODS.SwitchGetStatus, { id: 0 });
const readDebounceState = async (id: number) =>
  JSON.parse(
    await evalRaw(
      id,
      '(function(){return JSON.stringify({on:R.on,db:R.db,di:R.di,rs:R.rs,a:R.a,m:R.m,mn:R.mn,af:R.af,lk:R.lk})})()'
    )
  ) as Record<string, unknown>;
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const snapshotKvs = (items: readonly { key: string; value: unknown }[]) =>
  Object.fromEntries(
    [...items]
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((item) => [item.key, item.value])
  );

const report: Record<string, unknown> = {};
let tempId: number | null = null;
let originalStopped = false;
let failure: unknown = null;
let backupKvs: readonly { key: string; etag: string; value: unknown }[] = [];

try {
  const info = await client.getDeviceInfo();
  if (!info.ok || !info.value.id || normalizeShellyDeviceId(info.value.id) !== expectedId) {
    throw new Error(`Identity mismatch: ${JSON.stringify(info)}`);
  }
  const scripts = await rpc<{ scripts?: Array<{ id: number; name?: string; running?: boolean }> }>(
    RPC_METHODS.ScriptList
  );
  if (
    scripts.scripts?.length !== 1 ||
    scripts.scripts[0]?.id !== 1 ||
    scripts.scripts[0]?.name !== 'Shelly Link Thermostat' ||
    scripts.scripts[0]?.running !== true
  ) {
    throw new Error(`Unexpected production scripts: ${JSON.stringify(scripts)}`);
  }
  const originalCode = await readShellyScriptCode(transport, 1);
  if (!originalCode.ok) throw new Error(`Script read failed: ${JSON.stringify(originalCode.error)}`);
  const originalSha = sha256(originalCode.value);
  if (originalSha !== expectedSourceSha) throw new Error(`Production source changed: ${originalSha}`);
  const originalState = await readState(1);
  if (originalState.mode !== 'manual' || originalState.manualRequestOn || originalState.safetyLockout) {
    throw new Error(`Production runtime is not MANUAL/OFF-safe: ${JSON.stringify(originalState)}`);
  }
  const schedules = await rpc<{ jobs?: unknown[]; rev?: number }>(RPC_METHODS.ScheduleList);
  if ((schedules.jobs?.length ?? 0) !== 0) throw new Error(`Unexpected schedules: ${JSON.stringify(schedules)}`);
  const kvs = await kvsClient.getAllMatching('*');
  if (!kvs.ok) throw new Error(`KVS backup failed: ${JSON.stringify(kvs.error)}`);
  backupKvs = kvs.value.map((item) => ({ ...item }));
  await rpc(RPC_METHODS.SwitchSet, { id: 0, on: false });
  const preRelay = await readRelay();
  if (preRelay.output !== false) throw new Error(`Relay not OFF: ${JSON.stringify(preRelay)}`);
  report.preflight = {
    sourceSha256: originalSha,
    state: originalState,
    schedules,
    kvs: snapshotKvs(backupKvs),
    relay: preRelay
  };

  const stop = await client.stopScript(1);
  if (!stop.ok) throw new Error(`Failed to stop production runtime: ${JSON.stringify(stop.error)}`);
  originalStopped = true;
  await rpc(RPC_METHODS.SwitchSet, { id: 0, on: false });

  const base = createDefaultShellyThermostatConfig('tp357_custom_v1', 'heating');
  const config = {
    ...base,
    sensor: {
      ...base.sensor,
      sensorId: 'debounce-smoke',
      runtimeAddress: '00:00:00:00:00:01',
      displayName: 'Debounce smoke'
    },
    rule: {
      ...base.rule,
      minChangeMs: 1,
      minimumOnMs: 0,
      relayDebounce: { turnOnMs: 1_500, turnOffMs: 1_500 },
      maxOnMs: 60_000,
      consecutiveHits: 1
    }
  };
  const code = generateShellyThermostatScript(config);
  const install = await client.installScript({
    scriptName: tempName,
    code,
    runOnBoot: false,
    backupExisting: false,
    replaceAllScripts: false,
    relayId: 0
  });
  if (!install.ok) throw new Error(`Temporary install failed: ${JSON.stringify(install.error)}`);
  tempId = install.value.scriptId;
  if (tempId === 1) throw new Error('Temporary runtime reused production script id.');
  report.runtime = {
    scriptId: tempId,
    sourceBytes: new TextEncoder().encode(code).length,
    memUsed: install.value.memUsed,
    memFree: install.value.memFree,
    header: code.split('\n').slice(0, 4)
  };

  // AUTO-like ordinary request: start ON debounce, then cancel before maturity.
  const pendingOnRaw = await evalRaw(
    tempId,
    '(function(){R.m=0;R.mn=false;R.lk=false;R.af=null;sw(true,"smoke-on",0);return JSON.stringify({on:R.on,db:R.db,di:R.di,rs:R.rs})})()'
  );
  const pendingOn = JSON.parse(pendingOnRaw) as Record<string, unknown>;
  await delay(250);
  const relayPendingOn = await readRelay();
  if (relayPendingOn.output !== false || pendingOn.db !== true || pendingOn.rs !== 'db') {
    throw new Error(`ON debounce did not block immediately: ${JSON.stringify({ pendingOn, relayPendingOn })}`);
  }
  await delay(350);
  await evalRaw(tempId, '(function(){sw(false,"cancel-on",0);return "ok"})()');
  const afterCancelState = await readDebounceState(tempId);
  await delay(1_200);
  const relayAfterCancel = await readRelay();
  if (relayAfterCancel.output !== false || afterCancelState.db !== null) {
    throw new Error(`Cancelled ON debounce fired later: ${JSON.stringify({ afterCancelState, relayAfterCancel })}`);
  }
  report.cancelPendingOn = { pendingOn, relayPendingOn, afterCancelState, relayAfterCancel };

  // Stable ON must mature from the one-shot timer without another sw()/BLE event.
  await evalRaw(tempId, '(function(){sw(true,"stable-on",0);return "ok"})()');
  const stableOnPending = await readDebounceState(tempId);
  await delay(1_750);
  const relayStableOn = await readRelay();
  const stableOnState = await readDebounceState(tempId);
  if (relayStableOn.output !== true || stableOnState.on !== true || stableOnState.db !== null) {
    throw new Error(`Stable ON did not mature: ${JSON.stringify({ stableOnPending, stableOnState, relayStableOn })}`);
  }
  report.stableOn = { stableOnPending, stableOnState, relayStableOn };

  // Stable OFF must also mature from its timer.
  await evalRaw(tempId, '(function(){sw(false,"stable-off",0);return "ok"})()');
  const stableOffPending = await readDebounceState(tempId);
  await delay(1_750);
  const relayStableOff = await readRelay();
  const stableOffState = await readDebounceState(tempId);
  if (relayStableOff.output !== false || stableOffState.on !== false || stableOffState.db !== null) {
    throw new Error(`Stable OFF did not mature: ${JSON.stringify({ stableOffPending, stableOffState, relayStableOff })}`);
  }
  report.stableOff = { stableOffPending, stableOffState, relayStableOff };

  // Re-energize, create pending OFF, then MANUAL must force OFF immediately and invalidate timer.
  await evalRaw(tempId, '(function(){sw(true,"on-before-manual",0);return "ok"})()');
  await delay(1_750);
  const relayOnBeforeManual = await readRelay();
  if (relayOnBeforeManual.output !== true) throw new Error(`Second ON failed: ${JSON.stringify(relayOnBeforeManual)}`);
  await evalRaw(tempId, '(function(){sw(false,"pending-off",0);return "ok"})()');
  const pendingOffState = await readDebounceState(tempId);
  await delay(250);
  const relayPendingOff = await readRelay();
  if (relayPendingOff.output !== true || pendingOffState.db !== false || pendingOffState.rs !== 'db') {
    throw new Error(`OFF debounce did not remain pending: ${JSON.stringify({ pendingOffState, relayPendingOff })}`);
  }
  const manual = await evalRaw(tempId, climateRuntimeSetControlModeEvalCode('manual'));
  await delay(250);
  const relayManualOff = await readRelay();
  const manualState = await readDebounceState(tempId);
  if (manual !== '1' || relayManualOff.output !== false || manualState.db !== null) {
    throw new Error(`MANUAL forced OFF failed: ${JSON.stringify({ manual, manualState, relayManualOff })}`);
  }
  await delay(1_750);
  const relayAfterStaleTimer = await readRelay();
  if (relayAfterStaleTimer.output !== false) {
    throw new Error(`Invalidated OFF timer changed relay later: ${JSON.stringify(relayAfterStaleTimer)}`);
  }
  report.forcedOff = {
    relayOnBeforeManual,
    pendingOffState,
    relayPendingOff,
    manual,
    manualState,
    relayManualOff,
    relayAfterStaleTimer
  };
} catch (error) {
  failure = error;
} finally {
  try {
    await rpc(RPC_METHODS.SwitchSet, { id: 0, on: false });
  } catch {}
  try {
    const scripts = await rpc<{ scripts?: Array<{ id: number; name?: string; running?: boolean }> }>(
      RPC_METHODS.ScriptList
    );
    for (const script of scripts.scripts ?? []) {
      if (script.name !== tempName) continue;
      try {
        if (script.running) await client.stopScript(script.id);
      } catch {}
      try {
        await client.deleteScript(script.id);
      } catch {}
    }
  } catch {}
  try {
    const current = await kvsClient.getAllMatching('*');
    if (current.ok) {
      const backupByKey = new Map(backupKvs.map((item) => [item.key, item]));
      for (const item of current.value) {
        if (!backupByKey.has(item.key)) {
          try {
            await kvsClient.delete(item.key);
          } catch {}
        }
      }
      for (const item of backupKvs) {
        const now = await kvsClient.get(item.key);
        if (!now.ok || JSON.stringify(now.value.value) !== JSON.stringify(item.value)) {
          try {
            await kvsClient.set(item.key, item.value);
          } catch {}
        }
      }
    }
  } catch {}
  if (originalStopped) {
    try {
      const start = await client.startScript(1);
      if (!start.ok) throw new Error(JSON.stringify(start.error));
      await delay(250);
      const restored = await evalRaw(1, climateRuntimeSetControlModeEvalCode('manual'));
      if (restored !== '1') throw new Error(`Mode restore returned ${restored}.`);
    } catch (error) {
      if (!failure) failure = error;
    }
  }
  try {
    await rpc(RPC_METHODS.SwitchSet, { id: 0, on: false });
  } catch {}

  try {
    const scripts = await rpc<{ scripts?: Array<{ id: number; name?: string; running?: boolean }> }>(
      RPC_METHODS.ScriptList
    );
    const source = await readShellyScriptCode(transport, 1);
    if (!source.ok) throw new Error(JSON.stringify(source.error));
    const schedules = await rpc<{ jobs?: unknown[]; rev?: number }>(RPC_METHODS.ScheduleList);
    const finalKvs = await kvsClient.getAllMatching('*');
    if (!finalKvs.ok) throw new Error(JSON.stringify(finalKvs.error));
    const relay = await readRelay();
    const state = await readState(1);
    const final = {
      scripts,
      sourceSha256: sha256(source.value),
      schedules,
      kvs: snapshotKvs(finalKvs.value),
      relay,
      state
    };
    report.final = final;
    const sameKvs = JSON.stringify(snapshotKvs(finalKvs.value)) === JSON.stringify(snapshotKvs(backupKvs));
    if (
      scripts.scripts?.length !== 1 ||
      scripts.scripts[0]?.id !== 1 ||
      scripts.scripts[0]?.running !== true ||
      sha256(source.value) !== expectedSourceSha ||
      (schedules.jobs?.length ?? 0) !== 0 ||
      !sameKvs ||
      relay.output !== false ||
      state.mode !== 'manual' ||
      state.manualRequestOn ||
      state.safetyLockout
    ) {
      throw new Error(`Final restore verification failed: ${JSON.stringify(final)}`);
    }
  } catch (error) {
    if (!failure) failure = error;
  }
  console.log(JSON.stringify(report, null, 2));
}

if (failure) throw failure;
