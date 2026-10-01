import type { TimePulseAutomationConfig } from '@lcl/automation-core';
import {
  createInstallPlan,
  normalizeShellyDeviceId,
  RpcShellyClient,
  RpcShellyScheduleClient,
  type ShellyClient
} from '@lcl/shelly-client';
import { generateShellyTimePulseScript } from '@lcl/script-generator';
import { unwrapShellyResult } from '../../../platform/shellyResult.js';
import { createShellyTransport } from '../../../platform/shellyHttpTransport.js';
import {
  createTimePulseScheduleJob,
  findScheduleRelayConflict,
  timePulseSchedulePairState
} from './timeAutomationSchedule.js';
import { timeAutomationRuntimeError as runtimeError } from './timeAutomationRuntimeError.js';

export type TimePulseAutomationClients = {
  device: Pick<
    ShellyClient,
    | 'getDeviceInfo'
    | 'getStatus'
    | 'installScript'
    | 'stopScript'
    | 'deleteScript'
    | 'evaluateScript'
    | 'setRelayOff'
  >;
  schedules: Pick<RpcShellyScheduleClient, 'list' | 'create' | 'update' | 'delete'>;
};

export type InstalledTimePulseRuntime = {
  script: { id: number; hash: string };
  schedule: { onJobId: number; offJobId: number };
};

export type OwnedTimePulseRuntimeInstallation = InstalledTimePulseRuntime & {
  shelly: { baseUrl: string; deviceId: string };
  config: TimePulseAutomationConfig;
};

export const createTimePulseAutomationClients = (
  baseUrl: string
): TimePulseAutomationClients => {
  const transport = createShellyTransport(baseUrl);
  return {
    device: new RpcShellyClient(transport),
    schedules: new RpcShellyScheduleClient(transport)
  };
};

const requireSyncedClock = async (clients: TimePulseAutomationClients): Promise<void> => {
  const status = unwrapShellyResult(await clients.device.getStatus());
  if (!status.clock.timeSynced || !status.clock.localTime) {
    throw runtimeError('clock-unsynced', 'Shelly clock is not synchronized.');
  }
};

const requireStoredIdentity = async (
  installation: OwnedTimePulseRuntimeInstallation,
  clients: TimePulseAutomationClients
): Promise<void> => {
  const info = unwrapShellyResult(await clients.device.getDeviceInfo());
  const remoteDeviceId = info.id?.trim();
  if (
    !remoteDeviceId ||
    normalizeShellyDeviceId(remoteDeviceId) !==
      normalizeShellyDeviceId(installation.shelly.deviceId)
  ) {
    throw new Error('Shelly identity does not match the installed automation.');
  }
};

const deleteScheduleIfPresent = async (
  clients: TimePulseAutomationClients,
  jobId: number
): Promise<void> => {
  const jobs = unwrapShellyResult(await clients.schedules.list()).jobs;
  if (jobs.some((job) => job.id === jobId)) {
    unwrapShellyResult(await clients.schedules.delete(jobId));
  }
};

const forceOff = async (
  clients: TimePulseAutomationClients,
  scriptId?: number
): Promise<void> => {
  if (scriptId !== undefined) {
    await clients.device.evaluateScript(scriptId, 'rq(false)').catch(() => undefined);
  }
  unwrapShellyResult(await clients.device.setRelayOff());
};

const cleanupFailedInstall = async (
  clients: TimePulseAutomationClients,
  scriptId: number | null,
  onJobId: number | null,
  offJobId: number | null
): Promise<void> => {
  if (onJobId !== null)
    await deleteScheduleIfPresent(clients, onJobId).catch(() => undefined);
  if (offJobId !== null)
    await deleteScheduleIfPresent(clients, offJobId).catch(() => undefined);
  if (scriptId !== null) {
    await forceOff(clients, scriptId).catch(() => undefined);
    await clients.device.stopScript(scriptId).catch(() => undefined);
    await clients.device.deleteScript(scriptId).catch(() => undefined);
  }
  await clients.device.setRelayOff().catch(() => undefined);
};

export const installTimePulseAutomation = async ({
  clients,
  config
}: {
  clients: TimePulseAutomationClients;
  config: TimePulseAutomationConfig;
}): Promise<InstalledTimePulseRuntime> => {
  await requireSyncedClock(clients);
  const scheduleList = unwrapShellyResult(await clients.schedules.list());
  if (scheduleList.jobs.length > 18) {
    throw runtimeError('schedule-slots', 'Shelly does not have two free schedule slots.');
  }
  if (findScheduleRelayConflict(scheduleList.jobs, config.schedule.relayId)) {
    throw runtimeError(
      'native-schedule-conflict',
      'A native Shelly schedule already controls this relay.'
    );
  }

  unwrapShellyResult(await clients.device.setRelayOff());
  let scriptId: number | null = null;
  let onJobId: number | null = null;
  let offJobId: number | null = null;
  try {
    const installedScript = unwrapShellyResult(
      await clients.device.installScript(
        createInstallPlan(generateShellyTimePulseScript(config), config.schedule.relayId)
      )
    );
    scriptId = installedScript.scriptId;

    onJobId = unwrapShellyResult(
      await clients.schedules.create(
        createTimePulseScheduleJob(config.schedule, scriptId, true)
      )
    ).id;
    offJobId = unwrapShellyResult(
      await clients.schedules.create(
        createTimePulseScheduleJob(config.schedule, scriptId, false)
      )
    ).id;

    const jobs = unwrapShellyResult(await clients.schedules.list()).jobs;
    const pair = timePulseSchedulePairState(
      {
        schedule: { onJobId, offJobId },
        config: config.schedule,
        scriptId
      },
      jobs
    );
    if (pair.scheduleState !== 'running') {
      throw runtimeError(
        'schedule-pair-unconfirmed',
        'Shelly did not confirm both Time + Pulse schedule jobs.'
      );
    }
    return {
      script: { id: scriptId, hash: installedScript.scriptHash },
      schedule: { onJobId, offJobId }
    };
  } catch (error) {
    await cleanupFailedInstall(clients, scriptId, onJobId, offJobId);
    throw error;
  }
};

const updatePairEnabled = async (
  installation: OwnedTimePulseRuntimeInstallation,
  clients: TimePulseAutomationClients,
  enable: boolean
): Promise<void> => {
  const { onJobId, offJobId } = installation.schedule;
  unwrapShellyResult(await clients.schedules.update(onJobId, { enable }));
  try {
    unwrapShellyResult(await clients.schedules.update(offJobId, { enable }));
  } catch (error) {
    await clients.schedules.update(onJobId, { enable: !enable }).catch(() => undefined);
    throw error;
  }
};

export const pauseTimePulseAutomation = async (
  installation: OwnedTimePulseRuntimeInstallation,
  clients = createTimePulseAutomationClients(installation.shelly.baseUrl)
): Promise<void> => {
  await requireStoredIdentity(installation, clients);
  await forceOff(clients, installation.script.id);
  await updatePairEnabled(installation, clients, false);
  unwrapShellyResult(await clients.device.stopScript(installation.script.id));
  unwrapShellyResult(await clients.device.setRelayOff());
};

export const resumeTimePulseAutomation = async (
  installation: OwnedTimePulseRuntimeInstallation,
  clients = createTimePulseAutomationClients(installation.shelly.baseUrl)
): Promise<void> => {
  await requireStoredIdentity(installation, clients);
  await requireSyncedClock(clients);
  unwrapShellyResult(await clients.device.setRelayOff());
  await updatePairEnabled(installation, clients, true);
  unwrapShellyResult(await clients.device.startScript(installation.script.id));
};

export const deleteTimePulseAutomation = async (
  installation: OwnedTimePulseRuntimeInstallation,
  clients = createTimePulseAutomationClients(installation.shelly.baseUrl)
): Promise<void> => {
  await requireStoredIdentity(installation, clients);
  await forceOff(clients, installation.script.id);
  await updatePairEnabled(installation, clients, false).catch(() => undefined);
  await deleteScheduleIfPresent(clients, installation.schedule.onJobId);
  await deleteScheduleIfPresent(clients, installation.schedule.offJobId);
  await clients.device.stopScript(installation.script.id).catch(() => undefined);
  unwrapShellyResult(await clients.device.deleteScript(installation.script.id));
  unwrapShellyResult(await clients.device.setRelayOff());
};
