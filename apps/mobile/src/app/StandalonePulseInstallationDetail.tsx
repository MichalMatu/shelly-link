import { FeedbackPanel, Modal } from '@lcl/ui';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ClimateScriptDetailSection,
  Pulse,
  useInstalledAutomationStore,
  type InstalledAutomation
} from '../features/automations/index.js';
import {
  PlugAutomationModeControl,
  PlugBleDetailSurface,
  PlugDeviceSettingsSurface,
  PlugDetailTop,
  PlugInfoPanel,
  PlugRelayControls,
  PlugRemovalBlockedModal,
  isSameShellyDevice,
  usePlugInformationFlow,
  useSavedPlugStore,
  type PlugDetailTab
} from '../features/plugs/index.js';
import { installationScriptPreviewCopy } from './locales/installationScriptPreview.js';
import { pulseCycleCopy } from './locales/pulseCycle.js';
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
  onBack(): void;
  onOpenBleDiscovery?: (deviceId: string) => void;
};

const secondsLabel = (milliseconds: number): string => `${milliseconds / 1_000} s`;

export const StandalonePulseInstallationDetail = ({
  installation,
  onBack,
  onOpenBleDiscovery
}: StandalonePulseInstallationDetailProps) => {
  const { locale, t } = useTranslation();
  const [activeTab, setActiveTab] = useState<PlugDetailTab>('automation');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [forgetOpen, setForgetOpen] = useState(false);
  const pulseLabels = pulseCycleCopy[locale];
  const managementLabels = pulseManagementCopy[locale];
  const scriptLabels = installationScriptPreviewCopy[locale];
  const pulseQuery = Pulse.Operational.useStatus(installation);
  const runtimeQuery = Pulse.Standalone.useRuntime(installation);
  const action = Pulse.Standalone.useActions(installation);
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
  const runtimeMatches =
    runtimeQuery.data?.automationScriptId === installation.script.id;
  const automationRunning =
    runtimeMatches && runtimeQuery.data?.automationMode === 'auto';
  const manualControl = runtimeMatches && runtimeQuery.data?.automationMode === 'manual';
  const runtimeControllable =
    runtimeMatches &&
    (runtimeQuery.data?.automationMode === 'auto' ||
      runtimeQuery.data?.automationMode === 'manual');
  const execution = installation.config.pulse.execution;

  const deleteMutation = useMutation({
    mutationFn: () => Pulse.Standalone.delete(installation),
    onSuccess: () => {
      removeInstallation(installation.id);
      setDeleteOpen(false);
      onBack();
    }
  });

  const executionLabel =
    execution.mode === 'continuous'
      ? pulseLabels.continuous
      : execution.mode === 'cycles'
        ? `${pulseLabels.cycles} · ${execution.count}`
        : `${pulseLabels.duration} · ${secondsLabel(execution.durationMs)}`;
  const runtimeNeedsAttention =
    pulseQuery.isError ||
    runtimeQuery.isError ||
    (runtimeQuery.data !== undefined && !runtimeMatches);

  const copyScript = () => {
    if (!scriptQuery.data || typeof navigator === 'undefined' || !navigator.clipboard) return;
    void navigator.clipboard.writeText(scriptQuery.data);
  };

  return (
    <main className="demo-shell installation-detail-shell">
      <PlugDetailTop
        tabs={[activeTab, setActiveTab]}
        availableTabs={STANDALONE_PULSE_DETAIL_TABS}
      />

      <section className="plug-detail-surface" aria-label={t('detail.currentState')}>
        {activeTab === 'automation' && (
          <>
            {runtimeNeedsAttention && (
              <FeedbackPanel tone="warning" title={t('dashboard.health.attention')}>
                {managementLabels.runtimeAttention}
              </FeedbackPanel>
            )}
            {action.isError && (
              <FeedbackPanel tone="warning" title={t('common.operationFailed')}>
                {t('detail.actionFailed')}
              </FeedbackPanel>
            )}
            {deleteMutation.isError && (
              <FeedbackPanel tone="danger" title={t('common.operationFailed')}>
                {managementLabels.deleteFailed}
              </FeedbackPanel>
            )}

            <section className="installation-automation-live-state plug-detail-section">
              <Pulse.Operational.StatusSummary status={pulseQuery.data} />
              <dl className="automation-summary installation-detail-summary">
                <div>
                  <dt>{pulseLabels.onSeconds}</dt>
                  <dd>{secondsLabel(installation.config.pulse.onMs)}</dd>
                </div>
                <div>
                  <dt>{pulseLabels.offSeconds}</dt>
                  <dd>{secondsLabel(installation.config.pulse.offMs)}</dd>
                </div>
                <div>
                  <dt>{pulseLabels.initialDelaySeconds}</dt>
                  <dd>{secondsLabel(installation.config.pulse.initialDelayMs)}</dd>
                </div>
                <div>
                  <dt>{pulseLabels.startPhase}</dt>
                  <dd>
                    {installation.config.pulse.startPhase === 'on'
                      ? pulseLabels.startOn
                      : pulseLabels.startOff}
                  </dd>
                </div>
                <div>
                  <dt>{pulseLabels.execution}</dt>
                  <dd>{executionLabel}</dd>
                </div>
              </dl>

              <PlugAutomationModeControl
                autoActive={automationRunning}
                manualActive={manualControl}
                disabled={action.isPending || !runtimeControllable}
                onAuto={() => {
                  if (!automationRunning) action.mutate('auto');
                }}
                onManual={() => {
                  if (!manualControl) action.mutate('manual');
                }}
              />
              <PlugRelayControls
                relayState={runtimeQuery.data?.relayOn}
                busy={action.isPending}
                disabled={!manualControl}
                onTurnOn={() => action.mutate('on')}
                onTurnOff={() => action.mutate('off')}
              />
            </section>

            <div className="installation-detail-delete-action">
              <button
                className="secondary-action secondary-action--danger"
                type="button"
                disabled={deleteMutation.isPending || action.isPending}
                onClick={() => setDeleteOpen(true)}
              >
                {managementLabels.deleteAction}
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
            disabled={deleteMutation.isPending}
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
    </main>
  );
};
