import { useQuery } from '@tanstack/react-query';
import type {
  StandalonePulseInstalledAutomation,
  TimePulseInstalledAutomation
} from '../data/installedAutomation.js';
import { readScriptPulseOperationalStatus } from '../data/pulseOperationalStatus.js';

export type ScriptPulseInstalledAutomation =
  TimePulseInstalledAutomation | StandalonePulseInstalledAutomation;

const pulseScriptId = (installation: ScriptPulseInstalledAutomation): number =>
  installation.kind === 'time'
    ? installation.pulseRuntime.script.id
    : installation.script.id;

export const pulseOperationalStatusQueryKey = (
  installation: ScriptPulseInstalledAutomation | null
) =>
  [
    'pulse-operational-status',
    installation?.id ?? 'none',
    installation?.shelly.baseUrl ?? '',
    installation ? pulseScriptId(installation) : -1,
    installation?.updatedAtMs ?? 0
  ] as const;

export const usePulseOperationalStatus = (
  installation: ScriptPulseInstalledAutomation | null,
  options: { enabled?: boolean; refetchInterval?: number } = {}
) =>
  useQuery({
    queryKey: pulseOperationalStatusQueryKey(installation),
    queryFn: () => {
      if (!installation) throw new Error('Pulse runtime is not installed.');
      return readScriptPulseOperationalStatus({
        baseUrl: installation.shelly.baseUrl,
        scriptId: pulseScriptId(installation)
      });
    },
    enabled: installation !== null && (options.enabled ?? true),
    retry: false,
    refetchInterval: options.refetchInterval ?? 5_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true
  });
