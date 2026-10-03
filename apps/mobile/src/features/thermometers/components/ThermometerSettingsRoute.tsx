import type { Measurement } from '@lcl/ble-core';
import type { ToastMessage, ToastTone } from '@lcl/ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from '../../../app/i18n.js';
import { AppToastViewport } from '../../../components/AppToastViewport.js';
import type { SavedSensorCardDevice } from '../presentation/savedSensorCardPresentation.js';
import {
  SensorRemovalBlockedModal,
  SensorRemovalConfirmModal,
  type SensorRemovalBlockedModalProps
} from './SensorRemovalBlockedModal.js';
import { ThermometerSettingsPage } from './ThermometerSettingsPage.js';

type SensorRemovalUsage = NonNullable<SensorRemovalBlockedModalProps['usage']>;
type RemovalDialog =
  { kind: 'none' } | { kind: 'confirm' } | { kind: 'blocked'; usage: SensorRemovalUsage };

type PvvxFeedback = {
  isSuccess: boolean;
  acknowledged: boolean | undefined;
  isError: boolean;
  error: unknown;
  reset(): void;
};

type ThermometerSettingsRouteProps = {
  device: SavedSensorCardDevice | null;
  samples: readonly Measurement[];
  pvvxTimePending: boolean;
  pvvxFeedback: PvvxFeedback;
  resolveRemovalUsage(): SensorRemovalUsage | null;
  onNameChange(value: string): void;
  onPvvxSetTime(): void;
  onRemove(): boolean;
  onRemoved(): void;
  onOpenAutomation?: (installationId: string) => void;
};

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error ?? '');

export const ThermometerSettingsRoute = ({
  device,
  samples,
  pvvxTimePending,
  pvvxFeedback,
  resolveRemovalUsage,
  onNameChange,
  onPvvxSetTime,
  onRemove,
  onRemoved,
  onOpenAutomation
}: ThermometerSettingsRouteProps) => {
  const { t } = useTranslation();
  const [dialog, setDialog] = useState<RemovalDialog>({ kind: 'none' });
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastIdRef = useRef(0);
  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);
  const pushToast = useCallback((tone: ToastTone, title: string, detail?: string) => {
    toastIdRef.current += 1;
    const id = `thermometer-settings-${toastIdRef.current}`;
    const toast: ToastMessage =
      detail === undefined ? { id, tone, title } : { id, tone, title, detail };
    setToasts((current) => [...current.slice(-2), toast]);
  }, []);

  useEffect(() => {
    if (!pvvxFeedback.isSuccess) return;
    pushToast(
      'ok',
      pvvxFeedback.acknowledged
        ? t('hardware.sensor.pvvxTimeSetTitle')
        : t('hardware.sensor.pvvxTimeSentTitle')
    );
    pvvxFeedback.reset();
  }, [pvvxFeedback, pushToast, t]);

  useEffect(() => {
    if (!pvvxFeedback.isError) return;
    pushToast(
      'warning',
      t('hardware.sensor.pvvxFailedTitle'),
      errorMessage(pvvxFeedback.error)
    );
    pvvxFeedback.reset();
  }, [pvvxFeedback, pushToast, t]);

  if (!device) return <p>{t('hardware.sensor.empty')}</p>;

  const requestRemove = () => {
    const usage = resolveRemovalUsage();
    setDialog(usage ? { kind: 'blocked', usage } : { kind: 'confirm' });
  };

  const confirmRemove = () => {
    if (onRemove()) {
      setDialog({ kind: 'none' });
      pushToast('ok', t('hardware.sensor.removed'));
      onRemoved();
      return;
    }
    const usage = resolveRemovalUsage();
    setDialog(usage ? { kind: 'blocked', usage } : { kind: 'none' });
  };

  return (
    <>
      <AppToastViewport
        dismissLabel={t('toast.dismiss')}
        label={t('toast.regionLabel')}
        toasts={toasts}
        onDismiss={dismissToast}
      />
      <SensorRemovalBlockedModal
        deviceName={dialog.kind === 'blocked' ? device.name : null}
        usage={dialog.kind === 'blocked' ? dialog.usage : null}
        onClose={() => setDialog({ kind: 'none' })}
        {...(onOpenAutomation ? { onOpenAutomation } : {})}
      />
      <SensorRemovalConfirmModal
        deviceName={dialog.kind === 'confirm' ? device.name : null}
        onClose={() => setDialog({ kind: 'none' })}
        onConfirm={confirmRemove}
      />
      <ThermometerSettingsPage
        device={device}
        samples={samples}
        pvvxTimePending={pvvxTimePending}
        onNameChange={onNameChange}
        onPvvxSetTime={onPvvxSetTime}
        onRemove={requestRemove}
      />
    </>
  );
};
