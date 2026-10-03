from pathlib import Path
import re


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    source = file.read_text()
    count = source.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one exact match, got {count}')
    file.write_text(source.replace(old, new, 1))


def regex_replace_once(path: str, pattern: str, replacement: str) -> None:
    file = Path(path)
    source = file.read_text()
    updated, count = re.subn(pattern, replacement, source, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'{path}: expected one regex match, got {count}')
    file.write_text(updated)


Path('apps/mobile/src/features/thermometers/components/ThermometerSettingsRoute.tsx').write_text(r'''import type { Measurement } from '@lcl/ble-core';
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
  | { kind: 'none' }
  | { kind: 'confirm' }
  | { kind: 'blocked'; usage: SensorRemovalUsage };

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
    const toast: ToastMessage = detail === undefined ? { id, tone, title } : { id, tone, title, detail };
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
''')

# HardwareSetupScreen stays a thin flow-to-feature adapter.
replace_once(
    'apps/mobile/src/screens/hardware-setup/HardwareSetupScreen.tsx',
    "import { AppPageBack } from '../../components/AppPageBack.js';\nimport { AppToastViewport } from '../../components/AppToastViewport.js';\n",
    "import { AppPageBack } from '../../components/AppPageBack.js';\n",
)
replace_once(
    'apps/mobile/src/screens/hardware-setup/HardwareSetupScreen.tsx',
    "import { useHardwareSetupFlow } from '../../flows/hardware-setup/useHardwareSetupFlow.js';\n",
    "import { useHardwareSetupFlow } from '../../flows/hardware-setup/useHardwareSetupFlow.js';\nimport { useSavedSensorLiveScanLifecycle } from '../../flows/hardware-setup/useSavedSensorLiveScanLifecycle.js';\n",
)
replace_once(
    'apps/mobile/src/screens/hardware-setup/HardwareSetupScreen.tsx',
    "import { TimeScheduleSetupPage } from './pages/TimeScheduleSetupPage.js';\nimport { useSensorSetupFeedback } from './pages/useSensorSetupFeedback.js';\nimport { useToastQueue } from './useToastQueue.js';\n",
    "import { TimeScheduleSetupPage } from './pages/TimeScheduleSetupPage.js';\n",
)
regex_replace_once(
    'apps/mobile/src/screens/hardware-setup/HardwareSetupScreen.tsx',
    r"type HardwareSetupFlow = ReturnType<typeof useHardwareSetupFlow>;\n\nconst SensorSettingsOnlyPage = \(\{.*?\n\};\n\ntype LocalShellyPage =",
    "type LocalShellyPage =",
)
replace_once(
    'apps/mobile/src/screens/hardware-setup/HardwareSetupScreen.tsx',
    "  const flow = useHardwareSetupFlow();\n  const { rulePreset, setRulePreset, selectedShellyId, selectShellyDevice } = flow;\n",
    "  const flow = useHardwareSetupFlow();\n  useSavedSensorLiveScanLifecycle({\n    flow,\n    enabled: Boolean(sensorSettingsOnlyId) && !flow.setPvvxTimeMutation.isPending\n  });\n  const { rulePreset, setRulePreset, selectedShellyId, selectShellyDevice } = flow;\n",
)
regex_replace_once(
    'apps/mobile/src/screens/hardware-setup/HardwareSetupScreen.tsx',
    r"  if \(sensorSettingsOnlyId\) \{.*?\n  \}\n\n  if \(localShellyPage !== null\) \{",
    r'''  if (sensorSettingsOnlyId) {
    const normalizedSensorId = sensorSettingsOnlyId.toUpperCase();
    const device =
      flow.sensorDevices.find(
        (candidate) =>
          candidate.id.toUpperCase() === normalizedSensorId ||
          candidate.runtimeAddress.toUpperCase() === normalizedSensorId
      ) ?? null;
    const pvvxFeedback = flow.setPvvxTimeMutation;
    return (
      <main
        className="demo-shell hardware-shell"
        aria-label={t('hardware.sensor.settingsTitle')}
      >
        <header className="demo-header app-page-header">
          <h1>{t('hardware.sensor.settingsTitle')}</h1>
        </header>
        <ThermometerSettingsRoute
          device={device}
          samples={device ? (flow.sensorSamplesById[device.id.toUpperCase()] ?? []) : []}
          pvvxTimePending={pvvxFeedback.isPending}
          pvvxFeedback={{
            isSuccess: pvvxFeedback.isSuccess,
            acknowledged: pvvxFeedback.data?.acknowledged,
            isError: pvvxFeedback.isError,
            error: pvvxFeedback.error,
            reset: pvvxFeedback.reset
          }}
          resolveRemovalUsage={() =>
            device ? (flow.sensorRemovalUsage(device.id)[0] ?? null) : null
          }
          onNameChange={(value) => {
            if (device) flow.setSensorDeviceName(device.id, value);
          }}
          onPvvxSetTime={() => {
            if (device) pvvxFeedback.mutate(device);
          }}
          onRemove={() => (device ? flow.removeSensorDevice(device.id) : false)}
          onRemoved={() => onSensorSettingsRemoved?.()}
        />
      </main>
    );
  }

  if (localShellyPage !== null) {''',
)
