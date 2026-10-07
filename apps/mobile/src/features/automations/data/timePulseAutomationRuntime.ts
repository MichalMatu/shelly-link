import type {
  DailyTimeAutomationConfig,
  PulseCycleConfig,
  TimePulseAutomationConfig
} from '@lcl/automation-core';
import { createInstallPlan } from '@lcl/shelly-client';
import { generateShellyTimePulseScript } from '@lcl/script-generator';
import { unwrapShellyResult } from '../../../platform/shellyResult.js';
import {
  createTimePulseScheduleJob,
  findScheduleRelayConflict,
  timePulseSchedulePairState
} from './timeAutomationSchedule.js';
import { timeAutomationRuntimeError as runtimeError } from './timeAutomationRuntimeError.js';
import {
  createTimePulseAutomationClients,
  forceTimePulseOff,
  requireTimePulseStoredIdentity,
  requireTimePulseSyncedClock,
  type TimePulseAutomationClients
} from './timePulseAutomationRuntimeSupport.js';

export type InstalledTimePulseRuntime = {
  script: { id: number; hash: string };
  schedule: { onJobId: number; offJobId: number };
};

export type OwnedTimePulseRuntimeInstallation = {
  shelly: { baseUrl: string; deviceId: string };
  schedule: { onJobId: number; offJobId: number };
  config: DailyTimeAutomationConfig;
  pulseRuntime: {
    script: { id: number; hash: string };
    pulse: PulseCycleConfig;
  };
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

const cleanupFailedInstall = async (
  clients: TimePulseAutomationClients,
  scriptId: number | null,
  onJobId: number | null,
  offJobId: number | null
): Promise<void> => {
  if (onJobId !== null) {
    await deleteScheduleIfPresent(clients, onJobId).catch(() => undefined);
  }
  if (offJobId !== null) {
    await deleteScheduleIfPresent(clients, offJobId).catch(() => undefined);
  }
  if (scriptId !== null) {
    await forceTimePulseOff(clients, scriptId).catch(() => undefined);
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
  await requireTimePulseSyncedClock(clients);
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
  await requireTimePulseStoredIdentity(installation, clients);
  await forceTimePulseOff(clients, installation.pulseRuntime.script.id);
  await updatePairEnabled(installation, clients, false);
  try {
    unwrapShellyResult(
      await clients.device.stopScript(installation.pulseRuntime.script.id)
    );
  } finally {
    unwrapShellyResult(await clients.device.setRelayOff());
  }
};

export const resumeTimePulseAutomation = async (
  installation: OwnedTimePulseRuntimeInstallation,
  clients = createTimePulseAutomationClients(installation.shelly.baseUrl)
): Promise<void> => {
  await requireTimePulseStoredIdentity(installation, clients);
  await requireTimePulseSyncedClock(clients);
  unwrapShellyResult(await clients.device.setRelayOff());
  await updatePairEnabled(installation, clients, true);
  try {
    unwrapShellyResult(
      await clients.device.startScript(installation.pulseRuntime.script.id)
    );
  } catch (error) {
    await forceTimePulseOff(clients, installation.pulseRuntime.script.id).catch(
      () => undefined
    );
    await updatePairEnabled(installation, clients, false).catch(() => undefined);
    await clients.device
      .stopScript(installation.pulseRuntime.script.id)
      .catch(() => undefined);
    await clients.device.setRelayOff().catch(() => undefined);
    throw error;
  }
};

export const deleteTimePulseAutomation = async (
  installation: OwnedTimePulseRuntimeInstallation,
  clients = createTimePulseAutomationClients(installation.shelly.baseUrl)
): Promise<void> => {
  await requireTimePulseStoredIdentity(installation, clients);
  await forceTimePulseOff(clients, installation.pulseRuntime.script.id);
  try {
    await updatePairEnabled(installation, clients, false).catch(() => undefined);
    await deleteScheduleIfPresent(clients, installation.schedule.onJobId);
    await deleteScheduleIfPresent(clients, installation.schedule.offJobId);
    await clients.device
      .stopScript(installation.pulseRuntime.script.id)
      .catch(() => undefined);
    unwrapShellyResult(
      await clients.device.deleteScript(installation.pulseRuntime.script.id)
    );
  } finally {
    unwrapShellyResult(await clients.device.setRelayOff());
  }
};
