from pathlib import Path

repo = Path('.')


def replace_once(path: str, old: str, new: str) -> None:
    target = repo / path
    text = target.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one anchor, got {count}')
    target.write_text(text.replace(old, new, 1))

# Split pure card presentation helpers from the React component.
card_path = repo / 'apps/mobile/src/features/thermometers/components/SavedSensorCard.tsx'
card = card_path.read_text()
helper_start = card.find('export type SavedSensorCardDevice = {')
component_start = card.find('type SavedSensorCardProps = {')
if helper_start < 0 or component_start < 0 or helper_start >= component_start:
    raise SystemExit('could not resolve feature card helper/component boundaries')
helper_block = card[helper_start:component_start].rstrip() + '\n'
component_block = card[component_start:].lstrip()

for old, new in [
    ('const formatBattery = (', 'export const formatBattery = ('),
    ('const formatSeenAt = (', 'export const formatSeenAt = ('),
    ('const latestSample = (', 'export const latestSample = ('),
    ('const SENSOR_SAMPLE_PULSE_MS = 650;', 'export const SENSOR_SAMPLE_PULSE_MS = 650;'),
    ('const latestNumericSample = (', 'export const latestNumericSample = ('),
    ('const latestBatterySample = (', 'export const latestBatterySample = (')
]:
    if helper_block.count(old) != 1:
        raise SystemExit(f'helper export anchor not found exactly once: {old}')
    helper_block = helper_block.replace(old, new, 1)

presentation_dir = repo / 'apps/mobile/src/features/thermometers/presentation'
presentation_dir.mkdir(parents=True, exist_ok=True)
presentation_path = presentation_dir / 'savedSensorCardPresentation.ts'
if presentation_path.exists():
    raise SystemExit('savedSensorCardPresentation.ts already exists')
presentation_path.write_text(
    """import type { Measurement } from '@lcl/ble-core';
import type { SensorProfileId } from '@lcl/device-profiles';

""" + helper_block
)

card_path.write_text(
    """import type { Measurement } from '@lcl/ble-core';
import {
  IconBattery,
  IconClock,
  IconDeviceMobile,
  IconDotsVertical,
  IconPencil,
  IconPlug,
  IconTemperature,
  IconTrash,
  IconWifi
} from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '../../../app/i18n.js';
import {
  SENSOR_SAMPLE_PULSE_MS,
  formatBattery,
  formatSeenAt,
  formatSensorMetric,
  latestBatterySample,
  latestNumericSample,
  latestSample,
  sensorProfileDisplayLabels,
  type SavedSensorCardDevice
} from '../presentation/savedSensorCardPresentation.js';

""" + component_block
)

index_path = repo / 'apps/mobile/src/features/thermometers/index.ts'
index_path.write_text(
    """export { SavedSensorCard } from './components/SavedSensorCard.js';
export {
  formatSensorMetric,
  sensorProfileDisplayLabels,
  type SavedSensorCardDevice
} from './presentation/savedSensorCardPresentation.js';
"""
)

# Keep settings-only filtering in HardwareSetupScreen; SensorSetupPage receives a normal
# SensorSetupFlow plus two generic presentation callbacks.
replace_once(
    'apps/mobile/src/screens/hardware-setup/pages/SensorSetupPage.tsx',
    "  onOpenSensorSettings?: (sensorId: string) => void;\n  settingsOnlySensorId?: string;\n  onSettingsRemoved?: () => void;\n};\n",
    "  onOpenSensorSettings?: (sensorId: string) => void;\n  hideAddAction?: boolean;\n  onSensorRemoved?: () => void;\n};\n"
)
replace_once(
    'apps/mobile/src/screens/hardware-setup/pages/SensorSetupPage.tsx',
    "  onAddRequest,\n  onOpenSensorSettings,\n  settingsOnlySensorId,\n  onSettingsRemoved\n}: SensorSetupPageProps) => {\n",
    "  onAddRequest,\n  onOpenSensorSettings,\n  hideAddAction = false,\n  onSensorRemoved\n}: SensorSetupPageProps) => {\n"
)
replace_once(
    'apps/mobile/src/screens/hardware-setup/pages/SensorSetupPage.tsx',
    """  const visibleSensorDevices = settingsOnlySensorId
    ? flow.sensorDevices.filter(
        (device) =>
          device.id.toUpperCase() === settingsOnlySensorId.toUpperCase() ||
          device.runtimeAddress.toUpperCase() === settingsOnlySensorId.toUpperCase()
      )
    : flow.sensorDevices;
  const shouldRunSavedSensorLiveScan =
    visibleSensorDevices.length > 0 && !addOnly && !isSensorGattPending;
""",
    """  const sensorDeviceCount = flow.sensorDevices.length;
  const shouldRunSavedSensorLiveScan =
    sensorDeviceCount > 0 && !addOnly && !isSensorGattPending;
"""
)
replace_once(
    'apps/mobile/src/screens/hardware-setup/pages/SensorSetupPage.tsx',
    """  const confirmRemoveSensor = () => {
    if (!sensorPendingRemoval) return;
    const removedSettingsDevice =
      settingsOnlySensorId !== undefined &&
      (sensorPendingRemoval.id.toUpperCase() === settingsOnlySensorId.toUpperCase() ||
        sensorPendingRemoval.runtimeAddress.toUpperCase() ===
          settingsOnlySensorId.toUpperCase());
    flow.removeSensorDevice(sensorPendingRemoval.id);
    setDialog({ kind: 'none' });
    pushToast('ok', t('hardware.sensor.removed'));
    if (removedSettingsDevice) onSettingsRemoved?.();
  };
""",
    """  const confirmRemoveSensor = () => {
    if (!sensorPendingRemoval) return;
    flow.removeSensorDevice(sensorPendingRemoval.id);
    setDialog({ kind: 'none' });
    pushToast('ok', t('hardware.sensor.removed'));
    onSensorRemoved?.();
  };
"""
)
replace_once(
    'apps/mobile/src/screens/hardware-setup/pages/SensorSetupPage.tsx',
    "      {!settingsOnlySensorId && (\n",
    "      {!hideAddAction && (\n"
)
replace_once(
    'apps/mobile/src/screens/hardware-setup/pages/SensorSetupPage.tsx',
    "        {visibleSensorDevices.length === 0 &&\n",
    "        {flow.sensorDevices.length === 0 &&\n"
)
replace_once(
    'apps/mobile/src/screens/hardware-setup/pages/SensorSetupPage.tsx',
    "        {visibleSensorDevices.map((device) => (\n",
    "        {flow.sensorDevices.map((device) => (\n"
)

# Filter the flow once in the existing screen owner and pass the generic page props.
hardware_path = repo / 'apps/mobile/src/screens/hardware-setup/HardwareSetupScreen.tsx'
hardware = hardware_path.read_text()
old = """  if (sensorSettingsOnlyId) {
    return (
      <main
        className="demo-shell hardware-shell"
        aria-label={t('hardware.sensor.settingsTitle')}
      >
        <header className="demo-header app-page-header">
          <h1>{t('hardware.sensor.settingsTitle')}</h1>
        </header>
        <SensorSetupPage
          flow={flow}
          settingsOnlySensorId={sensorSettingsOnlyId}
          {...(onSensorSettingsRemoved
            ? { onSettingsRemoved: onSensorSettingsRemoved }
            : {})}
        />
      </main>
    );
  }
"""
new = """  if (sensorSettingsOnlyId) {
    const normalizedSensorId = sensorSettingsOnlyId.toUpperCase();
    const sensorSettingsFlow = {
      ...flow,
      sensorDevices: flow.sensorDevices.filter(
        (device) =>
          device.id.toUpperCase() === normalizedSensorId ||
          device.runtimeAddress.toUpperCase() === normalizedSensorId
      )
    };
    return (
      <main
        className="demo-shell hardware-shell"
        aria-label={t('hardware.sensor.settingsTitle')}
      >
        <header className="demo-header app-page-header">
          <h1>{t('hardware.sensor.settingsTitle')}</h1>
        </header>
        <SensorSetupPage
          flow={sensorSettingsFlow}
          hideAddAction
          {...(onSensorSettingsRemoved
            ? { onSensorRemoved: onSensorSettingsRemoved }
            : {})}
        />
      </main>
    );
  }
"""
if hardware.count(old) != 1:
    raise SystemExit(f'expected one settings-only HardwareSetupScreen block, got {hardware.count(old)}')
hardware_path.write_text(hardware.replace(old, new, 1))

print('Reduced Thermometer feature/page line budgets without changing behavior')
