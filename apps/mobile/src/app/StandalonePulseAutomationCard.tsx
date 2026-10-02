import { IconAlertTriangle } from '@tabler/icons-react';
import { Pulse, type InstalledAutomation } from '../features/automations/index.js';
import {
  PlugAutomationModeControl,
  PlugDashboardCardShell
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
  const pulseQuery = Pulse.Operational.useStatus(installation);
  const runtimeQuery = Pulse.Standalone.useRuntime(installation);
  const action = Pulse.Standalone.useActions(installation);
  const runtimeMatches = runtimeQuery.data?.automationScriptId === installation.script.id;
  const automationRunning =
    runtimeMatches && runtimeQuery.data?.automationMode === 'auto';
  const manualControl = runtimeMatches && runtimeQuery.data?.automationMode === 'manual';
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
    <>
      <div className="automation-card__main" aria-label={labels.title}>
        <div className="automation-card__primary-metric">
          <strong>{secondsLabel(installation.config.pulse.onMs)}</strong>
          <small>
            <span>{labels.onSeconds}</span>
          </small>
        </div>
        <div className="automation-card__secondary-metrics">
          <div>
            <span>{labels.offSeconds}</span>
            <strong>{secondsLabel(installation.config.pulse.offMs)}</strong>
          </div>
          <div>
            <span>{labels.execution}</span>
            <strong>{executionLabel}</strong>
          </div>
        </div>
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
      </div>
      <Pulse.Operational.StatusSummary status={pulseQuery.data} compact />
    </>
  );
  const warning =
    pulseQuery.isError ||
    runtimeQuery.isError ||
    (runtimeQuery.data !== undefined && !runtimeMatches) ||
    action.isError;
  const footer = warning ? (
    <footer className="automation-card__footer">
      <div
        className="automation-card__status automation-card__status--attention"
        role="status"
      >
        <IconAlertTriangle aria-hidden="true" />
        <span>{t('dashboard.health.attention')}</span>
      </div>
      {action.isError && (
        <span className="automation-control-error" role="alert">
          {t('detail.actionFailed')}
        </span>
      )}
    </footer>
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
