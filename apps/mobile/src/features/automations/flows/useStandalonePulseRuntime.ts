import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { StandalonePulseInstalledAutomation } from '../data/installedAutomation.js';
import { pulseOperationalStatusQueryKey } from './usePulseOperationalStatus.js';
import {
  pauseStandalonePulseAutomation,
  resumeStandalonePulseAutomation
} from '../data/standalonePulseAutomationRuntime.js';
import { setStandalonePulseManualRelay } from '../data/standalonePulseManualRelay.js';
import { readShellyControlStatus } from '../data/shellyManagedAutomation.js';

export const standalonePulseRuntimeQueryKey = (
  installation: StandalonePulseInstalledAutomation
) =>
  [
    'standalone-pulse-runtime',
    installation.id,
    installation.shelly.baseUrl,
    installation.script.id,
    installation.updatedAtMs
  ] as const;

export const useStandalonePulseRuntime = (
  installation: StandalonePulseInstalledAutomation,
  options: { enabled?: boolean } = {}
) =>
  useQuery({
    queryKey: standalonePulseRuntimeQueryKey(installation),
    queryFn: () => readShellyControlStatus(installation.shelly.baseUrl),
    enabled: options.enabled ?? true,
    retry: false,
    refetchInterval: 5_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true
  });

export type StandalonePulseAction = 'auto' | 'manual' | 'on' | 'off';

export const useStandalonePulseActions = (
  installation: StandalonePulseInstalledAutomation
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (action: StandalonePulseAction) => {
      switch (action) {
        case 'auto':
          await resumeStandalonePulseAutomation(installation);
          return readShellyControlStatus(installation.shelly.baseUrl);
        case 'manual':
          await pauseStandalonePulseAutomation(installation);
          return readShellyControlStatus(installation.shelly.baseUrl);
        case 'on':
          return setStandalonePulseManualRelay(installation, true);
        case 'off':
          return setStandalonePulseManualRelay(installation, false);
      }
    },
    onSuccess: (runtime) => {
      queryClient.setQueryData(standalonePulseRuntimeQueryKey(installation), runtime);
      void queryClient.invalidateQueries({
        queryKey: pulseOperationalStatusQueryKey(installation)
      });
    }
  });
};
