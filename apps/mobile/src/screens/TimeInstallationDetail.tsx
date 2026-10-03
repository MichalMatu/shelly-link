import { FeedbackPanel, Modal, type ToastMessage, type ToastTone } from '@lcl/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from '../app/i18n.js';
import { AppToastViewport } from '../components/AppToastViewport.js';
import {
  OperationalStatus,
  deleteTimeAutomation,
  Pulse,
  timePulseAutomationRuntime,
  useInstalledAutomationStore,
  type TimeInstalledAutomation
} from '../features/automations/index.js';
import {
  PlugBleDetailSurface,
  PlugRemovalBlockedModal,
  PlugDeviceSettingsSurface,
  PlugDetailTop,
  PlugInfoPanel,
  isSameShellyDevice,
  usePlugInformationFlow,
  useSavedPlugStore,
  type PlugDetailTab
} from '../features/plugs/index.js';
import {
  timeAutomationRuntimeQueryKey,
  useTimeAutomationRuntime
} from '../flows/time-automation/useTimeAutomationRuntime.js';
import { TimeScheduleSetupPage } from './hardware-setup/pages/TimeScheduleSetupPage.js';

const TIME_DETAIL_TABS = [
  'automation',
  'ble',
  'device',
  'info'
] as const satisfies readonly PlugDetailTab[];

type TimeInstallationDetailProps = {
  installation: TimeInstalledAutomation;
  onBack(): void;
  onOpenBleDiscovery?: (deviceId: string) => void;
};

export const TimeInstallationDetail = ({
  installation,
  onBack,
  onOpenBleDiscovery
}: TimeInstallationDetailProps) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<PlugDetailTab>('automation');
  const runtimeQuery = useTimeAutomationRuntime(installation);
  const pulseInstallation = Pulse.Time.isInstalled(installation) ? installation : null;
  const pulseQuery = Pulse.Operational.useStatus(pulseInstallation);
  const informationQuery = usePlugInformationFlow(installation.shelly, {
    enabled: activeTab === 'ble' || activeTab === 'info'
  });
  const removeInstallation = useInstalledAutomationStore(
    (state) => state.removeInstallation
  );
  const savedPlugs = useSavedPlugStore((state) => state.plugs);
  const savedDevice = savedPlugs.find((device) =>
    isSameShellyDevice(device.physicalId, installation.shelly.deviceId)
  );
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [timeEditPending, setTimeEditPending] = useState(false);
  const [forgetOpen, setForgetOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastIdRef = useRef(0);

  const pushToast = useCallback((tone: ToastTone, title: string) => {
    toastIdRef.current += 1;
    setToasts((current) => [
      ...current.slice(-2),
      { id: `time-toast-${toastIdRef.current}`, tone, title }
    ]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const deleteMutation = useMutation({
    mutationFn: () =>
      timePulseAutomationRuntime.isInstalled(installation)
        ? timePulseAutomationRuntime.delete(installation)
        : deleteTimeAutomation(installation),
    onSuccess: () => {
      queryClient.removeQueries({
        queryKey: timeAutomationRuntimeQueryKey(installation),
        exact: true
      });
      removeInstallation(installation.id);
      setDeleteOpen(false);
      onBack();
    },
    onError: () => pushToast('warning', t('time.detail.deleteFailed'))
  });

  const runtimeState = runtimeQuery.isPending
    ? 'loading'
    : runtimeQuery.isError
      ? 'offline'
      : (runtimeQuery.data?.scheduleState ?? 'attention');
  const pulseNeedsAttention = pulseInstallation !== null && pulseQuery.isError;
  return (
    <main className="demo-shell installation-detail-shell">
      <PlugDetailTop
        tabs={[activeTab, setActiveTab]}
        availableTabs={TIME_DETAIL_TABS}
        automationIcon="clock"
      />

      <section className="plug-detail-surface" aria-label={t('detail.currentState')}>
        {activeTab === 'automation' && (
          <>
            {runtimeState === 'loading' && (
              <div
                className="plug-detail-loading plug-detail-loading--section"
                role="status"
              >
                <span className="plug-detail-loading__spinner" aria-hidden="true" />
                <span>{t('common.refreshing')}</span>
              </div>
            )}
            {(runtimeState === 'offline' ||
              runtimeState === 'attention' ||
              pulseNeedsAttention) && (
              <FeedbackPanel
                tone="warning"
                title={
                  runtimeState === 'offline'
                    ? t('dashboard.health.offline')
                    : t('dashboard.health.attention')
                }
              >
                {t('time.detail.needsAttention')}
              </FeedbackPanel>
            )}

            <div className="installation-detail-hierarchy">
              <section className="installation-detail-hierarchy__section">
                <h3 className="installation-detail-hierarchy__title">
                  {t('detail.currentState')}
                </h3>
                {pulseInstallation ? (
                  <Pulse.Operational.StatusSummary status={pulseQuery.data} />
                ) : (
                  <OperationalStatus.TimeSummary
                    config={installation.config}
                    localTime={runtimeQuery.data?.clock.localTime}
                    relayOn={runtimeQuery.data?.relayOn}
                    state={runtimeState}
                  />
                )}
                <dl className="automation-summary installation-detail-summary installation-detail-summary--flush">
                  <div>
                    <dt>{t('time.clock')}</dt>
                    <dd>{runtimeQuery.data?.clock.localTime ?? '—'}</dd>
                  </div>
                </dl>
              </section>

              <section className="installation-detail-hierarchy__section">
                <h3 className="installation-detail-hierarchy__title">
                  {t('detail.configuration')}
                </h3>
                <TimeScheduleSetupPage
                  flow={{
                    selectedShelly: {
                      id: installation.shelly.deviceId,
                      name: installation.shelly.name,
                      baseUrl: installation.shelly.baseUrl,
                      scriptIdInput: '1',
                      model: installation.shelly.model,
                      gen: installation.shelly.gen
                    }
                  }}
                  editInstallationId={installation.id}
                  inline
                  onInstalled={() => {
                    void runtimeQuery.refetch();
                    if (pulseInstallation) void pulseQuery.refetch();
                  }}
                  onPendingChange={setTimeEditPending}
                />
              </section>

              <section className="installation-detail-danger-zone">
                <h3 className="installation-detail-hierarchy__title">
                  {t('time.detail.delete')}
                </h3>
                <button
                  className="secondary-action secondary-action--danger"
                  type="button"
                  disabled={deleteMutation.isPending || timeEditPending}
                  onClick={() => setDeleteOpen(true)}
                >
                  {t('time.detail.delete')}
                </button>
              </section>
            </div>
          </>
        )}

        {activeTab === 'ble' && (
          <PlugBleDetailSurface
            information={informationQuery.data}
            loading={informationQuery.isPending}
            error={informationQuery.isError}
            {...(onOpenBleDiscovery
              ? { onScan: () => onOpenBleDiscovery(installation.shelly.deviceId) }
              : {})}
          />
        )}

        {activeTab === 'device' && (
          <PlugDeviceSettingsSurface target={installation.shelly} />
        )}

        {activeTab === 'info' && (
          <section>
            <PlugInfoPanel
              connection={{
                transport: 'wifi',
                baseUrl: installation.shelly.baseUrl
              }}
              information={informationQuery.data}
              loading={informationQuery.isPending}
              error={informationQuery.isError}
            />
            {savedDevice && (
              <div className="installation-detail-delete-action">
                <button
                  className="secondary-action secondary-action--danger"
                  type="button"
                  onClick={() => setForgetOpen(true)}
                >
                  {t('hardware.shelly.deleteTitle')}
                </button>
              </div>
            )}
          </section>
        )}
      </section>

      <Modal
        actions={
          <button
            className="secondary-action secondary-action--danger"
            type="button"
            disabled={deleteMutation.isPending || timeEditPending}
            onClick={() => deleteMutation.mutate()}
          >
            {deleteMutation.isPending ? t('time.deleting') : t('common.confirmDelete')}
          </button>
        }
        busy={deleteMutation.isPending}
        closeLabel={t('common.close')}
        open={deleteOpen}
        title={t('time.detail.deleteConfirmTitle')}
        onClose={() => {
          if (!deleteMutation.isPending) setDeleteOpen(false);
        }}
      >
        <FeedbackPanel tone="warning" title={t('time.detail.delete')}>
          {t('time.detail.deleteConfirmDetail')}
        </FeedbackPanel>
      </Modal>

      <PlugRemovalBlockedModal
        deviceName={forgetOpen && savedDevice ? savedDevice.name : null}
        automationName={forgetOpen ? installation.shelly.name : null}
        onClose={() => setForgetOpen(false)}
      />

      <AppToastViewport
        dismissLabel={t('toast.dismiss')}
        label={t('toast.regionLabel')}
        toasts={toasts}
        onDismiss={dismissToast}
      />
    </main>
  );
};
