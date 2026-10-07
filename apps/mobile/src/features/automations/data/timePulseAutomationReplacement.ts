import type { TimePulseAutomationConfig } from '@lcl/automation-core';
import { generateShellyTimePulseScript } from '@lcl/script-generator';
import { unwrapShellyResult } from '../../../platform/shellyResult.js';
import type { TimePulseInstalledAutomation } from './installedAutomation.js';
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
  await forceTimePulseOff(clients, scriptId).catch(() => undefined);
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

  await requireTimePulseStoredIdentity(installation, clients);
  await requireTimePulseSyncedClock(clients);

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

  await forceTimePulseOff(clients, scriptId);
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
