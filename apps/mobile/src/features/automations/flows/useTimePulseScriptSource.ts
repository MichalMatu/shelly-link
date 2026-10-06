import { useQuery } from '@tanstack/react-query';
import type { TimePulseInstalledAutomation } from '../data/installedAutomation.js';
import { readShellyManagedAutomationScriptCode } from '../data/shellyManagedAutomation.js';

export const timePulseScriptSourceQueryKey = (
  installation: TimePulseInstalledAutomation
) =>
  [
    'time-pulse-script-source',
    installation.id,
    installation.shelly.baseUrl,
    installation.pulseRuntime.script.id,
    installation.updatedAtMs
  ] as const;

export const useTimePulseScriptSource = (
  installation: TimePulseInstalledAutomation | null,
  enabled: boolean
) =>
  useQuery({
    queryKey: installation
      ? timePulseScriptSourceQueryKey(installation)
      : (['time-pulse-script-source', 'none'] as const),
    queryFn: () => {
      if (!installation) throw new Error('Time + Pulse runtime is not installed.');
      return readShellyManagedAutomationScriptCode(
        installation.shelly.baseUrl,
        installation.pulseRuntime.script.id
      );
    },
    enabled: enabled && installation !== null,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 0
  });
