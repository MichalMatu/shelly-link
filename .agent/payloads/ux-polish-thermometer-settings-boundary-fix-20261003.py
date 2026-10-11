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
import { useState } from 'react';
import { useTranslation } from '../../../app/i18n.js';
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

type ThermometerSettingsRouteProps = {
  device: SavedSensorCardDevice | null;
  samples: readonly Measurement[];
  pvvxTimePending: boolean;
  resolveRemovalUsage(): SensorRemovalUsage | null;
  onNameChange(value: string): void;
  onPvvxSetTime(): void;
  onRemove(): boolean;
  onRemoved(): void;
  onOpenAutomation?: (installationId: string) => void;
};

export const ThermometerSettingsRoute = ({
  device,
  samples,
  pvvxTimePending,
  resolveRemovalUsage,
  onNameChange,
  onPvvxSetTime,
  onRemove,
  onRemoved,
  onOpenAutomation
}: ThermometerSettingsRouteProps) => {
  const { t } = useTranslation();
  const [dialog, setDialog] = useState<RemovalDialog>({ kind: 'none' });

  if (!device) return <p>{t('hardware.sensor.empty')}</p>;

  const requestRemove = () => {
    const usage = resolveRemovalUsage();
    setDialog(usage ? { kind: 'blocked', usage } : { kind: 'confirm' });
  };

  const confirmRemove = () => {
    if (onRemove()) {
      setDialog({ kind: 'none' });
      onRemoved();
      return;
    }
    const usage = resolveRemovalUsage();
    setDialog(usage ? { kind: 'blocked', usage } : { kind: 'none' });
  };

  return (
    <>
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

replace_once(
    'apps/mobile/src/features/thermometers/index.ts',
    "export { ThermometerSettingsPage } from './components/ThermometerSettingsPage.js';\n",
    "export { ThermometerSettingsPage } from './components/ThermometerSettingsPage.js';\nexport { ThermometerSettingsRoute } from './components/ThermometerSettingsRoute.js';\n",
)

# Keep SensorSetupPage at its existing responsibility/line budget; the settings route gets its own feature boundary.
replace_once(
    'apps/mobile/src/screens/hardware-setup/pages/SensorSetupPage.tsx',
    "  SensorRemovalBlockedModal,\n  ThermometerSettingsPage,\n",
    "  SensorRemovalBlockedModal,\n",
)
replace_once(
    'apps/mobile/src/screens/hardware-setup/pages/SensorSetupPage.tsx',
    "  hideAddAction?: boolean;\n  settingsOnly?: boolean;\n  onSensorRemoved?: () => void;\n",
    "  hideAddAction?: boolean;\n  onSensorRemoved?: () => void;\n",
)
replace_once(
    'apps/mobile/src/screens/hardware-setup/pages/SensorSetupPage.tsx',
    "  hideAddAction = false,\n  settingsOnly = false,\n  onSensorRemoved\n",
    "  hideAddAction = false,\n  onSensorRemoved\n",
)
regex_replace_once(
    'apps/mobile/src/screens/hardware-setup/pages/SensorSetupPage.tsx',
    r"\n  if \(settingsOnly\) \{.*?\n  \}\n\n  return \(\n    <section\n      className=\{",
    "\n  return (\n    <section\n      className={",
)

# Dedicated wrapper keeps the same saved-sensor live-scan + toast lifecycle that SensorSetupPage used to own.
replace_once(
    'apps/mobile/src/screens/hardware-setup/HardwareSetupScreen.tsx',
    "import { AppPageBack } from '../../components/AppPageBack.js';\nimport { Pulse } from '../../features/automations/index.js';\n",
    "import { AppPageBack } from '../../components/AppPageBack.js';\nimport { AppToastViewport } from '../../components/AppToastViewport.js';\nimport { Pulse } from '../../features/automations/index.js';\nimport { ThermometerSettingsRoute } from '../../features/thermometers/index.js';\n",
)
replace_once(
    'apps/mobile/src/screens/hardware-setup/HardwareSetupScreen.tsx',
    "import { TimeScheduleSetupPage } from './pages/TimeScheduleSetupPage.js';\n",
    "import { TimeScheduleSetupPage } from './pages/TimeScheduleSetupPage.js';\nimport { useSensorSetupFeedback } from './pages/useSensorSetupFeedback.js';\nimport { useToastQueue } from './useToastQueue.js';\n",
)
wrapper = r'''
type HardwareSetupFlow = ReturnType<typeof useHardwareSetupFlow>;

const SensorSettingsOnlyPage = ({
  flow,
  sensorId,
  onRemoved
}: {
  flow: HardwareSetupFlow;
  sensorId: string;
  onRemoved?: () => void;
}) => {
  const { t } = useTranslation();
  const { dismissToast, pushToast, toasts } = useToastQueue('sensor-settings-toast');
  const normalizedSensorId = sensorId.toUpperCase();
  const device =
    flow.sensorDevices.find(
      (candidate) =>
        candidate.id.toUpperCase() === normalizedSensorId ||
        candidate.runtimeAddress.toUpperCase() === normalizedSensorId
    ) ?? null;
  const pvvxTimePending = flow.setPvvxTimeMutation.isPending;

  useSensorSetupFeedback({
    flow,
    shouldRunSavedSensorLiveScan: device !== null && !pvvxTimePending,
    pushToast,
    t
  });

  return (
    <>
      <AppToastViewport
        dismissLabel={t('toast.dismiss')}
        label={t('toast.regionLabel')}
        toasts={toasts}
        onDismiss={dismissToast}
      />
      <ThermometerSettingsRoute
        device={device}
        samples={device ? (flow.sensorSamplesById[device.id.toUpperCase()] ?? []) : []}
        pvvxTimePending={pvvxTimePending}
        resolveRemovalUsage={() => (device ? (flow.sensorRemovalUsage(device.id)[0] ?? null) : null)}
        onNameChange={(value) => {
          if (device) flow.setSensorDeviceName(device.id, value);
        }}
        onPvvxSetTime={() => {
          if (device) flow.setPvvxTimeMutation.mutate(device);
        }}
        onRemove={() => (device ? flow.removeSensorDevice(device.id) : false)}
        onRemoved={() => {
          pushToast('ok', t('hardware.sensor.removed'));
          onRemoved?.();
        }}
      />
    </>
  );
};

'''
replace_once(
    'apps/mobile/src/screens/hardware-setup/HardwareSetupScreen.tsx',
    "type LocalShellyPage =\n",
    wrapper + "type LocalShellyPage =\n",
)
regex_replace_once(
    'apps/mobile/src/screens/hardware-setup/HardwareSetupScreen.tsx',
    r"  if \(sensorSettingsOnlyId\) \{.*?\n  \}\n\n  if \(localShellyPage !== null\) \{",
    r'''  if (sensorSettingsOnlyId) {
    return (
      <main
        className="demo-shell hardware-shell"
        aria-label={t('hardware.sensor.settingsTitle')}
      >
        <header className="demo-header app-page-header">
          <h1>{t('hardware.sensor.settingsTitle')}</h1>
        </header>
        <SensorSettingsOnlyPage
          flow={flow}
          sensorId={sensorSettingsOnlyId}
          {...(onSensorSettingsRemoved ? { onRemoved: onSensorSettingsRemoved } : {})}
        />
      </main>
    );
  }

  if (localShellyPage !== null) {''',
)
