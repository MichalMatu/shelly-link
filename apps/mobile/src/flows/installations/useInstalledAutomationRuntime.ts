import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { readShellyResourceDiagnostics } from '../hardware-setup/resourceDiagnostics.js';
import type { ClimateInstalledAutomation, InstalledAutomation } from './model.js';
import {
  enterInstalledAutomationManualMode,
  readInstalledAutomationControlStatus,
  recoverInstalledAutomation,
  enterInstalledAutomationAutoMode,
  setInstalledAutomationRelayState
} from './runtimeControl.js';
import { fetchInstalledAutomationDiagnostics } from './runtimeDiagnostics.js';
import { useInstalledAutomationStore } from './store.js';

const DEFAULT_RUNTIME_REFRESH_MS = 30_000;

type RuntimeQueryOptions = {
  enabled?: boolean;
  refetchInterval?: number | false;
};

const installationQueryIdentity = (installation: ClimateInstalledAutomation) =>
  [
    installation.id,
    installation.shelly.baseUrl,
    installation.script.id,
    installation.script.hash,
    installation.updatedAtMs
  ] as const;

export const installedAutomationDiagnosticsQueryKey = (
  installation: ClimateInstalledAutomation
) =>
  [
    'installed-automation-diagnostics',
    ...installationQueryIdentity(installation)
  ] as const;

const automationScriptIdentity = (installation: InstalledAutomation) =>
  installation.kind === 'time'
    ? (installation.pulseRuntime?.script ?? null)
    : installation.script;

const automationResourceIdentity = (installation: InstalledAutomation) => {
  const script = automationScriptIdentity(installation);
  return [
    installation.id,
    installation.shelly.baseUrl,
    script?.id ?? null,
    script?.hash ?? null,
    installation.updatedAtMs
  ] as const;
};

export const automationResourceDiagnosticsQueryKey = (
  installation: InstalledAutomation
) =>
  [
    'automation-resource-diagnostics',
    ...automationResourceIdentity(installation)
  ] as const;

export const installedAutomationControlQueryKey = (
  installation: ClimateInstalledAutomation
) =>
  ['installed-automation-control', ...installationQueryIdentity(installation)] as const;

export const useInstalledAutomationDiagnostics = (
  installation: ClimateInstalledAutomation,
  options: RuntimeQueryOptions = {}
) =>
  useQuery({
    queryKey: installedAutomationDiagnosticsQueryKey(installation),
    queryFn: () => fetchInstalledAutomationDiagnostics(installation),
    enabled: options.enabled ?? true,
    retry: false,
    refetchInterval: options.refetchInterval ?? DEFAULT_RUNTIME_REFRESH_MS,
    refetchIntervalInBackground: false,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true
  });

export const useAutomationResourceDiagnostics = (
  installation: InstalledAutomation,
  options: RuntimeQueryOptions = {}
) => {
  const script = automationScriptIdentity(installation);
  return useQuery({
    queryKey: automationResourceDiagnosticsQueryKey(installation),
    queryFn: () =>
      readShellyResourceDiagnostics(installation.shelly.baseUrl, script?.id),
    enabled: options.enabled ?? true,
    retry: false,
    refetchInterval: options.refetchInterval ?? DEFAULT_RUNTIME_REFRESH_MS,
    refetchIntervalInBackground: false,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true
  });
};

export const useInstalledAutomationControl = (
  installation: ClimateInstalledAutomation,
  options: { enabled?: boolean } = {}
) =>
  useQuery({
    queryKey: installedAutomationControlQueryKey(installation),
    queryFn: () => readInstalledAutomationControlStatus(installation),
    enabled: options.enabled ?? true,
    retry: false,
    refetchInterval: DEFAULT_RUNTIME_REFRESH_MS,
    refetchIntervalInBackground: false,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true
  });

export type InstalledAutomationControlAction =
  'auto' | 'manual' | 'on' | 'off' | 'recover';

export const useInstalledAutomationActions = (
  installation: ClimateInstalledAutomation
) => {
  const queryClient = useQueryClient();
  const upsertInstallation = useInstalledAutomationStore(
    (state) => state.upsertInstallation
  );

  return useMutation({
    mutationFn: (action: InstalledAutomationControlAction) => {
      switch (action) {
        case 'auto':
          return enterInstalledAutomationAutoMode(installation);
        case 'manual':
          return enterInstalledAutomationManualMode(installation);
        case 'on':
          return setInstalledAutomationRelayState(installation, true);
        case 'off':
          return setInstalledAutomationRelayState(installation, false);
        case 'recover':
          return recoverInstalledAutomation(installation);
      }
    },
    onSuccess: ({ installation: nextInstallation, status }) => {
      if (
        nextInstallation.script.hash !== installation.script.hash ||
        nextInstallation.updatedAtMs !== installation.updatedAtMs
      ) {
        upsertInstallation(nextInstallation);
      }
      queryClient.setQueryData(
        installedAutomationControlQueryKey(nextInstallation),
        status
      );
      void queryClient.invalidateQueries({
        queryKey: installedAutomationDiagnosticsQueryKey(nextInstallation)
      });
      void queryClient.invalidateQueries({
        queryKey: automationResourceDiagnosticsQueryKey(nextInstallation)
      });
    }
  });
};
