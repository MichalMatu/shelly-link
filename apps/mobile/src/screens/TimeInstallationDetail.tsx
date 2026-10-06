import { FeedbackPanel, Modal } from '@lcl/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { installationScriptPreviewCopy } from '../app/locales/installationScriptPreview.js';
import { useTranslation } from '../app/i18n.js';
import { AppToastViewport, useToastQueue } from '../components/AppToastViewport.js';
import {
  AutomationDetail,
  ClimateScriptDetailSection,
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
  automationDetailTabs,
  PlugDeviceSettingsSurface,
  PlugDetailTop,
  PlugInfoPanel,
  isSameShellyDevice,
  usePlugInformationFlow,
  useSavedPlugStore,
  type PlugDetailTab
} from '../features/plugs/index.js';
import { copyInstalledAutomationScriptSource } from '../flows/installations/scriptPreview.js';
import {
  timeAutomationRuntimeQueryKey,
  useTimeAutomationRuntime
} from '../flows/time-automation/useTimeAutomationRuntime.js';
import { TimeScheduleSetupPage } from './hardware-setup/pages/TimeScheduleSetupPage.js';

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
  const { locale, t } = useTranslation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<PlugDetailTab>('automation');
  const runtimeQuery = useTimeAutomationRuntime(installation);
  const pulseInstallation = Pulse.Time.isInstalled(installation) ? installation : null;
  const pulseQuery = Pulse.Operational.useStatus(pulseInstallation);
  const scriptQuery = Pulse.Time.useScriptSource(
    pulseInstallation,
    activeTab === 'script'
  );
  const availableTabs = automationDetailTabs({
    hasScript: pulseInstallation !== null
  });
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
  const { dismissToast, pushToast, toasts } = useToastQueue('time-toast');
  const scriptLabels = installationScriptPreviewCopy[locale];

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
  const copyScript = () =>
    copyInstalledAutomationScriptSource(
      scriptQuery.data,
      () => pushToast('ok', scriptLabels.copyDone),
      () => pushToast('warning', scriptLabels.copyFailed)
    );

  return (
    <main className="demo-shell installation-detail-shell">
      <PlugDetailTop
        tabs={[activeTab, setActiveTab]}
        availableTabs={availableTabs}
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

            <AutomationDetail.Hierarchy>
              <AutomationDetail.Section title={t('detail.currentState')}>
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
              </AutomationDetail.Section>

              <AutomationDetail.Section title={t('detail.configuration')}>
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
              </AutomationDetail.Section>

              <AutomationDetail.DangerZone title={t('time.detail.delete')}>
                <button
                  className="secondary-action secondary-action--danger"
                  type="button"
                  disabled={deleteMutation.isPending || timeEditPending}
                  onClick={() => setDeleteOpen(true)}
                >
                  {t('time.detail.delete')}
                </button>
              </AutomationDetail.DangerZone>
            </AutomationDetail.Hierarchy>
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

        {activeTab === 'script' && pulseInstallation && (
          <ClimateScriptDetailSection
            attentionTitle={t('dashboard.health.attention')}
            {...(pulseNeedsAttention
              ? { attentionMessage: t('time.detail.needsAttention') }
              : {})}
            copyAriaLabel={scriptLabels.copy}
            copyLabel={scriptLabels.copy}
            error={scriptQuery.isError}
            errorTitle={scriptLabels.failed}
            loading={scriptQuery.isPending}
            loadingLabel={scriptLabels.loading}
            previewLabel={scriptLabels.label}
            retryLabel={scriptLabels.retry}
            {...(scriptQuery.data !== undefined ? { source: scriptQuery.data } : {})}
            onCopy={copyScript}
            onRetry={() => void scriptQuery.refetch()}
          />
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
