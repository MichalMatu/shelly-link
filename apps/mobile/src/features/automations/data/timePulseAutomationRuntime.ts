import type {
  DailyTimeAutomationConfig,
  PulseCycleConfig,
  TimePulseAutomationConfig
} from '@lcl/automation-core';
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
import type { TimePulseInstalledAutomation } from './installedAutomation.js';

export type TimePulseAutomationClients = {
  device: Pick<
    ShellyClient,
    | 'getDeviceInfo'
    | 'getStatus'
    | 'installScript'
    | 'startScript'
    | 'stopScript'
    | 'deleteScript'
    | 'evaluateScript'
    | 'setRelayOff'
    | 'replaceScript'
  >;
  schedules: Pick<RpcShellyScheduleClient, 'list' | 'create' | 'update' | 'delete'>;
};

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

export const createTimePulseAutomationClients = (
  baseUrl: string
): TimePulseAutomationClients => {
  const transport = createShellyTransport(baseUrl);
  return {
    device: new RpcShellyClient(transport),
    schedules: new RpcShellyScheduleClient(transport)
  };
};

const requireSyncedClock = async (
  clients: TimePulseAutomationClients
): Promise<void> => {
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

const restoreTimePulseRuntime = async (
  installation: TimePulseInstalledAutomation,
  clients: TimePulseAutomationClients,
  enabled: boolean
): Promise<void> => {
  const scriptId = installation.pulseRuntime.script.id;
  await clients.device
    .replaceScript(
      scriptId,
      generateShellyTimePulseScript({
        schedule: installation.config,
        pulse: installation.pulseRuntime.pulse
      }),
      {
        relayId: installation.config.relayId
      }
    )
    .catch(() => undefined);
  await clients.schedules
    .update(
      installation.schedule.onJobId,
      createTimePulseScheduleJob(installation.config, scriptId, true, enabled)
    )
    .catch(() => undefined);
  await clients.schedules
    .update(
      installation.schedule.offJobId,
      createTimePulseScheduleJob(installation.config, scriptId, false, enabled)
    )
    .catch(() => undefined);
  await forceOff(clients, scriptId).catch(() => undefined);
};

export const replaceTimePulseAutomation = async ({
  installation,
  config,
  clients = createTimePulseAutomationClients(installation.shelly.baseUrl),
  nowMs = Date.now()
}: {
  installation: TimePulseInstalledAutomation;
  config: TimePulseAutomationConfig;
  clients?: TimePulseAutomationClients;
  nowMs?: number;
}): Promise<TimePulseInstalledAutomation> => {
  if (config.schedule.relayId !== installation.config.relayId) {
    throw new Error('Time + Pulse relay cannot change during inline editing.');
  }

  await requireStoredIdentity(installation, clients);
  await requireSyncedClock(clients);

  const beforeJobs = unwrapShellyResult(await clients.schedules.list()).jobs;
  if (
    findScheduleRelayConflict(beforeJobs, config.schedule.relayId, [
      installation.schedule.onJobId,
      installation.schedule.offJobId
    ])
  ) {
    throw runtimeError(
      'native-schedule-conflict',
      'A native Shelly schedule already controls this relay.'
    );
  }

  const beforePair = timePulseSchedulePairState(
    {
      schedule: installation.schedule,
      config: installation.config,
      scriptId: installation.pulseRuntime.script.id
    },
    beforeJobs
  );
  if (beforePair.scheduleState === 'attention') {
    throw runtimeError(
      'schedule-pair-unconfirmed',
      'Shelly did not confirm the current Time + Pulse schedule pair.'
    );
  }
  const enabled = beforePair.scheduleState === 'running';
  const scriptId = installation.pulseRuntime.script.id;

  await forceOff(clients, scriptId);
  const replaced = unwrapShellyResult(
    await clients.device.replaceScript(
      scriptId,
      generateShellyTimePulseScript(config),
      {
        expectedCurrentHash: installation.pulseRuntime.script.hash,
        relayId: config.schedule.relayId
      }
    )
  );
  if (replaced.scriptId !== scriptId) {
    await restoreTimePulseRuntime(installation, clients, enabled);
    throw new Error(
      'Shelly changed the managed Time + Pulse script id during replacement.'
    );
  }

  try {
    unwrapShellyResult(
      await clients.schedules.update(
        installation.schedule.onJobId,
        createTimePulseScheduleJob(config.schedule, scriptId, true, enabled)
      )
    );
    unwrapShellyResult(
      await clients.schedules.update(
        installation.schedule.offJobId,
        createTimePulseScheduleJob(config.schedule, scriptId, false, enabled)
      )
    );

    const verifiedJobs = unwrapShellyResult(await clients.schedules.list()).jobs;
    const verifiedPair = timePulseSchedulePairState(
      {
        schedule: installation.schedule,
        config: config.schedule,
        scriptId
      },
      verifiedJobs
    );
    if (verifiedPair.scheduleState !== beforePair.scheduleState) {
      throw runtimeError(
        'schedule-pair-unconfirmed',
        'Shelly did not confirm the updated Time + Pulse schedule pair.'
      );
    }
  } catch (error) {
    await restoreTimePulseRuntime(installation, clients, enabled);
    throw error;
  }

  return {
    ...installation,
    config: config.schedule,
    pulseRuntime: {
      script: { id: scriptId, hash: replaced.scriptHash },
      pulse: config.pulse
    },
    updatedAtMs: Math.max(nowMs, installation.updatedAtMs + 1)
  };
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
  await forceOff(clients, installation.pulseRuntime.script.id);
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
  await requireStoredIdentity(installation, clients);
  await requireSyncedClock(clients);
  unwrapShellyResult(await clients.device.setRelayOff());
  await updatePairEnabled(installation, clients, true);
  try {
    unwrapShellyResult(
      await clients.device.startScript(installation.pulseRuntime.script.id)
    );
  } catch (error) {
    await forceOff(clients, installation.pulseRuntime.script.id).catch(() => undefined);
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
  await requireStoredIdentity(installation, clients);
  await forceOff(clients, installation.pulseRuntime.script.id);
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
