import { FeedbackPanel, Modal, type ToastMessage, type ToastTone } from '@lcl/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from '../app/i18n.js';
import { AppToastViewport } from '../components/AppToastViewport.js';
import {
  deleteTimeAutomation,
  useInstalledAutomationStore,
  type TimeInstalledAutomation
} from '../features/automations/index.js';
import {
  PlugAutomationModeControl,
  PlugBleDetailSurface,
  PlugDeviceSettingsSurface,
  PlugDetailTop,
  PlugInfoPanel,
  PlugRelayControls,
  usePlugInformationFlow,
  type PlugDetailTab
} from '../features/plugs/index.js';
import {
  timeAutomationRuntimeQueryKey,
  useTimeAutomationActions,
  useTimeAutomationRuntime,
  type TimeAutomationAction
} from '../flows/time-automation/useTimeAutomationRuntime.js';

const TIME_DETAIL_TABS = [
  'automation',
  'ble',
  'device',
  'info'
] as const satisfies readonly PlugDetailTab[];

type TimeInstallationDetailProps = {
  installation: TimeInstalledAutomation;
  onBack(): void;
  onEdit?: () => void;
  onOpenBleDiscovery?: (deviceId: string) => void;
};

export const TimeInstallationDetail = ({
  installation,
  onBack,
  onEdit,
  onOpenBleDiscovery
}: TimeInstallationDetailProps) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<PlugDetailTab>('automation');
  const runtimeQuery = useTimeAutomationRuntime(installation);
  const runtimeAction = useTimeAutomationActions(installation);
  const informationQuery = usePlugInformationFlow(installation.shelly, {
    enabled: activeTab === 'ble' || activeTab === 'info'
  });
  const removeInstallation = useInstalledAutomationStore(
    (state) => state.removeInstallation
  );
  const [deleteOpen, setDeleteOpen] = useState(false);
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
    mutationFn: () => deleteTimeAutomation(installation),
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
  const automationRunning = runtimeState === 'running';
  const manualControl = runtimeState === 'paused';
  const runtimeControllable = automationRunning || manualControl;
  const actionBusy = runtimeAction.isPending;
  const runRuntimeAction = (action: TimeAutomationAction) => {
    runtimeAction.mutate(action, {
      onError: () => pushToast('warning', t('time.detail.actionFailed'))
    });
  };

  return (
    <main className="demo-shell installation-detail-shell">
      <PlugDetailTop tabs={[activeTab, setActiveTab]} availableTabs={TIME_DETAIL_TABS} />

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
            {(runtimeState === 'offline' || runtimeState === 'attention') && (
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

            <section className="installation-automation-live-state plug-detail-section">
              <dl className="automation-summary installation-detail-summary installation-detail-summary--flush">
                <div>
                  <dt>{t('time.onTime')}</dt>
                  <dd>{installation.config.onTime}</dd>
                </div>
                <div>
                  <dt>{t('time.offTime')}</dt>
                  <dd>{installation.config.offTime}</dd>
                </div>
                <div>
                  <dt>{t('dashboard.output')}</dt>
                  <dd>
                    {runtimeQuery.data ? (runtimeQuery.data.relayOn ? 'ON' : 'OFF') : '—'}
                  </dd>
                </div>
                <div>
                  <dt>{t('time.clock')}</dt>
                  <dd>{runtimeQuery.data?.clock.localTime ?? '—'}</dd>
                </div>
              </dl>

              <PlugAutomationModeControl
                autoActive={automationRunning}
                manualActive={manualControl}
                disabled={actionBusy || !runtimeControllable}
                onAuto={() => {
                  if (!automationRunning) runRuntimeAction('auto');
                }}
                onManual={() => {
                  if (!manualControl) runRuntimeAction('manual');
                }}
              />

              <PlugRelayControls
                relayState={runtimeQuery.data?.relayOn}
                busy={actionBusy}
                disabled={!manualControl}
                onTurnOn={() => runRuntimeAction('on')}
                onTurnOff={() => runRuntimeAction('off')}
              />
            </section>

            {onEdit && (
              <div className="installation-detail-actions">
                <button className="primary-action" type="button" onClick={onEdit}>
                  {t('detail.edit')}
                </button>
              </div>
            )}

            <div className="installation-detail-delete-action">
              <button
                className="secondary-action secondary-action--danger"
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => setDeleteOpen(true)}
              >
                {t('time.detail.delete')}
              </button>
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
          <PlugInfoPanel
            connection={{
              transport: 'wifi',
              baseUrl: installation.shelly.baseUrl
            }}
            information={informationQuery.data}
            loading={informationQuery.isPending}
            error={informationQuery.isError}
          />
        )}
      </section>

      <Modal
        actions={
          <button
            className="secondary-action secondary-action--danger"
            type="button"
            disabled={deleteMutation.isPending}
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

      <AppToastViewport
        dismissLabel={t('toast.dismiss')}
        label={t('toast.regionLabel')}
        toasts={toasts}
        onDismiss={dismissToast}
      />
    </main>
  );
};
