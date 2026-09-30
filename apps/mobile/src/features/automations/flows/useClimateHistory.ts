import { useQuery } from '@tanstack/react-query';
import { createShellyTransport } from '../../../platform/shellyHttpTransport.js';
import type { ClimateInstalledAutomation } from '../data/installedAutomation.js';
import { readClimateHistory } from '../data/climateHistory.js';

const HISTORY_REFRESH_MS = 30_000;

export const climateHistoryQueryKey = (installation: ClimateInstalledAutomation) =>
  [
    'climate-history',
    installation.id,
    installation.shelly.baseUrl,
    installation.script.id,
    installation.script.hash,
    installation.updatedAtMs
  ] as const;

export const useClimateHistory = (
  installation: ClimateInstalledAutomation,
  options: { enabled?: boolean } = {}
) =>
  useQuery({
    queryKey: climateHistoryQueryKey(installation),
    queryFn: async () => {
      const result = await readClimateHistory(
        createShellyTransport(installation.shelly.baseUrl)
      );
      if (!result.ok) {
        throw new Error(result.error.userMessageKey);
      }
      return result.value;
    },
    enabled: options.enabled ?? true,
    retry: false,
    refetchInterval: HISTORY_REFRESH_MS,
    refetchIntervalInBackground: false,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true
  });
