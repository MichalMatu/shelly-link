import {
  normalizeShellyDeviceId,
  RpcShellyClient,
  RpcShellyScheduleClient,
  type ShellyClient
} from '@lcl/shelly-client';
import { createShellyTransport } from '../../../platform/shellyHttpTransport.js';
import { unwrapShellyResult } from '../../../platform/shellyResult.js';
import { timeAutomationRuntimeError as runtimeError } from './timeAutomationRuntimeError.js';

export type TimePulseAutomationClients = {
  device: Pick<
    ShellyClient,
    | 'getDeviceInfo'
    | 'getStatus'
    | 'installScript'
    | 'replaceScript'
    | 'startScript'
    | 'stopScript'
    | 'deleteScript'
    | 'evaluateScript'
    | 'setRelayOff'
  >;
  schedules: Pick<RpcShellyScheduleClient, 'list' | 'create' | 'update' | 'delete'>;
};

type TimePulseOwnedDevice = {
  shelly: { baseUrl: string; deviceId: string };
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

export const requireTimePulseSyncedClock = async (
  clients: TimePulseAutomationClients
): Promise<void> => {
  const status = unwrapShellyResult(await clients.device.getStatus());
  if (!status.clock.timeSynced || !status.clock.localTime) {
    throw runtimeError('clock-unsynced', 'Shelly clock is not synchronized.');
  }
};

export const requireTimePulseStoredIdentity = async (
  installation: TimePulseOwnedDevice,
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

export const forceTimePulseOff = async (
  clients: TimePulseAutomationClients,
  scriptId?: number
): Promise<void> => {
  if (scriptId !== undefined) {
    await clients.device.evaluateScript(scriptId, 'rq(false)').catch(() => undefined);
  }
  unwrapShellyResult(await clients.device.setRelayOff());
};
