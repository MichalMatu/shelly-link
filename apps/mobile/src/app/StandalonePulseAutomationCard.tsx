import { AutomationDashboardBody } from '../features/automation-dashboard/index.js';
import { Pulse, type InstalledAutomation } from '../features/automations/index.js';
import {
  PlugAutomationModeControl,
  PlugDashboardCardShell,
  PlugDashboardFeedbackFooter
} from '../features/plugs/index.js';
import { pulseCycleCopy } from './locales/pulseCycle.js';
import { useTranslation } from './i18n.js';

type StandalonePulseInstalledAutomation = Extract<InstalledAutomation, { kind: 'pulse' }>;

type StandalonePulseAutomationCardProps = {
  installation: StandalonePulseInstalledAutomation;
  onOpen(installationId: string): void;
  onNameChange(value: string): void;
};

const secondsLabel = (milliseconds: number): string => `${milliseconds / 1_000} s`;

export const StandalonePulseAutomationCard = ({
  installation,
  onOpen,
  onNameChange
}: StandalonePulseAutomationCardProps) => {
  const { locale, t } = useTranslation();
  const labels = pulseCycleCopy[locale];
  const runtimeQuery = Pulse.Standalone.useRuntime(installation);
  const runtimeMatches = runtimeQuery.data?.automationScriptId === installation.script.id;
  const automationRunning =
    runtimeMatches && runtimeQuery.data?.automationMode === 'auto';
  const manualControl = runtimeMatches && runtimeQuery.data?.automationMode === 'manual';
  const pulseQuery = Pulse.Operational.useStatus(automationRunning ? installation : null);
  const action = Pulse.Standalone.useActions(installation);
  const runtimeControllable =
    runtimeMatches &&
    (runtimeQuery.data?.automationMode === 'auto' ||
      runtimeQuery.data?.automationMode === 'manual');
  const execution = installation.config.pulse.execution;
  const executionLabel =
    execution.mode === 'continuous'
      ? labels.continuous
      : execution.mode === 'cycles'
        ? `${labels.cycles} · ${execution.count}`
        : `${labels.duration} · ${secondsLabel(execution.durationMs)}`;
  const body = (
    <AutomationDashboardBody
      ariaLabel={labels.title}
      status={<Pulse.Operational.StatusSummary status={pulseQuery.data} compact />}
      configuration={[
        {
          id: 'on',
          label: labels.onSeconds,
          value: secondsLabel(installation.config.pulse.onMs)
        },
        {
          id: 'off',
          label: labels.offSeconds,
          value: secondsLabel(installation.config.pulse.offMs)
        },
        { id: 'execution', label: labels.execution, value: executionLabel }
      ]}
      controls={
        <PlugAutomationModeControl
          autoActive={automationRunning}
          manualActive={manualControl}
          disabled={action.isPending || !runtimeControllable}
          onAuto={() => {
            if (!automationRunning) action.mutate('auto');
          }}
          onManual={() => {
            if (!manualControl) action.mutate('manual');
          }}
        />
      }
    />
  );
  const warning =
    pulseQuery.isError ||
    runtimeQuery.isError ||
    (runtimeQuery.data !== undefined && !runtimeMatches) ||
    action.isError;
  const footer = warning ? (
    <PlugDashboardFeedbackFooter
      warningLabel={t('dashboard.health.attention')}
      actionErrorLabel={action.isError ? t('detail.actionFailed') : null}
    />
  ) : undefined;

  return (
    <PlugDashboardCardShell
      name={installation.shelly.name}
      relayState={
        runtimeQuery.data?.relayOn ?? pulseQuery.data?.finalOutputOn ?? undefined
      }
      busy={action.isPending}
      telemetry={{
        powerW: runtimeQuery.data?.telemetry.powerW,
        voltageV: runtimeQuery.data?.telemetry.voltageV,
        energyWh: runtimeQuery.data?.telemetry.energyWh,
        localTime: runtimeQuery.data?.clock.localTime
      }}
      body={body}
      className="automation-card automation-card--pulse"
      detailContext="Wi-Fi"
      footer={footer}
      openDetailsOnCardClick={false}
      relayControlsDisabled={!manualControl}
      onNameChange={onNameChange}
      onOpenDetails={() => onOpen(installation.id)}
      onTurnRelayOn={() => action.mutate('on')}
      onTurnRelayOff={() => action.mutate('off')}
    />
  );
};
