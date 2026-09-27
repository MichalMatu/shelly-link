import {
  RPC_METHODS,
  setShellySystemTime,
  type Result,
  type ShellyRpcTransport
} from '@lcl/shelly-client';
import { unwrapShellyResult } from '../../../platform/shellyResult.js';
import {
  BlePlugTimeSyncUnsupportedError,
  syncBlePlugTime,
  type BlePlugTimeSyncResult
} from './blePlugTimeSync.js';
import { createVerifiedPlugSettingsTransport } from './plugSettingsTarget.js';
import type { SavedPlugWithBleLocator } from './savedPlug.js';

export type SavedPlugTimeSyncDependencies = {
  createWifiTransport(target: {
    deviceId: string;
    baseUrl: string;
  }): Promise<ShellyRpcTransport>;
  supportsSetTime(transport: ShellyRpcTransport): Promise<boolean>;
  setTime(transport: ShellyRpcTransport, unixTimeSec: number): Promise<Result<null>>;
  syncBle(
    plug: Pick<SavedPlugWithBleLocator, 'physicalId' | 'bleDeviceId'>
  ): Promise<BlePlugTimeSyncResult>;
  nowMs(): number;
};

const defaultDependencies: SavedPlugTimeSyncDependencies = {
  createWifiTransport: createVerifiedPlugSettingsTransport,
  supportsSetTime: async (transport) => {
    const response = unwrapShellyResult(
      await transport.call<{ methods?: unknown }>({
        method: RPC_METHODS.ShellyListMethods
      })
    );
    return (
      Array.isArray(response.methods) && response.methods.includes(RPC_METHODS.SysSetTime)
    );
  },
  setTime: setShellySystemTime,
  syncBle: (plug) => syncBlePlugTime(plug),
  nowMs: () => Date.now()
};

export const syncSavedPlugTime = async (
  plug: SavedPlugWithBleLocator,
  dependencies: SavedPlugTimeSyncDependencies = defaultDependencies
): Promise<BlePlugTimeSyncResult> => {
  if (!plug.wifiBaseUrl) {
    return dependencies.syncBle(plug);
  }

  const transport = await dependencies.createWifiTransport({
    deviceId: plug.physicalId,
    baseUrl: plug.wifiBaseUrl
  });
  if (!(await dependencies.supportsSetTime(transport))) {
    throw new BlePlugTimeSyncUnsupportedError();
  }

  const unixTimeSec = Math.trunc(dependencies.nowMs()) / 1000;
  unwrapShellyResult(await dependencies.setTime(transport, unixTimeSec));
  return { unixTimeSec };
};
