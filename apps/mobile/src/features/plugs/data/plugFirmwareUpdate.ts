import {
  RpcShellyFirmwareClient,
  type ShellyFirmwareReadResult
} from '@lcl/shelly-client';
import { createVerifiedPlugSettingsTransport } from './plugSettingsTarget.js';

export type PlugFirmwareUpdateTarget = {
  physicalId: string;
  baseUrl: string;
};

const createClient = async (target: PlugFirmwareUpdateTarget) =>
  new RpcShellyFirmwareClient(
    await createVerifiedPlugSettingsTransport({
      deviceId: target.physicalId,
      baseUrl: target.baseUrl
    })
  );

const unwrap = <T>(
  result:
    | { ok: true; value: T }
    | { ok: false; error: { technicalMessage?: string; kind: string } }
): T => {
  if (result.ok) return result.value;
  throw new Error(result.error.technicalMessage ?? `Shelly RPC: ${result.error.kind}`);
};

export const readPlugFirmwareUpdate = async (
  target: PlugFirmwareUpdateTarget
): Promise<ShellyFirmwareReadResult> => unwrap(await (await createClient(target)).read());

export const startPlugStableFirmwareUpdate = async (
  target: PlugFirmwareUpdateTarget
): Promise<void> => {
  unwrap(await (await createClient(target)).updateStable());
};
