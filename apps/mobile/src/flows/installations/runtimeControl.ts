import { unwrapShellyResult } from '../../platform/shellyResult.js';
import { createShellyTransport } from '../../platform/shellyHttpTransport.js';
import { restorePlugButtonAfterManagedAutomation } from '../../features/plugs/index.js';
import { normalizeShellyDeviceId, RpcShellyClient } from '@lcl/shelly-client';
import { readShellySetupStatus } from '../hardware-setup/shellyRequests.js';
import type { ClimateInstalledAutomation } from './model.js';
import { forceRelayOffAndConfirm } from './relaySafety.js';
import {
  setInstalledAutomationManualRelayRequest,
  setInstalledAutomationRuntimeMode
} from './runtimeModeTransport.js';
import {
  readInstalledAutomationControlStatus,
  type InstalledAutomationControlStatus
} from './runtimeStatus.js';
import {
  ensureInstalledAutomationRuntimeCurrent,
  recoverInstalledAutomationRuntime
} from './runtimeUpgrade.js';

export { readInstalledAutomationControlStatus } from './runtimeStatus.js';

export type InstalledAutomationScriptMatch = 'matched' | 'missing' | 'mismatch';

export type InstalledAutomationActionResult = {
  installation: ClimateInstalledAutomation;
  status: InstalledAutomationControlStatus;
};

const assertInstalledAutomationDeviceIdentity = async (
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

export const installedAutomationScriptMatch = (
  installation: ClimateInstalledAutomation,
  status: Pick<InstalledAutomationControlStatus, 'automationScriptId'>
): InstalledAutomationScriptMatch => {
  if (status.automationScriptId === null) return 'missing';
  return status.automationScriptId === installation.script.id ? 'matched' : 'mismatch';
};

const verifyRuntimeState = async (
  installation: ClimateInstalledAutomation
): Promise<InstalledAutomationControlStatus> => {
  const status = await readInstalledAutomationControlStatus(installation);
  if (status.automationScriptId !== installation.script.id) {
    throw new Error('Shelly runtime changed during the operation.');
  }
  return status;
};

const verifyRuntimeMode = async (
  installation: ClimateInstalledAutomation,
  expectedMode: 'auto' | 'manual',
  expectedRelayOn?: boolean,
  expectedManualRequestOn?: boolean
): Promise<InstalledAutomationControlStatus> => {
  const status = await verifyRuntimeState(installation);
  if (status.automationMode !== expectedMode || !status.runtimeModeSupported) {
    throw new Error(`Shelly did not confirm ${expectedMode.toUpperCase()} runtime mode.`);
  }
  if (status.safetyLockout) {
    throw new Error('Shelly runtime safety lockout must be recovered first.');
  }
  if (expectedRelayOn !== undefined && status.relayOn !== expectedRelayOn) {
    throw new Error(
      `Shelly did not confirm relay ${expectedRelayOn ? 'ON' : 'OFF'} in ${expectedMode.toUpperCase()}.`
    );
  }
  if (
    expectedManualRequestOn !== undefined &&
    status.manualRequestOn !== expectedManualRequestOn
  ) {
    throw new Error(
      `Shelly did not confirm manual relay request ${
        expectedManualRequestOn ? 'ON' : 'OFF'
      }.`
    );
  }
  return status;
};

const assertRuntimeNotLocked = (status: InstalledAutomationControlStatus): void => {
  if (status.safetyLockout) {
    throw new Error('Automation runtime safety lockout must be recovered first.');
  }
};

export const enterInstalledAutomationManualMode = async (
  installation: ClimateInstalledAutomation
): Promise<InstalledAutomationActionResult> => {
  const prepared = await ensureInstalledAutomationRuntimeCurrent(installation);
  assertRuntimeNotLocked(prepared.status);

  const nextInstallation = prepared.installation;
  await setInstalledAutomationRuntimeMode(nextInstallation, 'manual');
  return {
    installation: nextInstallation,
    status: await verifyRuntimeMode(nextInstallation, 'manual', false, false)
  };
};

export const enterInstalledAutomationAutoMode = async (
  installation: ClimateInstalledAutomation
): Promise<InstalledAutomationActionResult> => {
  const prepared = await ensureInstalledAutomationRuntimeCurrent(installation);
  assertRuntimeNotLocked(prepared.status);
  if (prepared.status.automationMode !== 'manual') {
    throw new Error('Automation must be in MANUAL before it can return to AUTO.');
  }

  const nextInstallation = prepared.installation;
  await setInstalledAutomationRuntimeMode(nextInstallation, 'auto');
  return {
    installation: nextInstallation,
    status: await verifyRuntimeMode(nextInstallation, 'auto', false, false)
  };
};

export const recoverInstalledAutomation = async (
  installation: ClimateInstalledAutomation
): Promise<InstalledAutomationActionResult> => {
  const recovered = await recoverInstalledAutomationRuntime(installation);
  return { installation: recovered.installation, status: recovered.status };
};

export const setInstalledAutomationRelayState = async (
  installation: ClimateInstalledAutomation,
  on: boolean
): Promise<InstalledAutomationActionResult> => {
  const prepared = await ensureInstalledAutomationRuntimeCurrent(installation);
  const nextInstallation = prepared.installation;
  assertRuntimeNotLocked(prepared.status);
  if (
    prepared.status.automationMode !== 'manual' ||
    !prepared.status.runtimeModeSupported
  ) {
    throw new Error('Manual relay control requires a live MANUAL automation runtime.');
  }

  await setInstalledAutomationManualRelayRequest(nextInstallation, on);
  return {
    installation: nextInstallation,
    status: await verifyRuntimeMode(nextInstallation, 'manual', on, on)
  };
};

export const deleteInstalledAutomation = async (
  installation: ClimateInstalledAutomation
): Promise<void> => {
  await assertInstalledAutomationDeviceIdentity(installation);
  const client = new RpcShellyClient(createShellyTransport(installation.shelly.baseUrl));
  const relayId = installation.config.output.relayId;

  await forceRelayOffAndConfirm(client, relayId);
  const setup = await readShellySetupStatus(installation.shelly.baseUrl);

  for (const script of setup.scripts) {
    if (!script.running) continue;
    unwrapShellyResult(await client.stopScript(script.id));
    await forceRelayOffAndConfirm(client, relayId);
  }

  for (const script of setup.scripts) {
    unwrapShellyResult(await client.deleteScript(script.id));
    await forceRelayOffAndConfirm(client, relayId);
  }

  const verified = await readShellySetupStatus(installation.shelly.baseUrl);
  if (verified.status.relayOn || verified.scripts.length !== 0) {
    throw new Error('Shelly did not confirm a safely deleted automation.');
  }

  await restorePlugButtonAfterManagedAutomation(
    {
      deviceId: installation.shelly.deviceId,
      baseUrl: installation.shelly.baseUrl
    },
    installation.buttonInputModeBeforeInstall
  );
  await forceRelayOffAndConfirm(client, relayId);
};
