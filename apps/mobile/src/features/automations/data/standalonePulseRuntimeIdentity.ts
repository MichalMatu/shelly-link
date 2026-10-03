import { hashScriptCode } from '@lcl/shelly-client';
import type { StandalonePulseInstalledAutomation } from './installedAutomation.js';
import { readShellyManagedAutomationScriptCode } from './shellyManagedAutomation.js';

export const assertStandalonePulseRuntimeCurrent = async (
  installation: StandalonePulseInstalledAutomation
): Promise<void> => {
  const code = await readShellyManagedAutomationScriptCode(
    installation.shelly.baseUrl,
    installation.script.id
  );
  if (hashScriptCode(code) !== installation.script.hash) {
    throw new Error('Shelly Pulse runtime no longer matches the installed automation.');
  }
};
