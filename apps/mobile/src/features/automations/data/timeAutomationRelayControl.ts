import type { ShellyStatus } from '@lcl/shelly-client';
import { unwrapShellyResult } from '../../../platform/shellyResult.js';
import {
  createTimeAutomationClients,
  type TimeAutomationClients
} from './timeAutomationClients.js';
import {
  requireStoredTimeAutomationDeviceIdentity,
  type OwnedTimeAutomationRuntimeInstallation
} from './timeAutomationIdentity.js';
import {
  readTimeAutomationRuntime,
  type TimeAutomationRuntimeSnapshot
} from './timeAutomationRuntimeState.js';
import { timeAutomationRuntimeError } from './timeAutomationRuntimeError.js';

export const setTimeAutomationRelayStateAndConfirm = async (
  clients: TimeAutomationClients,
  relayId: number,
  on: boolean
): Promise<ShellyStatus> => {
  unwrapShellyResult(
    on
      ? await clients.device.setRelayOn({ relayId })
      : await clients.device.setRelayOff({ relayId })
  );
  const status = unwrapShellyResult(await clients.device.getStatus());
  if (status.relayOn !== on) {
    throw timeAutomationRuntimeError(
      'relay-state-unconfirmed',
      `Shelly relay did not confirm ${on ? 'ON' : 'OFF'}.`
    );
  }
  return status;
};

export const setTimeAutomationManualRelay = async (
  installation: OwnedTimeAutomationRuntimeInstallation,
  on: boolean,
  clients = createTimeAutomationClients(installation.shelly.baseUrl)
): Promise<TimeAutomationRuntimeSnapshot> => {
  await requireStoredTimeAutomationDeviceIdentity(installation, clients);
  const before = await readTimeAutomationRuntime(installation, clients);
  if (before.scheduleState !== 'paused') {
    throw timeAutomationRuntimeError(
      'manual-relay-requires-paused',
      'Manual relay control requires a paused time automation.'
    );
  }
  await setTimeAutomationRelayStateAndConfirm(clients, installation.config.relayId, on);
  return readTimeAutomationRuntime(installation, clients);
};
