import { useState } from 'react';
import { useTranslation } from '../../../app/i18n.js';
import { BlePlugDeviceReadOnlyPanel } from '../components/BlePlugDeviceReadOnlyPanel.js';
import { BlePlugTimeSyncCard } from '../components/BlePlugTimeSyncCard.js';
import { BlePlugWifiProvisioningCard } from '../components/BlePlugWifiProvisioningCard.js';
import { PlugDetailNotFound } from '../components/PlugDetailNotFound.js';
import { PlugDetailTop } from '../components/PlugDetailTop.js';
import type { PlugDetailTab } from '../components/PlugDetailTabs.js';
import { PlugFirmwareUpdateCard } from '../components/PlugFirmwareUpdateCard.js';
import { PlugInfoPanel } from '../components/PlugInfoPanel.js';
import { useBlePlugReadOnlyDetailFlow } from '../flows/useBlePlugReadOnlyDetailFlow.js';
import { useSavedBlePlugStore } from '../state/savedBlePlugStore.js';

export type BlePlugDetailScreenProps = {
  physicalId: string;
  onBack(): void;
};

const disabledBleDetailTabs: readonly PlugDetailTab[] = ['automation', 'ble', 'script'];

export const BlePlugDetailScreen = ({ physicalId, onBack }: BlePlugDetailScreenProps) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<PlugDetailTab>('info');
  const plug = useSavedBlePlugStore((state) =>
    state.plugs.find((candidate) => candidate.physicalId === physicalId)
  );
  const detailQuery = useBlePlugReadOnlyDetailFlow(plug);

  if (!plug) return <PlugDetailNotFound onBack={onBack} />;

  const currentFirmware =
    detailQuery.data?.information.deviceInfo.firmwareId ?? plug.firmwareId ?? undefined;
  const firmwareTarget = plug.wifiBaseUrl
    ? { physicalId: plug.physicalId, baseUrl: plug.wifiBaseUrl }
    : undefined;
  const preferredTransport = plug.wifiBaseUrl ? 'wifi' : 'bluetooth';

  return (
    <main className="demo-shell installation-detail-shell">
      <PlugDetailTop
        plug={plug}
        transport={preferredTransport}
        tabs={[activeTab, setActiveTab]}
        disabledTabs={disabledBleDetailTabs}
      />

      <section className="plug-detail-surface" aria-label={t('detail.currentState')}>
        {activeTab === 'device' && (
          <>
            {detailQuery.isPending && (
              <section className="plug-detail-framed-section">
                <h3 className="plug-detail-framed-section__title">
                  {t('hardware.shelly.settings')}
                </h3>
                <div className="plug-detail-loading" role="status">
                  <span className="plug-detail-loading__spinner" aria-hidden="true" />
                  <span>{t('common.refreshing')}</span>
                </div>
              </section>
            )}
            {detailQuery.isError && (
              <section className="plug-detail-framed-section">
                <h3 className="plug-detail-framed-section__title">
                  {t('hardware.shelly.settings')}
                </h3>
                <p className="plug-settings-feedback plug-settings-feedback--warning">
                  {t('dashboard.readFailed')}
                </p>
              </section>
            )}
            {detailQuery.data && (
              <>
                <BlePlugDeviceReadOnlyPanel
                  settings={detailQuery.data.deviceSettings}
                  cloud={detailQuery.data.cloud}
                />
                {!plug.wifiBaseUrl && <BlePlugWifiProvisioningCard plug={plug} />}
                <BlePlugTimeSyncCard
                  plug={plug}
                  clock={detailQuery.data.information.status.clock}
                />
              </>
            )}
          </>
        )}

        {activeTab === 'info' && (
          <>
            <PlugInfoPanel
              connection={
                plug.wifiBaseUrl
                  ? { transport: 'wifi', baseUrl: plug.wifiBaseUrl }
                  : {
                      transport: 'bluetooth',
                      bleDeviceId: plug.bleDeviceId,
                      advertisementName: plug.advertisementName
                    }
              }
              information={detailQuery.data?.information}
              loading={detailQuery.isPending}
              error={detailQuery.isError}
              showResourceRows={false}
            />
            <PlugFirmwareUpdateCard
              currentFirmware={currentFirmware}
              target={firmwareTarget}
            />
          </>
        )}
      </section>
    </main>
  );
};
