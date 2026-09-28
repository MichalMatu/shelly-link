import { IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from '../../../app/i18n.js';
import { PlugBleDetailSurface } from '../components/PlugBleDetailSurface.js';
import { PlugDeleteConfirmModal } from '../components/PlugDeleteConfirmModal.js';
import { PlugDeviceSettingsSurface } from '../components/PlugDeviceSettingsSurface.js';
import { PlugDetailNotFound } from '../components/PlugDetailNotFound.js';
import { PlugDetailTop } from '../components/PlugDetailTop.js';
import type { PlugDetailTab } from '../components/PlugDetailTabs.js';
import { PlugInfoPanel } from '../components/PlugInfoPanel.js';
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
  onAddAutomation(): void;
  onOpenBleDiscovery(deviceId: string): void;
  onRemove(deviceId: string): void;
  buttonModeLocked?: boolean;
};

export const WifiPlugDetailScreen = ({
  device,
  onBack,
  onAddAutomation,
  onOpenBleDiscovery,
  onRemove,
  buttonModeLocked = false
}: WifiPlugDetailScreenProps) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<PlugDetailTab>(() =>
    buttonModeLocked ? 'device' : 'automation'
  );
  const [deleteOpen, setDeleteOpen] = useState(false);
  const target = device
    ? { deviceId: device.deviceId, baseUrl: device.baseUrl }
    : { deviceId: '', baseUrl: '' };
  const informationQuery = usePlugInformationFlow(target, {
    enabled: device !== null && (activeTab === 'ble' || activeTab === 'info')
  });

  if (!device) return <PlugDetailNotFound />;

  const disabledTabs: readonly PlugDetailTab[] = buttonModeLocked
    ? ['automation', 'script']
    : ['script'];

  return (
    <main className="demo-shell installation-detail-shell">
      <PlugDetailTop tabs={[activeTab, setActiveTab]} disabledTabs={disabledTabs} />

      <section className="plug-detail-surface" aria-label={t('detail.currentState')}>
        {!buttonModeLocked && activeTab === 'automation' && (
          <section className="plug-detail-framed-section">
            <h3 className="plug-detail-framed-section__title">
              {t('dashboard.emptyCategory')}
            </h3>
            <p className="installation-detail-note">
              {t('detail.noAutomationDescription')}
            </p>
            <div className="plug-settings-actions">
              <button className="primary-action" type="button" onClick={onAddAutomation}>
                {t('dashboard.addAutomation')}
              </button>
            </div>
          </section>
        )}

        {activeTab === 'ble' && (
          <PlugBleDetailSurface
            information={informationQuery.data}
            loading={informationQuery.isPending}
            error={informationQuery.isError}
            onScan={() => onOpenBleDiscovery(device.deviceId)}
          />
        )}

        {activeTab === 'device' && (
          <PlugDeviceSettingsSurface
            target={target}
            buttonModeLocked={buttonModeLocked}
          />
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
