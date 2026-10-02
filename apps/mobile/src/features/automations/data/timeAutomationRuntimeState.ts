import type { DailyTimeAutomationConfig, PulseCycleConfig } from '@lcl/automation-core';
import type { ShellyScheduleJob, ShellyStatus } from '@lcl/shelly-client';
import { unwrapShellyResult } from '../../../platform/shellyResult.js';
import { createTimeAutomationClients } from './timeAutomationClients.js';
import {
  schedulePairState,
  timePulseSchedulePairState,
  type TimeAutomationScheduleState
} from './timeAutomationSchedule.js';

export type TimeAutomationRuntimeInstallation = {
  shelly: { baseUrl: string };
  schedule: { onJobId: number; offJobId: number };
  config: DailyTimeAutomationConfig;
  pulseRuntime?:
    | {
        script: { id: number; hash: string };
        pulse: PulseCycleConfig;
      }
    | undefined;
};

export type TimeAutomationRuntimeSnapshot = {
  relayOn: boolean;
  telemetry: ShellyStatus['telemetry'];
  clock: ShellyStatus['clock'];
  scheduleState: TimeAutomationScheduleState;
  onJob: ShellyScheduleJob | null;
  offJob: ShellyScheduleJob | null;
};

export const readTimeAutomationRuntime = async (
  installation: TimeAutomationRuntimeInstallation,
  clients = createTimeAutomationClients(installation.shelly.baseUrl)
): Promise<TimeAutomationRuntimeSnapshot> => {
  const [statusResult, schedulesResult] = await Promise.all([
    clients.device.getStatus(),
    clients.schedules.list()
  ]);
  const status = unwrapShellyResult(statusResult);
  const scheduleList = unwrapShellyResult(schedulesResult);
  const scheduleState = installation.pulseRuntime
    ? timePulseSchedulePairState(
        {
          schedule: installation.schedule,
          config: installation.config,
          scriptId: installation.pulseRuntime.script.id
        },
        scheduleList.jobs
      )
    : schedulePairState(installation, scheduleList.jobs);
  return {
    relayOn: status.relayOn,
    telemetry: status.telemetry,
    clock: status.clock,
    ...scheduleState
  };
};
