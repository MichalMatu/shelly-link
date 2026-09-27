import {
  normalizeShellyDeviceId,
  RPC_METHODS,
  RpcShellyClient,
  RpcShellyWifiClient,
  type ShellyClient,
  type ShellyRpcTransport,
  type ShellyWifiScanEntry,
  type ShellyWifiStatus
} from '@lcl/shelly-client';
import { createShellyBleTransport } from '../../../platform/shellyBleTransport.js';
import { unwrapShellyResult } from '../../../platform/shellyResult.js';
import type { SavedBlePlug } from './savedBlePlug.js';

type BlePlugWifiClient = Pick<ShellyClient, 'getDeviceInfo'>;
type DisposableShellyRpcTransport = ShellyRpcTransport & { disconnect(): Promise<void> };
type ProvisioningWifiClient = Pick<
  RpcShellyWifiClient,
  'scan' | 'setStation' | 'getStatus'
>;

export type BlePlugWifiNetwork = {
  ssid: string;
  auth: number;
  rssi?: number | undefined;
};

export type BlePlugWifiProvisioningResult = {
  status: ShellyWifiStatus;
};

export class BlePlugWifiProvisioningUnsupportedError extends Error {
  constructor() {
    super('Shelly firmware does not expose Wi-Fi provisioning on this BLE channel.');
    this.name = 'BlePlugWifiProvisioningUnsupportedError';
  }
}

export class BlePlugWifiProvisioningTimeoutError extends Error {
  constructor() {
    super('Shelly did not obtain a Wi-Fi IP address before the verification timeout.');
    this.name = 'BlePlugWifiProvisioningTimeoutError';
  }
}

export type BlePlugWifiProvisioningDependencies = {
  createTransport(deviceId: string): DisposableShellyRpcTransport;
  createClient(transport: ShellyRpcTransport): BlePlugWifiClient;
  createWifiClient(transport: ShellyRpcTransport): ProvisioningWifiClient;
  listMethods(transport: ShellyRpcTransport): Promise<string[]>;
  sleep(ms: number): Promise<void>;
  nowMs(): number;
};

const defaultDependencies: BlePlugWifiProvisioningDependencies = {
  createTransport: (deviceId) => createShellyBleTransport(deviceId),
  createClient: (transport) => new RpcShellyClient(transport),
  createWifiClient: (transport) => new RpcShellyWifiClient(transport),
  listMethods: async (transport) => {
    const response = unwrapShellyResult(
      await transport.call<{ methods?: unknown }>({ method: RPC_METHODS.ShellyListMethods })
    );
    return Array.isArray(response.methods)
      ? response.methods.filter((method): method is string => typeof method === 'string')
      : [];
  },
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  nowMs: () => Date.now()
};

const methodKey = (method: string): string => method.toLowerCase();

const assertMethods = (methods: readonly string[], required: readonly string[]): void => {
  const available = new Set(methods.map(methodKey));
  if (!required.every((method) => available.has(methodKey(method)))) {
    throw new BlePlugWifiProvisioningUnsupportedError();
  }
};

const assertMatchingPhysicalIdentity = async (
  plug: Pick<SavedBlePlug, 'physicalId'>,
  client: BlePlugWifiClient
): Promise<void> => {
  const info = unwrapShellyResult(await client.getDeviceInfo());
  const remoteDeviceId = info.id?.trim();
  if (!remoteDeviceId) throw new Error('Shelly did not expose a stable device id.');
  if (
    normalizeShellyDeviceId(remoteDeviceId) !== normalizeShellyDeviceId(plug.physicalId)
  ) {
    throw new Error('Shelly identity does not match the saved Plug.');
  }
};

const normalizeNetworks = (entries: readonly ShellyWifiScanEntry[]): BlePlugWifiNetwork[] => {
  const strongestBySsid = new Map<string, BlePlugWifiNetwork>();
  for (const entry of entries) {
    const ssid = entry.ssid?.trim();
    if (!ssid) continue;
    const candidate: BlePlugWifiNetwork = {
      ssid,
      auth: entry.auth,
      ...(entry.rssi === undefined ? {} : { rssi: entry.rssi })
    };
    const current = strongestBySsid.get(ssid);
    if (!current || (candidate.rssi ?? -Infinity) > (current.rssi ?? -Infinity)) {
      strongestBySsid.set(ssid, candidate);
    }
  }
  return [...strongestBySsid.values()].sort(
    (left, right) =>
      (right.rssi ?? -Infinity) - (left.rssi ?? -Infinity) ||
      left.ssid.localeCompare(right.ssid)
  );
};

export const scanBlePlugWifiNetworks = async (
  plug: Pick<SavedBlePlug, 'physicalId' | 'bleDeviceId'>,
  dependencies: BlePlugWifiProvisioningDependencies = defaultDependencies
): Promise<BlePlugWifiNetwork[]> => {
  const transport = dependencies.createTransport(plug.bleDeviceId);
  try {
    await assertMatchingPhysicalIdentity(plug, dependencies.createClient(transport));
    assertMethods(await dependencies.listMethods(transport), [RPC_METHODS.WifiScan]);
    const result = await dependencies.createWifiClient(transport).scan();
    if (!result.ok) {
      throw new Error(
        result.error.technicalMessage ?? `Shelly RPC: ${result.error.kind}`
      );
    }
    return normalizeNetworks(result.value);
  } finally {
    await transport.disconnect().catch(() => undefined);
  }
};

export type ProvisionBlePlugWifiOptions = {
  timeoutMs?: number;
  pollIntervalMs?: number;
};

export const provisionBlePlugWifi = async (
  plug: Pick<SavedBlePlug, 'physicalId' | 'bleDeviceId'>,
  input: { ssid: string; password: string },
  options: ProvisionBlePlugWifiOptions = {},
  dependencies: BlePlugWifiProvisioningDependencies = defaultDependencies
): Promise<BlePlugWifiProvisioningResult> => {
  const transport = dependencies.createTransport(plug.bleDeviceId);
  const timeoutMs = options.timeoutMs ?? 20_000;
  const pollIntervalMs = options.pollIntervalMs ?? 1_000;
  try {
    await assertMatchingPhysicalIdentity(plug, dependencies.createClient(transport));
    assertMethods(await dependencies.listMethods(transport), [
      RPC_METHODS.WifiSetConfig,
      RPC_METHODS.WifiGetStatus
    ]);

    const wifi = dependencies.createWifiClient(transport);
    const mutation = await wifi.setStation(input);
    if (!mutation.ok) {
      throw new Error(
        mutation.error.technicalMessage ?? `Shelly RPC: ${mutation.error.kind}`
      );
    }

    const deadline = dependencies.nowMs() + timeoutMs;
    while (dependencies.nowMs() <= deadline) {
      const statusResult = await wifi.getStatus();
      if (statusResult.ok) {
        const status = statusResult.value;
        if (status.status === 'got ip' && status.ssid === input.ssid && status.sta_ip) {
          return { status };
        }
      } else if (!statusResult.error.retryable) {
        throw new Error(
          statusResult.error.technicalMessage ?? `Shelly RPC: ${statusResult.error.kind}`
        );
      }

      if (dependencies.nowMs() >= deadline) break;
      await dependencies.sleep(pollIntervalMs);
    }

    throw new BlePlugWifiProvisioningTimeoutError();
  } finally {
    await transport.disconnect().catch(() => undefined);
  }
};
