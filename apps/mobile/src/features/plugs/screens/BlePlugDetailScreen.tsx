import { IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from '../../../app/i18n.js';
import { BlePlugDeviceReadOnlyPanel } from '../components/BlePlugDeviceReadOnlyPanel.js';
import { BlePlugTimeSyncCard } from '../components/BlePlugTimeSyncCard.js';
import { BlePlugWifiProvisioningCard } from '../components/BlePlugWifiProvisioningCard.js';
import { PlugDeleteConfirmModal } from '../components/PlugDeleteConfirmModal.js';
import { PlugRemovalBlockedModal } from '../components/PlugRemovalBlockedModal.js';
import { PlugDetailNotFound } from '../components/PlugDetailNotFound.js';
import { PlugDetailTop } from '../components/PlugDetailTop.js';
import type { PlugDetailTab } from '../components/PlugDetailTabs.js';
import { PlugFirmwareUpdateCard } from '../components/PlugFirmwareUpdateCard.js';
import { PlugInfoPanel } from '../components/PlugInfoPanel.js';
import { hasBleLocator } from '../data/savedPlug.js';
import { useBlePlugReadOnlyDetailFlow } from '../flows/useBlePlugReadOnlyDetailFlow.js';
import { useSavedPlugStore } from '../state/savedPlugStore.js';

export type BlePlugDetailScreenProps = {
  physicalId: string;
  onBack(): void;
  onRemove(physicalId: string): void;
  removalBlock?: { installationId: string; automationName: string };
  onOpenBlockingAutomation?: (installationId: string) => void;
};

const BLE_DETAIL_TABS = ['device', 'info'] as const satisfies readonly PlugDetailTab[];

export const BlePlugDetailScreen = ({
  physicalId,
  onBack,
  onRemove,
  removalBlock,
  onOpenBlockingAutomation
}: BlePlugDetailScreenProps) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<PlugDetailTab>('info');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBlockedOpen, setDeleteBlockedOpen] = useState(false);
  const plug = useSavedPlugStore((state) =>
    state.plugs
      .filter(hasBleLocator)
      .find((candidate) => candidate.physicalId === physicalId)
  );
  const detailQuery = useBlePlugReadOnlyDetailFlow(plug);

  if (!plug) return <PlugDetailNotFound />;

  const currentFirmware =
    detailQuery.data?.information.deviceInfo.firmwareId ?? plug.firmwareId ?? undefined;
  const firmwareTarget = plug.wifiBaseUrl
    ? { physicalId: plug.physicalId, baseUrl: plug.wifiBaseUrl }
    : undefined;
  return (
    <main className="demo-shell installation-detail-shell">
      <PlugDetailTop tabs={[activeTab, setActiveTab]} availableTabs={BLE_DETAIL_TABS} />

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
            <div className="plug-settings-actions">
              <button
                className="secondary-action secondary-action--danger"
                type="button"
                title={t('hardware.shelly.deleteTitle')}
                onClick={() =>
                  removalBlock ? setDeleteBlockedOpen(true) : setDeleteOpen(true)
                }
              >
                <IconTrash className="icon-action__svg" aria-hidden="true" />
                <span>{t('hardware.shelly.deleteTitle')}</span>
              </button>
            </div>
          </>
        )}
      </section>

      <PlugRemovalBlockedModal
        deviceName={deleteBlockedOpen ? plug.name : null}
        automationName={deleteBlockedOpen ? (removalBlock?.automationName ?? null) : null}
        onClose={() => setDeleteBlockedOpen(false)}
        {...(removalBlock && onOpenBlockingAutomation
          ? {
              onOpenAutomation: () => {
                const installationId = removalBlock.installationId;
                setDeleteBlockedOpen(false);
                onOpenBlockingAutomation(installationId);
              }
            }
          : {})}
      />

      <PlugDeleteConfirmModal
        deviceName={deleteOpen ? plug.name : null}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => {
          onRemove(plug.physicalId);
          setDeleteOpen(false);
          onBack();
        }}
      />
    </main>
  );
};
