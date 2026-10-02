import { IconAlertTriangle } from '@tabler/icons-react';
import { Pulse, type StandalonePulseInstalledAutomation } from '../features/automations/index.js';
import { PlugDashboardCardShell } from '../features/plugs/index.js';
import { useTranslation } from './i18n.js';

type StandalonePulseAutomationCardProps = {
  installation: StandalonePulseInstalledAutomation;
  onOpen(installationId: string): void;
  onNameChange(value: string): void;
};

export const StandalonePulseAutomationCard = ({
  installation,
  onOpen,
  onNameChange
}: StandalonePulseAutomationCardProps) => {
  const { t } = useTranslation();
  const query = Pulse.Operational.useStatus(installation);
  const footer = query.isError ? (
    <footer className="automation-card__footer">
      <div
        className="automation-card__status automation-card__status--attention"
        role="status"
      >
        <IconAlertTriangle aria-hidden="true" />
        <span>{t('dashboard.health.attention')}</span>
      </div>
    </footer>
  ) : undefined;

  return (
    <PlugDashboardCardShell
      name={installation.shelly.name}
      relayState={query.data?.finalOutputOn ?? undefined}
      busy={false}
      telemetry={{ powerW: null, voltageV: null, energyWh: null, localTime: null }}
      body={<Pulse.Operational.StatusSummary status={query.data} compact />}
      className="automation-card automation-card--pulse"
      detailContext="Wi-Fi"
      footer={footer}
      showTelemetry={false}
      showRelayControls={false}
      onNameChange={onNameChange}
      onOpenDetails={() => onOpen(installation.id)}
      onTurnRelayOn={() => undefined}
      onTurnRelayOff={() => undefined}
    />
  );
};
