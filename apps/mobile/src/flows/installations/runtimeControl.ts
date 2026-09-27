import { unwrapShellyResult } from '../../platform/shellyResult.js';
import { createShellyTransport } from '../../platform/shellyHttpTransport.js';
import { restorePlugButtonAfterManagedAutomation } from '../../features/plugs/index.js';
import { normalizeShellyDeviceId, RpcShellyClient } from '@lcl/shelly-client';
import { readShellySetupStatus } from '../hardware-setup/shellyRequests.js';
import type { ClimateInstalledAutomation } from './model.js';
import { forceRelayOffAndConfirm } from './relaySafety.js';
import {
  setInstalledAutomationRuntimeMode,
  type SettableInstalledAutomationRuntimeMode
} from './runtimeModeTransport.js';
import {
  readInstalledAutomationControlStatus,
  type InstalledAutomationControlMode,
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
  if (status.automationScriptId === null) {
    return 'missing';
  }
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
  expectedMode: InstalledAutomationControlMode,
  expectedRelayOn?: boolean
): Promise<InstalledAutomationControlStatus> => {
  const status = await verifyRuntimeState(installation);
  if (status.automationMode !== expectedMode || !status.runtimeModeSupported) {
    throw new Error(`Shelly did not confirm ${expectedMode.toUpperCase()} runtime mode.`);
  }
  if (expectedRelayOn !== undefined && status.relayOn !== expectedRelayOn) {
    throw new Error(
      `Shelly did not confirm relay ${expectedRelayOn ? 'ON' : 'OFF'} in ${expectedMode.toUpperCase()}.`
    );
  }
  return status;
};

const isManualMode = (mode: InstalledAutomationControlMode): boolean =>
  mode === 'manual-off' || mode === 'manual-on';

const setAndVerifyRuntimeMode = async (
  installation: ClimateInstalledAutomation,
  mode: SettableInstalledAutomationRuntimeMode,
  relayOn?: boolean
): Promise<InstalledAutomationControlStatus> => {
  await setInstalledAutomationRuntimeMode(installation, mode);
  return verifyRuntimeMode(installation, mode, relayOn);
};

export const enterInstalledAutomationManualMode = async (
  installation: ClimateInstalledAutomation
): Promise<InstalledAutomationActionResult> => {
  const prepared = await ensureInstalledAutomationRuntimeCurrent(installation);
  if (prepared.status.automationMode === 'fault') {
    throw new Error('Automation runtime is in FAULT and must be recovered first.');
  }

  const nextInstallation = prepared.installation;
  return {
    installation: nextInstallation,
    status: await setAndVerifyRuntimeMode(nextInstallation, 'manual-off', false)
  };
};

export const pauseInstalledAutomation = async (
  installation: ClimateInstalledAutomation
): Promise<InstalledAutomationActionResult> => {
  const prepared = await ensureInstalledAutomationRuntimeCurrent(installation);
  if (prepared.status.automationMode === 'fault') {
    throw new Error('Automation runtime is in FAULT and must be recovered first.');
  }

  const nextInstallation = prepared.installation;
  return {
    installation: nextInstallation,
    status: await setAndVerifyRuntimeMode(nextInstallation, 'paused', false)
  };
};

export const resumeInstalledAutomation = async (
  installation: ClimateInstalledAutomation
): Promise<InstalledAutomationActionResult> => {
  const prepared = await ensureInstalledAutomationRuntimeCurrent(installation);
  if (
    prepared.status.automationMode !== 'paused' &&
    !isManualMode(prepared.status.automationMode)
  ) {
    throw new Error('Automation must be PAUSED or MANUAL before it can return to AUTO.');
  }

  const nextInstallation = prepared.installation;
  if (prepared.status.automationMode === 'manual-on') {
    await setAndVerifyRuntimeMode(nextInstallation, 'manual-off', false);
  }

  return {
    installation: nextInstallation,
    status: await setAndVerifyRuntimeMode(nextInstallation, 'auto', false)
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
  if (!isManualMode(prepared.status.automationMode) || !prepared.status.runtimeModeSupported) {
    throw new Error('Manual relay control requires a live MANUAL automation runtime.');
  }

  const mode = on ? 'manual-on' : 'manual-off';
  return {
    installation: nextInstallation,
    status: await setAndVerifyRuntimeMode(nextInstallation, mode, on)
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
