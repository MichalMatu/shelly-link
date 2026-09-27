import { IconAlertTriangle } from '@tabler/icons-react';
import { useTranslation } from '../../../app/i18n.js';
import type { SavedPlugWithBleLocator } from '../data/savedPlug.js';
import { useSavedBlePlugRuntime } from '../flows/useSavedBlePlugRuntime.js';
import { PlugDashboardCardShell } from './PlugDashboardCardShell.js';

export type BleOnlyPlugCardProps = {
  plug: SavedPlugWithBleLocator;
  onNameChange(value: string): void;
  onOpen(): void;
};

const dashboardName = (plug: SavedPlugWithBleLocator): string => {
  const savedName = plug.name.trim();
  const advertisementName = plug.advertisementName.trim();
  const model = plug.model.trim();
  return savedName === advertisementName && model ? model : plug.name;
};

export const BleOnlyPlugCard = ({ plug, onNameChange, onOpen }: BleOnlyPlugCardProps) => {
  const { t } = useTranslation();
  const runtime = useSavedBlePlugRuntime(plug);
  const relayState = runtime.status?.relayOn;
  const isBusy = runtime.isPending || runtime.isRelayPending || runtime.status === null;
  const hasError = runtime.isError || runtime.isRelayError;
  const displayName = dashboardName(plug);

  return (
    <PlugDashboardCardShell
      name={displayName}
      relayState={relayState}
      busy={isBusy}
      telemetry={{
        powerW: runtime.status?.telemetry.powerW,
        voltageV: runtime.status?.telemetry.voltageV,
        energyWh: runtime.status?.telemetry.energyWh,
        localTime: runtime.status?.clock.localTime
      }}
      automationAction={{ disabled: true }}
      detailContext={t('common.bluetooth')}
      footer={
        hasError ? (
          <footer className="automation-card__footer">
            {runtime.isError && (
              <div
                className="automation-card__status automation-card__status--offline"
                role="alert"
              >
                <IconAlertTriangle aria-hidden="true" />
                <span>{t('dashboard.readFailed')}</span>
              </div>
            )}
            {runtime.isRelayError && (
              <span className="automation-control-error" role="alert">
                {t('detail.actionFailed')}
              </span>
            )}
          </footer>
        ) : undefined
      }
      onNameChange={onNameChange}
      onOpenDetails={onOpen}
      onTurnRelayOn={runtime.turnRelayOn}
      onTurnRelayOff={runtime.turnRelayOff}
    />
  );
};
