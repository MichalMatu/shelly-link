import { FeedbackPanel, Modal, type ToastMessage, type ToastTone } from '@lcl/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from '../app/i18n.js';
import { AppToastViewport } from '../components/AppToastViewport.js';
import {
  deleteTimeAutomation,
  deleteTimePulseAutomation,
  isTimePulseInstalledAutomation,
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
      isTimePulseInstalledAutomation(installation)
        ? deleteTimePulseAutomation(installation)
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