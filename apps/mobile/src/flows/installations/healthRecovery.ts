import type { InstalledAutomationControlMode } from './runtimeStatus.js';
import type { InstalledAutomationHealth } from './runtimeDiagnostics.js';
import type { InstalledAutomationScriptMatch } from './runtimeControl.js';

export type InstallationRecoveryIssue =
  | 'offline'
  | 'script-stopped'
  | 'sensor-missing'
  | 'safety-lockout'
  | 'ownership-problem';

export type InstallationRecoveryAction = 'refresh' | 'recover';

export type InstallationRecoveryState = {
  issue: InstallationRecoveryIssue;
  action: InstallationRecoveryAction;
};

type InstallationRecoveryInput = {
  diagnosticsError: boolean;
  controlError: boolean;
  scriptMatch: InstalledAutomationScriptMatch | null;
  automationMode: InstalledAutomationControlMode | null;
  runtimeHealth: InstalledAutomationHealth | null;
  safetyLockout: boolean;
};

export const installationRecoveryState = ({
  diagnosticsError,
  controlError,
  scriptMatch,
  automationMode,
  runtimeHealth,
  safetyLockout
}: InstallationRecoveryInput): InstallationRecoveryState | null => {
  if (diagnosticsError && controlError) {
    return { issue: 'offline', action: 'refresh' };
  }

  if (scriptMatch && scriptMatch !== 'matched') {
    return { issue: 'ownership-problem', action: 'refresh' };
  }

  if (scriptMatch === 'matched' && automationMode === 'stopped') {
    return { issue: 'script-stopped', action: 'recover' };
  }

  if (safetyLockout) {
    return { issue: 'safety-lockout', action: 'recover' };
  }

  if (runtimeHealth === 'stale') {
    return { issue: 'sensor-missing', action: 'refresh' };
  }

  return null;
};
