import type { ShellyCloudReadResult, ShellyPlugsUiReadResult } from '@lcl/shelly-client';
import { DiagnosticRow } from '@lcl/ui';
import { useTranslation } from '../../../app/i18n.js';
import { deviceButtonModeCopy } from '../../../app/locales/deviceButtonMode.js';
import { deviceCloudCopy } from '../../../app/locales/deviceCloud.js';
import { deviceLedCopy } from '../../../app/locales/deviceLed.js';
import './PlugSettingsSurface.css';

export type BlePlugDeviceReadOnlyPanelProps = {
  settings: ShellyPlugsUiReadResult;
  cloud: ShellyCloudReadResult;
};

export const BlePlugDeviceReadOnlyPanel = ({
  settings,
  cloud
}: BlePlugDeviceReadOnlyPanelProps) => {
  const { locale, t } = useTranslation();
  const ledCopy = deviceLedCopy[locale];
  const buttonCopy = deviceButtonModeCopy[locale];
  const cloudCopy = deviceCloudCopy[locale];

  const config = settings.supported ? settings.config : null;
  const capabilities = settings.supported ? settings.capabilities : null;
  const controlCapabilities = settings.supported ? settings.controlCapabilities : null;
  const ledModeLabel =
    config?.leds.mode === 'power'
      ? ledCopy.power
      : config?.leds.mode === 'switch'
        ? ledCopy.switch
        : ledCopy.off;
  const nightMode = config?.leds.night_mode;
  const buttonMode = config?.controls?.['switch:0']?.in_mode;
  const nightModeValue = nightMode?.enable
    ? [
        t('common.enabled'),
        `${nightMode.brightness}%`,
        nightMode.active_between.length === 2
          ? `${nightMode.active_between[0]}–${nightMode.active_between[1]}`
          : null
      ]
        .filter(Boolean)
        .join(' · ')
    : t('common.disabled');

  return (
    <div className="plug-settings-surface">
      <section className="plug-settings-section installation-detail-device-led">
        {settings.supported && config ? (
          <>
            <div className="plug-settings-section__heading">
              <h2>{ledCopy.title}</h2>
              <p>{ledCopy.description}</p>
            </div>
            <div className="plug-info-grid">
              <DiagnosticRow label={ledCopy.currentMode} value={ledModeLabel} />
              {config.leds.mode === 'power' && capabilities?.powerBrightness && (
                <DiagnosticRow
                  label={ledCopy.powerBrightness}
                  value={`${config.leds.colors?.power?.brightness ?? 0}%`}
                />
              )}
              {capabilities?.nightMode && (
                <DiagnosticRow label={ledCopy.nightMode} value={nightModeValue} />
              )}
            </div>
          </>
        ) : (
          <>
            <h2>{ledCopy.title}</h2>
            <p className="plug-settings-feedback">{ledCopy.unsupported}</p>
          </>
        )}
      </section>

      <section className="plug-settings-section installation-detail-device-button">
        {settings.supported && controlCapabilities?.buttonInputMode && buttonMode ? (
          <>
            <div className="plug-settings-section__heading">
              <h2>{buttonCopy.title}</h2>
              <p>{buttonCopy.description}</p>
            </div>
            <div className="plug-info-grid">
              <DiagnosticRow
                label={buttonCopy.currentMode}
                value={
                  buttonMode === 'momentary' ? buttonCopy.momentary : buttonCopy.detached
                }
              />
            </div>
          </>
        ) : (
          <>
            <h2>{buttonCopy.title}</h2>
            <p className="plug-settings-feedback">{buttonCopy.unsupported}</p>
          </>
        )}
      </section>

      <section className="plug-settings-section installation-detail-device-cloud">
        {cloud.supported ? (
          <>
            <div className="plug-settings-section__heading">
              <h2>{cloudCopy.title}</h2>
              <p>{cloudCopy.description}</p>
            </div>
            <div className="plug-info-grid">
              <DiagnosticRow
                label={cloudCopy.enable}
                value={cloud.config.enable ? t('common.enabled') : t('common.disabled')}
              />
              <DiagnosticRow
                label={cloudCopy.connection}
                value={
                  cloud.status.connected ? cloudCopy.connected : cloudCopy.disconnected
                }
              />
            </div>
          </>
        ) : (
          <>
            <h2>{cloudCopy.title}</h2>
            <p className="plug-settings-feedback">{cloudCopy.unsupported}</p>
          </>
        )}
      </section>
    </div>
  );
};
