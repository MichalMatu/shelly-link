import { normalizeShellyDeviceId, RpcShellyClient } from '@lcl/shelly-client';
import { createShellyTransport } from '../../../platform/shellyHttpTransport.js';
import { unwrapShellyResult } from '../../../platform/shellyResult.js';
import type { StandalonePulseInstalledAutomation } from './installedAutomation.js';
import {
  readShellyControlStatus,
  type ShellyControlStatus
} from './shellyManagedAutomation.js';

const requireStoredIdentity = async (
  installation: StandalonePulseInstalledAutomation,
  client: RpcShellyClient
): Promise<void> => {
  const info = unwrapShellyResult(await client.getDeviceInfo());
  const remoteDeviceId = info.id?.trim();
  if (
    !remoteDeviceId ||
    normalizeShellyDeviceId(remoteDeviceId) !==
      normalizeShellyDeviceId(installation.shelly.deviceId)
  ) {
    throw new Error('Shelly identity does not match the installed automation.');
  }
};

export const setStandalonePulseManualRelay = async (
  installation: StandalonePulseInstalledAutomation,
  on: boolean
): Promise<ShellyControlStatus> => {
  const client = new RpcShellyClient(createShellyTransport(installation.shelly.baseUrl));
  await requireStoredIdentity(installation, client);

  const before = await readShellyControlStatus(installation.shelly.baseUrl);
  if (
    before.automationScriptId !== installation.script.id ||
    before.automationMode !== 'manual'
  ) {
    throw new Error('Manual relay control requires a paused Pulse automation.');
  }

  unwrapShellyResult(
    on
      ? await client.setRelayOn({ relayId: installation.config.relayId })
      : await client.setRelayOff({ relayId: installation.config.relayId })
  );
  const confirmed = unwrapShellyResult(await client.getStatus());
  if (confirmed.relayOn !== on) {
    throw new Error(`Shelly relay did not confirm ${on ? 'ON' : 'OFF'}.`);
  }

  return readShellyControlStatus(installation.shelly.baseUrl);
};
