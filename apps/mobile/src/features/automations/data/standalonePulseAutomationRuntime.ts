import type { StandalonePulseAutomationConfig } from '@lcl/automation-core';
import {
  createInstallPlan,
  normalizeShellyDeviceId,
  RpcShellyClient,
  type ShellyClient
} from '@lcl/shelly-client';
import {
  generateShellyStandalonePulseScript,
  standalonePulseControlEvalCode
} from '@lcl/script-generator';
import { createShellyTransport } from '../../../platform/shellyHttpTransport.js';
import { unwrapShellyResult } from '../../../platform/shellyResult.js';
import type { StandalonePulseInstalledAutomation } from './installedAutomation.js';

export type StandalonePulseAutomationClient = Pick<
  ShellyClient,
  | 'getDeviceInfo'
  | 'installScript'
  | 'replaceScript'
  | 'startScript'
  | 'stopScript'
  | 'deleteScript'
  | 'evaluateScript'
  | 'setRelayOff'
>;

export type InstalledStandalonePulseRuntime = {
  script: { id: number; hash: string };
};

export const createStandalonePulseAutomationClient = (
  baseUrl: string
): StandalonePulseAutomationClient => new RpcShellyClient(createShellyTransport(baseUrl));

const requireStoredIdentity = async (
  installation: StandalonePulseInstalledAutomation,
  client: StandalonePulseAutomationClient
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

const relayOff = async (
  client: StandalonePulseAutomationClient,
  relayId: number
): Promise<void> => {
  unwrapShellyResult(await client.setRelayOff({ relayId }));
};

const forceOff = async (
  client: StandalonePulseAutomationClient,
  relayId: number,
  scriptId?: number
): Promise<void> => {
  if (scriptId !== undefined) {
    await client
      .evaluateScript(scriptId, standalonePulseControlEvalCode(false))
      .catch(() => undefined);
  }
  await relayOff(client, relayId);
};

export const installStandalonePulseAutomation = async ({
  client,
  config
}: {
  client: StandalonePulseAutomationClient;
  config: StandalonePulseAutomationConfig;
}): Promise<InstalledStandalonePulseRuntime> => {
  await relayOff(client, config.relayId);
  try {
    const installed = unwrapShellyResult(
      await client.installScript(
        createInstallPlan(generateShellyStandalonePulseScript(config), config.relayId)
      )
    );
    return { script: { id: installed.scriptId, hash: installed.scriptHash } };
  } catch (error) {
    await client.setRelayOff({ relayId: config.relayId }).catch(() => undefined);
    throw error;
  }
};

export const replaceStandalonePulseAutomation = async ({
  installation,
  config,
  client = createStandalonePulseAutomationClient(installation.shelly.baseUrl),
  nowMs = Date.now()
}: {
  installation: StandalonePulseInstalledAutomation;
  config: StandalonePulseAutomationConfig;
  client?: StandalonePulseAutomationClient;
  nowMs?: number;
}): Promise<StandalonePulseInstalledAutomation> => {
  if (config.relayId !== installation.config.relayId) {
    throw new Error('Pulse relay cannot change during inline editing.');
  }

  await requireStoredIdentity(installation, client);
  await forceOff(client, config.relayId, installation.script.id);

  const replaced = unwrapShellyResult(
    await client.replaceScript(
      installation.script.id,
      generateShellyStandalonePulseScript(config)
    )
  );
  if (replaced.scriptId !== installation.script.id) {
    throw new Error('Shelly changed the managed Pulse script id during replacement.');
  }

  return {
    ...installation,
    config,
    script: {
      id: installation.script.id,
      hash: replaced.scriptHash
    },
    updatedAtMs: Math.max(nowMs, installation.updatedAtMs + 1)
  };
};

export const pauseStandalonePulseAutomation = async (
  installation: StandalonePulseInstalledAutomation,
  client = createStandalonePulseAutomationClient(installation.shelly.baseUrl)
): Promise<void> => {
  await requireStoredIdentity(installation, client);
  const { relayId } = installation.config;
  await forceOff(client, relayId, installation.script.id);
  try {
    unwrapShellyResult(await client.stopScript(installation.script.id));
  } finally {
    await relayOff(client, relayId);
  }
};

export const resumeStandalonePulseAutomation = async (
  installation: StandalonePulseInstalledAutomation,
  client = createStandalonePulseAutomationClient(installation.shelly.baseUrl)
): Promise<void> => {
  await requireStoredIdentity(installation, client);
  const { relayId } = installation.config;
  await relayOff(client, relayId);
  try {
    unwrapShellyResult(await client.startScript(installation.script.id));
  } catch (error) {
    await client.setRelayOff({ relayId }).catch(() => undefined);
    throw error;
  }
};

export const deleteStandalonePulseAutomation = async (
  installation: StandalonePulseInstalledAutomation,
  client = createStandalonePulseAutomationClient(installation.shelly.baseUrl)
): Promise<void> => {
  await requireStoredIdentity(installation, client);
  const { relayId } = installation.config;
  await forceOff(client, relayId, installation.script.id);
  try {
    await client.stopScript(installation.script.id).catch(() => undefined);
    unwrapShellyResult(await client.deleteScript(installation.script.id));
  } finally {
    await relayOff(client, relayId);
  }
};
