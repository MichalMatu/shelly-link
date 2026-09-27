import {
  readShellyControlStatus,
  type ShellyControlStatus
} from '../../features/automations/index.js';
import type { ClimateInstalledAutomation } from './model.js';
import { readInstalledAutomationRuntimeMode } from './runtimeModeTransport.js';

export type InstalledAutomationControlMode = 'auto' | 'manual' | 'stopped' | 'missing';

export type InstalledAutomationControlStatus = Omit<
  ShellyControlStatus,
  'automationMode'
> & {
  automationMode: InstalledAutomationControlMode;
  runtimeModeSupported: boolean;
  manualRequestOn: boolean;
  automationFault: string | null;
  safetyLockout: boolean;
  safetyReason: string | null;
};

const nonRunningMode = (status: ShellyControlStatus): InstalledAutomationControlMode =>
  status.automationMode === 'manual' ? 'stopped' : status.automationMode;

const withoutRuntimeState = (
  status: ShellyControlStatus
): InstalledAutomationControlStatus => ({
  ...status,
  automationMode: nonRunningMode(status),
  runtimeModeSupported: false,
  manualRequestOn: false,
  automationFault: null,
  safetyLockout: false,
  safetyReason: null
});

export const readInstalledAutomationControlStatus = async (
  installation: ClimateInstalledAutomation
): Promise<InstalledAutomationControlStatus> => {
  const status = await readShellyControlStatus(installation.shelly.baseUrl);
  if (
    status.automationScriptId === null ||
    status.automationScriptId !== installation.script.id ||
    status.automationMode !== 'auto'
  ) {
    return withoutRuntimeState(status);
  }

  const runtime = await readInstalledAutomationRuntimeMode(installation);
  return {
    ...status,
    automationMode: runtime.mode,
    runtimeModeSupported: runtime.supported,
    manualRequestOn: runtime.manualRequestOn,
    automationFault: runtime.automationFault,
    safetyLockout: runtime.safetyLockout,
    safetyReason: runtime.safetyReason
  };
};
