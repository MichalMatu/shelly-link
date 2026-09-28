import { useTranslation } from '../app/i18n.js';
import { PlugDashboardCardShell } from '../features/plugs/index.js';
import type { TimeInstalledAutomation } from '../flows/installations/model.js';
import { useTimeAutomationRuntime } from '../flows/time-automation/useTimeAutomationRuntime.js';

type TimeAutomationCardProps = {
  installation: TimeInstalledAutomation;
  onOpen(installationId: string): void;
  onNameChange(value: string): void;
};

const healthClass = (state: 'running' | 'paused' | 'attention' | 'offline' | 'loading') =>
  `automation-health automation-health--${
    state === 'running'
      ? 'ok'
      : state === 'paused'
        ? 'paused'
        : state === 'offline'
          ? 'offline'
          : state === 'loading'
            ? 'unknown'
            : 'attention'
  }`;

export const TimeAutomationCard = ({
  installation,
  onOpen,
  onNameChange
}: TimeAutomationCardProps) => {
  const { t } = useTranslation();
  const query = useTimeAutomationRuntime(installation);
  const state = query.isPending
    ? 'loading'
    : query.isError
      ? 'offline'
      : (query.data?.scheduleState ?? 'attention');
  const stateLabel =
    state === 'running'
      ? t('dashboard.health.ok')
      : state === 'paused'
        ? t('dashboard.health.paused')
        : state === 'offline'
          ? t('dashboard.health.offline')
          : state === 'loading'
            ? t('dashboard.health.loading')
            : t('dashboard.health.attention');

  const body = (
    <>
      <div className="automation-status-row">
        <span className={healthClass(state)}>{stateLabel}</span>
        <span className="automation-status-mode">{t('time.family')}</span>
      </div>

      <div className="automation-metrics" aria-label={t('time.scheduleSummary')}>
        <div>
          <span>{t('time.onTime')}</span>
          <strong>{installation.config.onTime}</strong>
        </div>
        <div>
          <span>{t('time.offTime')}</span>
          <strong>{installation.config.offTime}</strong>
        </div>
        <div>
          <span>{t('dashboard.output')}</span>
          <strong>{query.data ? (query.data.relayOn ? 'ON' : 'OFF') : '—'}</strong>
        </div>
      </div>

      <dl className="automation-summary">
        <div>
          <dt>{t('time.clock')}</dt>
          <dd>{query.data?.clock.localTime ?? '—'}</dd>
        </div>
        <div>
          <dt>{t('time.owner')}</dt>
          <dd>{t('time.nativeSchedule')}</dd>
        </div>
      </dl>
    </>
  );

  return (
    <PlugDashboardCardShell
      name={installation.shelly.name}
      relayState={query.data?.relayOn}
      busy={query.isFetching}
      telemetry={{
        powerW: undefined,
        voltageV: undefined,
        energyWh: undefined,
        localTime: query.data?.clock.localTime
      }}
      body={body}
      className="automation-card automation-card--time"
      detailContext="Wi-Fi"
      openDetailsOnCardClick={false}
      showTelemetry={false}
      showRelayControls={false}
      onNameChange={onNameChange}
      onOpenDetails={() => onOpen(installation.id)}
      onTurnRelayOn={() => undefined}
      onTurnRelayOff={() => undefined}
    />
  );
};
