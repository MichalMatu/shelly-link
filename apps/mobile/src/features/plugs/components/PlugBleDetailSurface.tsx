import { IonButton } from '@ionic/react';
import { DiagnosticRow } from '@lcl/ui';
import { IconBluetooth } from '@tabler/icons-react';
import { useTranslation } from '../../../app/i18n.js';
import type { PlugInformation } from '../data/plugInformation.js';
import './PlugSettingsSurface.css';

export type PlugBleDetailSurfaceProps = {
  information: PlugInformation | undefined;
  loading: boolean;
  error: boolean;
  onScan?: () => void;
};

export const PlugBleDetailSurface = ({
  information,
  loading,
  error,
  onScan
}: PlugBleDetailSurfaceProps) => {
  const { t } = useTranslation();
  const bluetoothState = information?.status.bluetooth;

  return (
    <section className="plug-detail-framed-section">
      <h3 className="plug-detail-framed-section__title">{t('common.bluetooth')}</h3>
      {loading && (
        <div className="plug-detail-loading" role="status">
          <span className="plug-detail-loading__spinner" aria-hidden="true" />
          <span>{t('common.refreshing')}</span>
        </div>
      )}
      {error && (
        <p className="plug-settings-feedback plug-settings-feedback--warning">
          {t('dashboard.readFailed')}
        </p>
      )}
      {information && (
        <div className="plug-info-grid">
          <DiagnosticRow
            label={t('common.bluetooth')}
            value={
              bluetoothState === 'enabled'
                ? t('common.enabled')
                : bluetoothState === 'disabled'
                  ? t('common.disabled')
                  : t('common.missing')
            }
          />
        </div>
      )}
      {onScan && (
        <div className="plug-settings-actions">
          <IonButton
            className="plug-settings-ionic-action plug-settings-ionic-action--secondary"
            fill="outline"
            type="button"
            title={t('hardware.shelly.scanBleViaShellyTitle')}
            onClick={onScan}
          >
            <IconBluetooth className="icon-action__svg" aria-hidden="true" />
            <span>{t('hardware.shelly.scanBleViaShellyTitle')}</span>
          </IonButton>
        </div>
      )}
    </section>
  );
};
