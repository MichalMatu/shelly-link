import { IconAlertTriangle } from '@tabler/icons-react';
import { useTranslation } from '../app/i18n.js';
import { OperationalStatus, Pulse } from '../features/automations/index.js';
import {
  PlugAutomationModeControl,
  PlugDashboardCardShell
} from '../features/plugs/index.js';
import type { TimeInstalledAutomation } from '../flows/installations/model.js';
import {
  useTimeAutomationActions,
  useTimeAutomationRuntime
} from '../flows/time-automation/useTimeAutomationRuntime.js';

type TimeAutomationCardProps = {
  installation: TimeInstalledAutomation;
  onOpen(installationId: string): void;
  onNameChange(value: string): void;
};

export const TimeAutomationCard = ({
  installation,
  onOpen,
  onNameChange
}: TimeAutomationCardProps) => {
  const { t } = useTranslation();
  const query = useTimeAutomationRuntime(installation);
  const action = useTimeAutomationActions(installation);
  const pulseInstallation = Pulse.Time.isInstalled(installation) ? installation : null;
  const pulseQuery = Pulse.Operational.useStatus(pulseInstallation);
  const runtimeState = query.isPending
    ? 'loading'
    : query.isError
      ? 'offline'
      : (query.data?.scheduleState ?? 'attention');
  const automationRunning = runtimeState === 'running';
  const manualControl = runtimeState === 'paused';
  const runtimeControllable = automationRunning || manualControl;

  const body = (
    <>
      <div className="automation-card__main" aria-label={t('time.scheduleSummary')}>
        <div className="automation-card__primary-metric">
          <strong aria-label={`${t('time.onTime')}: ${installation.config.onTime}`}>
            {installation.config.onTime}
          </strong>
          <small>
            <span>{t('time.onTime')}</span>
          </small>
        </div>

        <div className="automation-card__secondary-metrics">
          <div>
            <span>{t('time.offTime')}</span>
            <strong>{installation.config.offTime}</strong>
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
      {pulseInstallation ? (
        <Pulse.Operational.StatusSummary status={pulseQuery.data} compact />
      ) : (
        <OperationalStatus.TimeSummary
          config={installation.config}
          localTime={query.data?.clock.localTime}
          relayOn={query.data?.relayOn}
          state={runtimeState}
          compact
        />
      )}
    </>
  );

  const warningLabel =
    runtimeState === 'offline'
      ? t('dashboard.health.offline')
      : runtimeState === 'attention' || (pulseInstallation && pulseQuery.isError)
        ? t('dashboard.health.attention')
        : null;
  const footer =
    warningLabel || action.isError ? (
      <footer className="automation-card__footer">
        {warningLabel && (
          <div
            className={`automation-card__status automation-card__status--${
              runtimeState === 'offline' ? 'offline' : 'attention'
            }`}
            role="status"
          >
            <IconAlertTriangle aria-hidden="true" />
            <span>{warningLabel}</span>
          </div>
        )}
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
      relayState={query.data?.relayOn}
      busy={action.isPending}
      telemetry={{
        powerW: query.data?.telemetry.powerW,
        voltageV: query.data?.telemetry.voltageV,
        energyWh: query.data?.telemetry.energyWh,
        localTime: query.data?.clock.localTime
      }}
      body={body}
      className="automation-card automation-card--time"
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
