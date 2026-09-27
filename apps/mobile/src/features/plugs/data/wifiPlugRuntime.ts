import { RpcShellyClient } from '@lcl/shelly-client';
import { unwrapShellyResult } from '../../../platform/shellyResult.js';
import type { BlePlugRuntimeStatus } from './blePlugRuntime.js';
import { createVerifiedPlugSettingsTransport } from './plugSettingsTarget.js';

export type WifiPlugRuntimeTarget = {
  physicalId: string;
  baseUrl: string;
};

const createClient = async (target: WifiPlugRuntimeTarget) =>
  new RpcShellyClient(
    await createVerifiedPlugSettingsTransport({
      deviceId: target.physicalId,
      baseUrl: target.baseUrl
    })
  );

export const readWifiPlugRuntimeStatus = async (
  target: WifiPlugRuntimeTarget
): Promise<BlePlugRuntimeStatus> => {
  const status = unwrapShellyResult(await (await createClient(target)).getStatus());
  return {
    relayOn: status.relayOn,
    telemetry: status.telemetry,
    clock: status.clock
  };
};

export const setWifiPlugRelay = async (
  target: WifiPlugRuntimeTarget,
  relayOn: boolean
): Promise<void> => {
  const client = await createClient(target);
  unwrapShellyResult(relayOn ? await client.setRelayOn() : await client.setRelayOff());
};
