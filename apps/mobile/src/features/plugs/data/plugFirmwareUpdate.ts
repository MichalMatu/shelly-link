import {
  normalizeShellyDeviceId,
  RPC_METHODS,
  RpcShellyClient,
  RpcShellyFirmwareClient,
  type Result,
  type ShellyDeviceInfo,
  type ShellyFirmwareReadResult,
  type ShellyRpcTransport
} from '@lcl/shelly-client';
import { createShellyTransport } from '../../../platform/shellyHttpTransport.js';
import { unwrapShellyResult } from '../../../platform/shellyResult.js';
import { createVerifiedPlugSettingsTransport } from './plugSettingsTarget.js';

export type PlugFirmwareUpdateTarget = {
  physicalId: string;
  baseUrl: string;
};

export type PlugFirmwareVerificationSnapshot = {
  deviceInfo: ShellyDeviceInfo;
  methods: string[];
};

export type PlugFirmwareUpdateStartResult = {
  acknowledged: boolean;
};

export type WaitForPlugFirmwareOptions = {
  previousFirmware?: string | undefined;
  expectedVersion: string;
  timeoutMs?: number;
  pollIntervalMs?: number;
};

export type PlugFirmwareVerificationDependencies = {
  readSnapshot(
    target: PlugFirmwareUpdateTarget
  ): Promise<PlugFirmwareVerificationSnapshot>;
  sleep(ms: number): Promise<void>;
  nowMs(): number;
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

const readVerifiedSnapshot = async (
  target: PlugFirmwareUpdateTarget
): Promise<PlugFirmwareVerificationSnapshot> => {
  const transport: ShellyRpcTransport = createShellyTransport(target.baseUrl, {
    timeoutMs: 3_000
  });
  const info = unwrapShellyResult(await new RpcShellyClient(transport).getDeviceInfo());
  const remoteDeviceId = info.id?.trim();
  if (!remoteDeviceId) throw new Error('Shelly did not expose a stable device id.');
  if (
    normalizeShellyDeviceId(remoteDeviceId) !== normalizeShellyDeviceId(target.physicalId)
  ) {
    throw new Error('Shelly identity does not match the saved Plug.');
  }

  const methodsResponse = unwrapShellyResult(
    await transport.call<{ methods?: unknown }>({ method: RPC_METHODS.ShellyListMethods })
  );
  const methods = Array.isArray(methodsResponse.methods)
    ? methodsResponse.methods.filter(
        (method): method is string => typeof method === 'string'
      )
    : [];

  return { deviceInfo: info, methods };
};

const defaultVerificationDependencies: PlugFirmwareVerificationDependencies = {
  readSnapshot: readVerifiedSnapshot,
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  nowMs: () => Date.now()
};

const versionPattern = (version: string): RegExp => {
  const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|/)${escaped}(?:[-+]|$)`);
};

const firmwareMatches = (
  firmwareId: string | undefined,
  expectedVersion: string
): boolean => Boolean(firmwareId && versionPattern(expectedVersion).test(firmwareId));

export const classifyPlugFirmwareUpdateStart = (
  result: Result<null>
): PlugFirmwareUpdateStartResult => {
  if (result.ok) return { acknowledged: true };
  if (result.error.kind === 'timeout' || result.error.kind === 'shelly-offline') {
    return { acknowledged: false };
  }
  throw new Error(result.error.technicalMessage ?? `Shelly RPC: ${result.error.kind}`);
};

export const readPlugFirmwareUpdate = async (
  target: PlugFirmwareUpdateTarget
): Promise<ShellyFirmwareReadResult> => unwrap(await (await createClient(target)).read());

export const startPlugStableFirmwareUpdate = async (
  target: PlugFirmwareUpdateTarget
): Promise<PlugFirmwareUpdateStartResult> =>
  classifyPlugFirmwareUpdateStart(await (await createClient(target)).updateStable());

export const waitForPlugFirmwareUpdate = async (
  target: PlugFirmwareUpdateTarget,
  options: WaitForPlugFirmwareOptions,
  dependencies: PlugFirmwareVerificationDependencies = defaultVerificationDependencies
): Promise<PlugFirmwareVerificationSnapshot> => {
  const timeoutMs = options.timeoutMs ?? 180_000;
  const pollIntervalMs = options.pollIntervalMs ?? 2_000;
  const deadline = dependencies.nowMs() + timeoutMs;
  let lastFirmware: string | undefined;
  let lastError: unknown;

  while (dependencies.nowMs() <= deadline) {
    try {
      const snapshot = await dependencies.readSnapshot(target);
      lastFirmware = snapshot.deviceInfo.firmwareId;
      if (firmwareMatches(snapshot.deviceInfo.firmwareId, options.expectedVersion)) {
        return snapshot;
      }
      lastError = undefined;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('identity does not match the saved Plug')
      ) {
        throw error;
      }
      lastError = error;
    }

    if (dependencies.nowMs() >= deadline) break;
    await dependencies.sleep(pollIntervalMs);
  }

  if (lastFirmware) {
    throw new Error(
      `Plug reconnected, but firmware is still ${lastFirmware}; expected ${options.expectedVersion}.`
    );
  }
  const detail = lastError instanceof Error ? ` ${lastError.message}` : '';
  throw new Error(`Plug did not reconnect after the firmware update.${detail}`);
};
