import { useQuery } from '@tanstack/react-query';
import type {
  StandalonePulseInstalledAutomation,
  TimePulseInstalledAutomation
} from '../data/installedAutomation.js';
import { readScriptPulseOperationalStatus } from '../data/pulseOperationalStatus.js';

export type ScriptPulseInstalledAutomation =
  | TimePulseInstalledAutomation
  | StandalonePulseInstalledAutomation;

const pulseScriptId = (installation: ScriptPulseInstalledAutomation): number =>
  installation.kind === 'time'
    ? installation.pulseRuntime.script.id
    : installation.script.id;

export const pulseOperationalStatusQueryKey = (
  installation: ScriptPulseInstalledAutomation
) => [
  'pulse-operational-status',
  installation.id,
  installation.shelly.baseUrl,
  pulseScriptId(installation),
  installation.updatedAtMs
] as const;

export const usePulseOperationalStatus = (
  installation: ScriptPulseInstalledAutomation,
  options: { enabled?: boolean; refetchInterval?: number } = {}
) =>
  useQuery({
    queryKey: pulseOperationalStatusQueryKey(installation),
    queryFn: () =>
      readScriptPulseOperationalStatus({
        baseUrl: installation.shelly.baseUrl,
        scriptId: pulseScriptId(installation)
      }),
    enabled: options.enabled ?? true,
    retry: false,
    refetchInterval: options.refetchInterval ?? 5_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true
  });
