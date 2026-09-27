import {
  normalizeShellyDeviceId,
  RPC_METHODS,
  RpcShellyClient,
  setShellySystemTime,
  type Result,
  type ShellyClient,
  type ShellyRpcTransport
} from '@lcl/shelly-client';
import { createShellyBleTransport } from '../../../platform/shellyBleTransport.js';
import { unwrapShellyResult } from '../../../platform/shellyResult.js';
import type { SavedBlePlug } from './savedBlePlug.js';

type BlePlugTimeSyncClient = Pick<ShellyClient, 'getDeviceInfo'>;

type DisposableShellyRpcTransport = ShellyRpcTransport & {
  disconnect(): Promise<void>;
};

export class BlePlugTimeSyncUnsupportedError extends Error {
  constructor() {
    super('Shelly firmware does not support Sys.SetTime.');
    this.name = 'BlePlugTimeSyncUnsupportedError';
  }
}

export type BlePlugTimeSyncDependencies = {
  createTransport(deviceId: string): DisposableShellyRpcTransport;
  createClient(transport: ShellyRpcTransport): BlePlugTimeSyncClient;
  supportsSetTime(transport: ShellyRpcTransport): Promise<boolean>;
  setTime(transport: ShellyRpcTransport, unixTimeSec: number): Promise<Result<null>>;
  nowMs(): number;
};

export type BlePlugTimeSyncResult = {
  unixTimeSec: number;
};

const defaultDependencies: BlePlugTimeSyncDependencies = {
  createTransport: (deviceId) => createShellyBleTransport(deviceId),
  createClient: (transport) => new RpcShellyClient(transport),
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
  nowMs: () => Date.now()
};

const assertMatchingPhysicalIdentity = async (
  plug: Pick<SavedBlePlug, 'physicalId'>,
  client: BlePlugTimeSyncClient
): Promise<void> => {
  const info = unwrapShellyResult(await client.getDeviceInfo());
  const remoteDeviceId = info.id?.trim();
  if (!remoteDeviceId) {
    throw new Error('Shelly did not expose a stable device id.');
  }
  if (
    normalizeShellyDeviceId(remoteDeviceId) !== normalizeShellyDeviceId(plug.physicalId)
  ) {
    throw new Error('Shelly identity does not match the saved Plug.');
  }
};

export const syncBlePlugTime = async (
  plug: Pick<SavedBlePlug, 'physicalId' | 'bleDeviceId'>,
  dependencies: BlePlugTimeSyncDependencies = defaultDependencies
): Promise<BlePlugTimeSyncResult> => {
  const transport = dependencies.createTransport(plug.bleDeviceId);
  try {
    const client = dependencies.createClient(transport);
    await assertMatchingPhysicalIdentity(plug, client);

    if (!(await dependencies.supportsSetTime(transport))) {
      throw new BlePlugTimeSyncUnsupportedError();
    }

    const unixTimeSec = Math.trunc(dependencies.nowMs()) / 1000;
    unwrapShellyResult(await dependencies.setTime(transport, unixTimeSec));
    return { unixTimeSec };
  } finally {
    await transport.disconnect().catch(() => undefined);
  }
};
