import { useState } from 'react';
import { useTranslation } from '../../../app/i18n.js';
import { BlePlugDeviceReadOnlyPanel } from '../components/BlePlugDeviceReadOnlyPanel.js';
import { PlugDetailNotFound } from '../components/PlugDetailNotFound.js';
import { PlugDetailTop } from '../components/PlugDetailTop.js';
import type { PlugDetailTab } from '../components/PlugDetailTabs.js';
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

  return (
    <main className="demo-shell installation-detail-shell">
      <PlugDetailTop
        plug={plug}
        transport="bluetooth"
        tabs={[activeTab, setActiveTab]}
        onBack={onBack}
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
              <BlePlugDeviceReadOnlyPanel
                settings={detailQuery.data.deviceSettings}
                cloud={detailQuery.data.cloud}
              />
            )}
          </>
        )}

        {activeTab === 'info' && (
          <PlugInfoPanel
            connection={{
              transport: 'bluetooth',
              bleDeviceId: plug.bleDeviceId,
              advertisementName: plug.advertisementName
            }}
            information={detailQuery.data?.information}
            loading={detailQuery.isPending}
            error={detailQuery.isError}
            showResourceRows={false}
          />
        )}
      </section>
    </main>
  );
};
