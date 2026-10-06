import { FeedbackPanel, Modal } from '@lcl/ui';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import {
  AppToastViewport,
  useAppToastQueue
} from '../components/AppToastViewport.js';
import {
  AutomationDetail,
  ClimateScriptDetailSection,
  Pulse,
  useInstalledAutomationStore,
  type InstalledAutomation
} from '../features/automations/index.js';
import {
  PlugBleDetailSurface,
  PlugDeviceSettingsSurface,
  PlugDetailTop,
  PlugInfoPanel,
  PlugRemovalBlockedModal,
  isSameShellyDevice,
  usePlugInformationFlow,
  useSavedPlugStore,
  type PlugDetailTab
} from '../features/plugs/index.js';
import { installationScriptPreviewCopy } from './locales/installationScriptPreview.js';
import { pulseManagementCopy } from './locales/pulseManagement.js';
import { useTranslation } from './i18n.js';

type StandalonePulseInstalledAutomation = Extract<InstalledAutomation, { kind: 'pulse' }>;

const STANDALONE_PULSE_DETAIL_TABS = [
  'automation',
  'ble',
  'device',
  'script',
  'info'
] as const satisfies readonly PlugDetailTab[];

type StandalonePulseInstallationDetailProps = {
  installation: StandalonePulseInstalledAutomation;
  onBack?: () => void;
};

export const StandalonePulseInstallationDetail = ({
  installation,
  onBack
}: StandalonePulseInstallationDetailProps) => {
  const { locale, t } = useTranslation();
  const [activeTab, setActiveTab] = useState<PlugDetailTab>('automation');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editPending, setEditPending] = useState(false);
  const [forgetOpen, setForgetOpen] = useState(false);
  const { dismissToast, pushToast, toasts } =
    useAppToastQueue('pulse-detail-toast');
  const managementLabels = pulseManagementCopy[locale];
  const scriptLabels = installationScriptPreviewCopy[locale];
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
        availableTabs={STANDALONE_PULSE_DETAIL_TABS}
        automationIcon="clock"
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
              <AutomationDetail.Section title={t('detail.currentState')}>
                <Pulse.Operational.StatusSummary status={pulseQuery.data} />
              </AutomationDetail.Section>

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

              <AutomationDetail.DangerZone title={managementLabels.deleteAction}>
                <button
                  className="secondary-action secondary-action--danger"
                  type="button"
                  disabled={deleteMutation.isPending || editPending}
                  onClick={() => setDeleteOpen(true)}
                >
                  {managementLabels.deleteAction}
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
          />
        )}

        {activeTab === 'device' && (
          <PlugDeviceSettingsSurface target={installation.shelly} />
        )}

        {activeTab === 'script' && (
          <ClimateScriptDetailSection
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
