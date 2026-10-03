import { useQuery } from '@tanstack/react-query';
import type { StandalonePulseInstalledAutomation } from '../data/installedAutomation.js';
import { readShellyManagedAutomationScriptCode } from '../data/shellyManagedAutomation.js';

export const standalonePulseScriptSourceQueryKey = (
  installation: StandalonePulseInstalledAutomation
) =>
  [
    'standalone-pulse-script-source',
    installation.id,
    installation.shelly.baseUrl,
    installation.script.id,
    installation.updatedAtMs
  ] as const;

export const useStandalonePulseScriptSource = (
  installation: StandalonePulseInstalledAutomation,
  enabled: boolean
) =>
  useQuery({
    queryKey: standalonePulseScriptSourceQueryKey(installation),
    queryFn: () =>
      readShellyManagedAutomationScriptCode(
        installation.shelly.baseUrl,
        installation.script.id
      ),
    enabled,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 0
  });
