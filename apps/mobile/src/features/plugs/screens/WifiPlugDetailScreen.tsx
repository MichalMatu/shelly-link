import { DiagnosticRow } from '@lcl/ui';
import { IconBluetooth, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from '../../../app/i18n.js';
import { AppPageBack } from '../../../components/AppPageBack.js';
import { PlugButtonModeSettingsCard } from '../components/PlugButtonModeSettingsCard.js';
import { PlugCloudSettingsCard } from '../components/PlugCloudSettingsCard.js';
import { PlugDeleteConfirmModal } from '../components/PlugDeleteConfirmModal.js';
import { PlugDetailTabs, type PlugDetailTab } from '../components/PlugDetailTabs.js';
import { PlugInfoPanel } from '../components/PlugInfoPanel.js';
import { PlugLedSettingsCard } from '../components/PlugLedSettingsCard.js';
import { usePlugInformationFlow } from '../flows/usePlugInformationFlow.js';

export type WifiPlugDetailDevice = {
  deviceId: string;
  name: string;
  baseUrl: string;
  model?: string;
};

export type WifiPlugDetailScreenProps = {
  device: WifiPlugDetailDevice | null;
  onBack(): void;
  onOpenBleDiscovery(deviceId: string): void;
  onRemove(deviceId: string): void;
};

const disabledWifiDetailTabs: readonly PlugDetailTab[] = ['automation', 'script'];

export const WifiPlugDetailScreen = ({
  device,
  onBack,
  onOpenBleDiscovery,
  onRemove
}: WifiPlugDetailScreenProps) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<PlugDetailTab>('device');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const target = device
    ? { deviceId: device.deviceId, baseUrl: device.baseUrl }
    : { deviceId: '', baseUrl: '' };
  const informationQuery = usePlugInformationFlow(target, {
    enabled: device !== null && (activeTab === 'ble' || activeTab === 'info')
  });

  if (!device) {
    return (
      <main className="demo-shell installation-detail-shell">
        <AppPageBack label={t('dashboard.climateTab')} onBack={onBack} />
        <section className="automation-card installation-detail-identity">
          <h1>{t('detail.notFoundTitle')}</h1>
          <p className="installation-detail-note">{t('detail.notFoundDescription')}</p>
        </section>
      </main>
    );
  }

  const bluetoothState = informationQuery.data?.status.bluetooth;

  return (
    <main className="demo-shell installation-detail-shell">
      <AppPageBack label={t('dashboard.climateTab')} onBack={onBack} />
      <section className="automation-card installation-detail-identity">
        <h1>{device.name}</h1>
        <p className="installation-detail-note">
          Wi-Fi{device.model ? ` · ${device.model}` : ''}
        </p>
      </section>

      <PlugDetailTabs
        activeTab={activeTab}
        disabledTabs={disabledWifiDetailTabs}
        onChange={setActiveTab}
      />

      <section className="plug-detail-surface" aria-label={t('detail.currentState')}>
        {activeTab === 'ble' && (
          <section className="plug-detail-framed-section">
            <h3 className="plug-detail-framed-section__title">{t('common.bluetooth')}</h3>
            {informationQuery.isPending && (
              <div className="plug-detail-loading" role="status">
                <span className="plug-detail-loading__spinner" aria-hidden="true" />
                <span>{t('common.refreshing')}</span>
              </div>
            )}
            {informationQuery.isError && (
              <p className="plug-settings-feedback plug-settings-feedback--warning">
                {t('dashboard.readFailed')}
              </p>
            )}
            {informationQuery.data && (
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
            <div className="plug-settings-actions">
              <button
                className="secondary-action"
                type="button"
                title={t('hardware.shelly.scanBleViaShellyTitle')}
                onClick={() => onOpenBleDiscovery(device.deviceId)}
              >
                <IconBluetooth className="icon-action__svg" aria-hidden="true" />
                <span>{t('hardware.shelly.scanBleViaShellyTitle')}</span>
              </button>
            </div>
          </section>
        )}

        {activeTab === 'device' && (
          <div className="plug-settings-surface">
            <PlugLedSettingsCard target={target} />
            <PlugButtonModeSettingsCard target={target} />
            <PlugCloudSettingsCard target={target} />
          </div>
        )}

        {activeTab === 'info' && (
          <section>
            <PlugInfoPanel
              connection={{ transport: 'wifi', baseUrl: device.baseUrl }}
              information={informationQuery.data}
              loading={informationQuery.isPending}
              error={informationQuery.isError}
              showResourceRows={false}
            />
            <div className="plug-settings-actions">
              <button
                className="secondary-action secondary-action--danger"
                type="button"
                title={t('hardware.shelly.deleteTitle')}
                onClick={() => setDeleteOpen(true)}
              >
                <IconTrash className="icon-action__svg" aria-hidden="true" />
                <span>{t('hardware.shelly.deleteTitle')}</span>
              </button>
            </div>
          </section>
        )}
      </section>

      <PlugDeleteConfirmModal
        deviceName={deleteOpen ? device.name : null}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => {
          onRemove(device.deviceId);
          setDeleteOpen(false);
          onBack();
        }}
      />
    </main>
  );
};
