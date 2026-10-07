import type { InstalledAutomation } from '../data/installedAutomation.js';

export type AutomationDetailVariant =
  'climate' | 'climate-pulse' | 'time' | 'time-pulse' | 'pulse';

export type AutomationDetailIcon = 'temperature' | 'clock' | 'pulse';
export type AutomationHistoryProfile = 'climate' | 'pulse';

export type AutomationDetailCapabilities = {
  variant: AutomationDetailVariant;
  automationIcon: AutomationDetailIcon;
  hasHistory: boolean;
  hasScript: boolean;
  historyProfile?: AutomationHistoryProfile;
};

export const automationDetailCapabilities = (
  installation: InstalledAutomation
): AutomationDetailCapabilities => {
  if (installation.kind === 'climate') {
    return {
      variant: installation.config.execution?.pulse ? 'climate-pulse' : 'climate',
      automationIcon: 'temperature',
      hasHistory: true,
      hasScript: true,
      historyProfile: 'climate'
    };
  }

  if (installation.kind === 'time') {
    const hasPulse = installation.pulseRuntime !== undefined;
    return {
      variant: hasPulse ? 'time-pulse' : 'time',
      automationIcon: 'clock',
      hasHistory: false,
      hasScript: hasPulse
    };
  }

  return {
    variant: 'pulse',
    automationIcon: 'pulse',
    hasHistory: true,
    hasScript: true,
    historyProfile: 'pulse'
  };
};
