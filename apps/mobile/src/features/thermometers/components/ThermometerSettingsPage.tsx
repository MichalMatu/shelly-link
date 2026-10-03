import type { Measurement } from '@lcl/ble-core';
import { IconClock, IconTrash } from '@tabler/icons-react';
import { useTranslation } from '../../../app/i18n.js';
import type { SavedSensorCardDevice } from '../presentation/savedSensorCardPresentation.js';
import { sensorProfileDisplayLabels } from '../presentation/savedSensorCardPresentation.js';
import { SensorLiveReadings } from './SensorLiveReadings.js';
import './ThermometerSettingsPage.css';

type ThermometerSettingsPageProps = {
  device: SavedSensorCardDevice;
  samples: readonly Measurement[];
  pvvxTimePending: boolean;
  onNameChange(value: string): void;
  onPvvxSetTime(): void;
  onRemove(): void;
};

export const ThermometerSettingsPage = ({
  device,
  samples,
  pvvxTimePending,
  onNameChange,
  onPvvxSetTime,
  onRemove
}: ThermometerSettingsPageProps) => {
  const { t } = useTranslation();

  return (
    <div className="thermometer-settings">
      <section
        className="thermometer-settings__section"
        aria-labelledby="thermometer-settings-identity"
      >
        <header className="thermometer-settings__section-header">
          <h2 id="thermometer-settings-identity">
            {t('hardware.sensor.identitySection')}
          </h2>
          <strong>{device.name}</strong>
        </header>

        <label className="thermometer-settings__name-field">
          <span>{t('hardware.sensor.nameLabel')}</span>
          <input
            type="text"
            value={device.name}
            onChange={(event) => onNameChange(event.currentTarget.value)}
          />
        </label>

        <dl className="thermometer-settings__identity-list">
          <div>
            <dt>{t('hardware.sensor.typeLabel')}</dt>
            <dd>{sensorProfileDisplayLabels[device.profileId]}</dd>
          </div>
          <div>
            <dt>{t('hardware.sensor.macLabel')}</dt>
            <dd>{device.runtimeAddress}</dd>
          </div>
        </dl>
      </section>

      <section
        className="thermometer-settings__section"
        aria-labelledby="thermometer-settings-live"
      >
        <header className="thermometer-settings__section-header">
          <h2 id="thermometer-settings-live">
            {t('hardware.sensor.liveReadingsSection')}
          </h2>
        </header>
        <SensorLiveReadings samples={samples} />
      </section>

      <section
        className="thermometer-settings__section"
        aria-labelledby="thermometer-settings-actions"
      >
        <header className="thermometer-settings__section-header">
          <h2 id="thermometer-settings-actions">
            {t('hardware.sensor.deviceActionsSection')}
          </h2>
        </header>
        <div className="thermometer-settings__actions">
          {device.profileId === 'xiaomi_lywsd03mmc_bthome_v2' && (
            <button
              className="secondary-action thermometer-settings__action"
              type="button"
              disabled={pvvxTimePending}
              aria-busy={pvvxTimePending || undefined}
              onClick={onPvvxSetTime}
            >
              <IconClock aria-hidden="true" />
              <span>{t('hardware.sensor.pvvxSetTime')}</span>
            </button>
          )}
          <button
            className="secondary-action thermometer-settings__action thermometer-settings__action--danger"
            type="button"
            onClick={onRemove}
          >
            <IconTrash aria-hidden="true" />
            <span>{t('hardware.sensor.deleteTitle')}</span>
          </button>
        </div>
      </section>
    </div>
  );
};
