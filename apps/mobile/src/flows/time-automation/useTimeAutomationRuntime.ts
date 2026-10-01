import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  isTimePulseInstalledAutomation,
  pauseTimeAutomation,
  pauseTimePulseAutomation,
  readTimeAutomationRuntime,
  resumeTimeAutomation,
  resumeTimePulseAutomation,
  setTimeAutomationManualRelay
} from '../../features/automations/index.js';
import type { TimeInstalledAutomation } from '../installations/model.js';

export const timeAutomationRuntimeQueryKey = (installation: TimeInstalledAutomation) =>
  [
    'time-automation-runtime',
    installation.id,
    installation.shelly.baseUrl,
    installation.schedule.onJobId,
    installation.schedule.offJobId,
    installation.config.onTime,
    installation.config.offTime,
    installation.updatedAtMs
  ] as const;

export const useTimeAutomationRuntime = (
  installation: TimeInstalledAutomation,
  options: { enabled?: boolean } = {}
) =>
  useQuery({
    queryKey: timeAutomationRuntimeQueryKey(installation),
    queryFn: () => readTimeAutomationRuntime(installation),
    enabled: options.enabled ?? true,
    retry: false,
    refetchInterval: 30_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true
  });

export type TimeAutomationAction = 'auto' | 'manual' | 'on' | 'off';

export const useTimeAutomationActions = (installation: TimeInstalledAutomation) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (action: TimeAutomationAction) => {
      switch (action) {
        case 'auto':
          if (isTimePulseInstalledAutomation(installation)) {
            await resumeTimePulseAutomation(installation);
            return readTimeAutomationRuntime(installation);
          }
          return resumeTimeAutomation(installation);
        case 'manual':
          if (isTimePulseInstalledAutomation(installation)) {
            await pauseTimePulseAutomation(installation);
            return readTimeAutomationRuntime(installation);
          }
          return pauseTimeAutomation(installation);
        case 'on':
          return setTimeAutomationManualRelay(installation, true);
        case 'off':
          return setTimeAutomationManualRelay(installation, false);
      }
    },
    onSuccess: (runtime) => {
      queryClient.setQueryData(timeAutomationRuntimeQueryKey(installation), runtime);
    }
  });
};
