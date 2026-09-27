import { unwrapShellyResult } from '../../platform/shellyResult.js';
import { createShellyTransport } from '../../platform/shellyHttpTransport.js';
import { detachPlugButtonForManagedAutomation } from '../../features/plugs/index.js';
import { generateShellyThermostatScript } from '@lcl/script-generator';
import {
  createInstallPlan,
  normalizeShellyDeviceId,
  RpcShellyClient
} from '@lcl/shelly-client';
import type { ClimateInstalledAutomation } from './model.js';
import { forceRelayOffAndConfirm } from './relaySafety.js';
import {
  readInstalledAutomationControlStatus,
  type InstalledAutomationControlStatus
} from './runtimeStatus.js';

export type InstalledAutomationRuntimePreparation = {
  installation: ClimateInstalledAutomation;
  status: InstalledAutomationControlStatus;
  upgraded: boolean;
};

const assertStoredDeviceIdentity = async (
  installation: ClimateInstalledAutomation
): Promise<void> => {
  const client = new RpcShellyClient(createShellyTransport(installation.shelly.baseUrl));
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

export const convergeManagedButtonMode = async (
  installation: ClimateInstalledAutomation,
  target: { deviceId: string; baseUrl: string } = {
    deviceId: installation.shelly.deviceId,
    baseUrl: installation.shelly.baseUrl
  }
): Promise<ClimateInstalledAutomation> => {
  const previousMode = await detachPlugButtonForManagedAutomation(target);
  if (installation.buttonInputModeBeforeInstall !== undefined) return installation;
  return {
    ...installation,
    buttonInputModeBeforeInstall: previousMode,
    updatedAtMs: Math.max(Date.now(), installation.updatedAtMs + 1)
  };
};

const reinstallCurrentRuntime = async (
  installation: ClimateInstalledAutomation
): Promise<InstalledAutomationRuntimePreparation> => {
  await assertStoredDeviceIdentity(installation);
  const preparedInstallation = await convergeManagedButtonMode(installation);
  const relayId = preparedInstallation.config.output.relayId;
  const client = new RpcShellyClient(
    createShellyTransport(preparedInstallation.shelly.baseUrl)
  );

  await forceRelayOffAndConfirm(client, relayId);
  const code = generateShellyThermostatScript(preparedInstallation.config);
  const installed = unwrapShellyResult(
    await client.installScript(createInstallPlan(code, relayId))
  );
  await forceRelayOffAndConfirm(client, relayId);

  const upgradedInstallation: ClimateInstalledAutomation = {
    ...preparedInstallation,
    script: { id: installed.scriptId, hash: installed.scriptHash },
    updatedAtMs: Math.max(Date.now(), preparedInstallation.updatedAtMs + 1)
  };
  const status = await readInstalledAutomationControlStatus(upgradedInstallation);
  if (
    status.automationScriptId !== upgradedInstallation.script.id ||
    status.automationMode !== 'auto' ||
    !status.runtimeModeSupported ||
    status.relayOn
  ) {
    throw new Error('Shelly did not confirm the replaced automation runtime.');
  }

  return { installation: upgradedInstallation, status, upgraded: true };
};

export const ensureInstalledAutomationRuntimeCurrent = async (
  installation: ClimateInstalledAutomation
): Promise<InstalledAutomationRuntimePreparation> => {
  await assertStoredDeviceIdentity(installation);
  const preparedInstallation = await convergeManagedButtonMode(installation);
  const status = await readInstalledAutomationControlStatus(preparedInstallation);
  if (
    status.automationScriptId === preparedInstallation.script.id &&
    status.automationMode !== 'missing' &&
    status.automationMode !== 'stopped' &&
    status.runtimeModeSupported
  ) {
    return {
      installation: preparedInstallation,
      status,
      upgraded: preparedInstallation !== installation
    };
  }

  return reinstallCurrentRuntime(preparedInstallation);
};

export const recoverInstalledAutomationRuntime = (
  installation: ClimateInstalledAutomation
): Promise<InstalledAutomationRuntimePreparation> =>
  reinstallCurrentRuntime(installation);
