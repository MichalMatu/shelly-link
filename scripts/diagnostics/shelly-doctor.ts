#!/usr/bin/env node
import {
  evaluateShellyDoctorSnapshot,
  formatShellyDoctorReport,
  redactValue,
  type ShellyDoctorExpectedAutomation,
  type ShellyDoctorSnapshot
} from '@lcl/diagnostics';
import {
  FetchShellyRpcTransport,
  hashScriptCode,
  readShellyScriptCode,
  readShellyScriptList,
  RpcShellyClient,
  RpcShellyScheduleClient
} from '@lcl/shelly-client';

const args = process.argv.slice(2);
const valueAfter = (flag: string): string | undefined => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};
const baseUrl = valueAfter('--base-url');
if (!baseUrl) {
  throw new Error(
    'Usage: pnpm doctor:shelly -- --base-url http://192.168.x.x [--expected-device-id id] [--expected-script-id n] [--expected-script-hash hash] [--expected-kind climate|time|pulse] [--json]'
  );
}

const expectedKind = valueAfter('--expected-kind');
if (
  expectedKind &&
  expectedKind !== 'climate' &&
  expectedKind !== 'time' &&
  expectedKind !== 'pulse'
) {
  throw new Error('--expected-kind must be climate, time, or pulse.');
}
const expectedScriptIdRaw = valueAfter('--expected-script-id');
const expectedScriptId =
  expectedScriptIdRaw === undefined ? undefined : Number(expectedScriptIdRaw);
if (
  expectedScriptId !== undefined &&
  (!Number.isInteger(expectedScriptId) || expectedScriptId < 0)
) {
  throw new Error('--expected-script-id must be a non-negative integer.');
}

const expectedAutomation: ShellyDoctorExpectedAutomation | undefined =
  expectedKind || expectedScriptId !== undefined || valueAfter('--expected-script-hash')
    ? {
        kind: (expectedKind ?? 'climate') as ShellyDoctorExpectedAutomation['kind'],
        ...(expectedScriptId === undefined ? {} : { scriptId: expectedScriptId }),
        ...(valueAfter('--expected-script-hash')
          ? { scriptHash: valueAfter('--expected-script-hash')! }
          : {})
      }
    : undefined;

const transport = new FetchShellyRpcTransport({ baseUrl, defaultTimeoutMs: 5000 });
const client = new RpcShellyClient(transport);
const scheduleClient = new RpcShellyScheduleClient(transport);
const readErrors: string[] = [];

const deviceInfoResult = await client.getDeviceInfo();
if (!deviceInfoResult.ok) {
  const report = evaluateShellyDoctorSnapshot({
    reachable: false,
    ...(valueAfter('--expected-device-id')
      ? { expectedDeviceId: valueAfter('--expected-device-id')! }
      : {}),
    readErrors: [deviceInfoResult.error.technicalMessage ?? deviceInfoResult.error.kind]
  });
  console.log(
    args.includes('--json')
      ? JSON.stringify(redactValue(report, { redactIp: true, redactMac: true }), null, 2)
      : formatShellyDoctorReport(report)
  );
  process.exitCode = 1;
} else {
  const [statusResult, scriptsResult, schedulesResult] = await Promise.all([
    client.getStatus(),
    readShellyScriptList(transport),
    scheduleClient.list()
  ]);
  if (!statusResult.ok)
    readErrors.push(statusResult.error.technicalMessage ?? statusResult.error.kind);
  if (!scriptsResult.ok)
    readErrors.push(scriptsResult.error.technicalMessage ?? scriptsResult.error.kind);
  if (!schedulesResult.ok)
    readErrors.push(schedulesResult.error.technicalMessage ?? schedulesResult.error.kind);

  const scriptEvidence = [];
  for (const script of scriptsResult.ok ? scriptsResult.value : []) {
    let hash: string | undefined;
    if (expectedScriptId === undefined || script.id === expectedScriptId) {
      const code = await readShellyScriptCode(transport, script.id);
      if (code.ok) hash = hashScriptCode(code.value);
      else readErrors.push(code.error.technicalMessage ?? code.error.kind);
    }
    scriptEvidence.push({
      id: script.id,
      name: script.name,
      enable: script.enable,
      running: script.running,
      ...(hash ? { hash } : {})
    });
  }

  const snapshot: ShellyDoctorSnapshot = {
    reachable: true,
    ...(valueAfter('--expected-device-id')
      ? { expectedDeviceId: valueAfter('--expected-device-id')! }
      : {}),
    ...(deviceInfoResult.value.id ? { observedDeviceId: deviceInfoResult.value.id } : {}),
    model: deviceInfoResult.value.model,
    gen: deviceInfoResult.value.gen,
    ...(deviceInfoResult.value.firmwareId
      ? { firmwareId: deviceInfoResult.value.firmwareId }
      : {}),
    ...(statusResult.ok
      ? {
          relayOn: statusResult.value.relayOn,
          clock: statusResult.value.clock,
          bluetooth: statusResult.value.bluetooth
        }
      : {}),
    scripts: scriptEvidence,
    schedules: schedulesResult.ok
      ? schedulesResult.value.jobs.map((job) => ({
          id: job.id,
          enable: job.enable,
          timespec: job.timespec
        }))
      : [],
    ...(expectedAutomation ? { expectedAutomation } : {}),
    ...(readErrors.length > 0 ? { readErrors } : {})
  };
  const report = evaluateShellyDoctorSnapshot(snapshot);
  if (args.includes('--json')) {
    console.log(
      JSON.stringify(redactValue(report, { redactIp: true, redactMac: true }), null, 2)
    );
  } else {
    console.log(formatShellyDoctorReport(report));
  }
  if (report.status === 'fail') process.exitCode = 1;
}
