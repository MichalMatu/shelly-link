import { useQuery } from '@tanstack/react-query';
import { createShellyTransport } from '../../../platform/shellyHttpTransport.js';
import type {
  ClimateInstalledAutomation,
  StandalonePulseInstalledAutomation
} from '../data/installedAutomation.js';
import { readAutomationHistory } from '../data/automationHistory.js';

const HISTORY_REFRESH_MS = 30_000;

type HistoryInstallation =
  ClimateInstalledAutomation | StandalonePulseInstalledAutomation;

export const automationHistoryQueryKey = (installation: HistoryInstallation) =>
  [
    'automation-history',
    installation.id,
    installation.shelly.baseUrl,
    installation.script.id,
    installation.script.hash,
    installation.updatedAtMs
  ] as const;

export const useAutomationHistory = (
  installation: HistoryInstallation,
  options: { enabled?: boolean } = {}
) =>
  useQuery({
    queryKey: automationHistoryQueryKey(installation),
    queryFn: async () => {
      const result = await readAutomationHistory(
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
