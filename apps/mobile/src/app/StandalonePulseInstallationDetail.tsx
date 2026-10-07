import { FeedbackPanel, Modal } from '@lcl/ui';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { AppToastViewport, useToastQueue } from '../components/AppToastViewport.js';
import {
  AutomationDetail,
  AutomationHistorySection,
  Pulse,
  useAutomationHistory,
  useInstalledAutomationStore,
  type InstalledAutomation
} from '../features/automations/index.js';
import {
  PlugBleDetailSurface,
  PlugDeviceSettingsSurface,
  PlugDetailTop,
  PlugInfoPanel,
  PlugRemovalBlockedModal,
  automationDetailTabs,
  isSameShellyDevice,
  usePlugInformationFlow,
  useSavedPlugStore,
  type PlugDetailTab
} from '../features/plugs/index.js';
import { formatAutomationResourceDiagnosticRows } from '../flows/installations/diagnosticPresentation.js';
import { useAutomationResourceDiagnostics } from '../flows/installations/useInstalledAutomationRuntime.js';
import { installationScriptPreviewCopy } from './locales/installationScriptPreview.js';
import { pulseManagementCopy } from './locales/pulseManagement.js';
import { useTranslation } from './i18n.js';

type StandalonePulseInstalledAutomation = Extract<InstalledAutomation, { kind: 'pulse' }>;

type StandalonePulseInstallationDetailProps = {
  installation: StandalonePulseInstalledAutomation;
  onBack?: () => void;
  onOpenBleDiscovery?: (deviceId: string) => void;
};

export const StandalonePulseInstallationDetail = ({
  installation,
  onBack,
  onOpenBleDiscovery
}: StandalonePulseInstallationDetailProps) => {
  const { locale, t } = useTranslation();
  const detailCapabilities = AutomationDetail.capabilities(installation);
  const [activeTab, setActiveTab] = useState<PlugDetailTab>('automation');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editPending, setEditPending] = useState(false);
  const [forgetOpen, setForgetOpen] = useState(false);
  const { dismissToast, pushToast, toasts } = useToastQueue('pulse-detail-toast');
  const managementLabels = pulseManagementCopy[locale];
  const scriptLabels = installationScriptPreviewCopy[locale];
  const historyQuery = useAutomationHistory(installation, {
    enabled: activeTab === 'history'
  });
  const runtimeQuery = Pulse.Standalone.useRuntime(installation);
  const runtimeMatches = runtimeQuery.data?.automationScriptId === installation.script.id;
  const automationRunning =
    runtimeMatches && runtimeQuery.data?.automationMode === 'auto';
  const pulseQuery = Pulse.Operational.useStatus(automationRunning ? installation : null);
  const scriptQuery = Pulse.Standalone.useScriptSource(
    installation,
    activeTab === 'script'
  );
  const informationQuery = usePlugInformationFlow(installation.shelly, {
    enabled: activeTab === 'ble' || activeTab === 'info'
  });
  const resourcesQuery = useAutomationResourceDiagnostics(installation, {
    enabled: activeTab === 'info',
    refetchInterval: 3_000
  });
  const removeInstallation = useInstalledAutomationStore(
    (state) => state.removeInstallation
  );
  const savedPlugs = useSavedPlugStore((state) => state.plugs);
  const savedDevice = savedPlugs.find((device) =>
    isSameShellyDevice(device.physicalId, installation.shelly.deviceId)
  );

  const deleteMutation = useMutation({
    mutationFn: () => Pulse.Standalone.delete(installation),
    onSuccess: () => {
      removeInstallation(installation.id);
      setDeleteOpen(false);
      onBack?.();
    }
  });

  const runtimeNeedsAttention =
    pulseQuery.isError ||
    runtimeQuery.isError ||
    (runtimeQuery.data !== undefined && !runtimeMatches);

  const copyScript = () => {
    if (!scriptQuery.data || typeof navigator === 'undefined' || !navigator.clipboard) {
      pushToast('warning', scriptLabels.copyFailed);
      return;
    }
    void navigator.clipboard
      .writeText(scriptQuery.data)
      .then(() => pushToast('ok', scriptLabels.copyDone))
      .catch(() => pushToast('warning', scriptLabels.copyFailed));
  };

  return (
    <main className="demo-shell installation-detail-shell">
      <PlugDetailTop
        tabs={[activeTab, setActiveTab]}
        availableTabs={automationDetailTabs(detailCapabilities)}
        automationIcon={detailCapabilities.automationIcon}
      />

      <section className="plug-detail-surface" aria-label={t('detail.currentState')}>
        {activeTab === 'automation' && (
          <>
            {runtimeNeedsAttention && (
              <FeedbackPanel tone="warning" title={t('dashboard.health.attention')}>
                {managementLabels.runtimeAttention}
              </FeedbackPanel>
            )}
            {deleteMutation.isError && (
              <FeedbackPanel tone="danger" title={t('common.operationFailed')}>
                {managementLabels.deleteFailed}
              </FeedbackPanel>
            )}

            <AutomationDetail.Hierarchy>
              <Pulse.Standalone.ConfigurationSection
                installation={installation}
                onPendingChange={setEditPending}
                onSaved={() => {
                  pushToast('ok', managementLabels.saveDone);
                  void runtimeQuery.refetch();
                  if (automationRunning) void pulseQuery.refetch();
                }}
                onSaveError={() => pushToast('warning', managementLabels.saveFailed)}
              />
            </AutomationDetail.Hierarchy>

            <div className="installation-detail-delete-action">
              <button
                className="secondary-action secondary-action--danger"
                type="button"
                disabled={deleteMutation.isPending || editPending}
                onClick={() => setDeleteOpen(true)}
              >
                {managementLabels.deleteAction}
              </button>
            </div>
          </>
        )}

        {activeTab === 'history' && (
          <AutomationHistorySection
            profile="pulse"
            records={historyQuery.data?.records ?? []}
            invalidRecordCount={historyQuery.data?.invalidKeys.length ?? 0}
            loading={historyQuery.isLoading}
            error={historyQuery.isError}
            onRetry={() => void historyQuery.refetch()}
          />
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

        {activeTab === 'script' && (
          <AutomationDetail.ScriptSource
            attentionTitle={t('dashboard.health.attention')}
            {...(!runtimeMatches && runtimeQuery.data !== undefined
              ? { attentionMessage: managementLabels.runtimeAttention }
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
              deviceRamFreeBytes={resourcesQuery.data?.system?.ramFreeBytes}
              deviceRamTotalBytes={resourcesQuery.data?.system?.ramSizeBytes}
            />
            <AutomationDetail.ScriptDiagnostics
              title={t('common.diagnostics')}
              rows={formatAutomationResourceDiagnosticRows({
                resources: resourcesQuery.data,
                dataUpdatedAt: resourcesQuery.dataUpdatedAt,
                nowMs: Date.now(),
                missing: t('common.missing'),
                t
              })}
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
            disabled={deleteMutation.isPending || editPending}
            onClick={() => deleteMutation.mutate()}
          >
            {deleteMutation.isPending
              ? managementLabels.deleteBusy
              : t('common.confirmDelete')}
          </button>
        }
        busy={deleteMutation.isPending}
        closeLabel={t('common.close')}
        open={deleteOpen}
        title={managementLabels.deleteTitle}
        onClose={() => {
          if (!deleteMutation.isPending) setDeleteOpen(false);
        }}
      >
        <FeedbackPanel tone="warning" title={managementLabels.deleteAction}>
          {managementLabels.deleteDetail}
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
