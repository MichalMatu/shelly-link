from pathlib import Path

repo = Path('.')


def replace_once(path: str, old: str, new: str) -> None:
    target = repo / path
    text = target.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one anchor, got {count}')
    target.write_text(text.replace(old, new, 1))

# Move the reusable saved-Thermometer presentation into a real feature boundary.
presentation_path = repo / 'apps/mobile/src/screens/hardware-setup/pages/SensorSetupPresentation.tsx'
text = presentation_path.read_text()
display_start = text.find('export const sensorProfileDisplayLabels = {')
form_start = text.find('type SensorAddFormProps = {')
card_start = text.find('type SavedSensorCardProps = {')
if min(display_start, form_start, card_start) < 0 or not (display_start < form_start < card_start):
    raise SystemExit('could not resolve Thermometer presentation extraction boundaries')

feature_helpers = text[display_start:form_start].rstrip() + '\n\n'
card_block = text[card_start:].rstrip() + '\n'
prefix = text[:display_start] + text[form_start:card_start]

icon_import = """import {
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
"""
if prefix.count(icon_import) != 1:
    raise SystemExit(f'expected one Thermometer icon import block, got {prefix.count(icon_import)}')
prefix = prefix.replace(icon_import, '', 1)
react_import = "import { useEffect, useId, useRef, useState } from 'react';"
if prefix.count(react_import) != 1:
    raise SystemExit(f'expected one mixed React import, got {prefix.count(react_import)}')
prefix = prefix.replace(react_import, "import { useId } from 'react';", 1)
sample_import = "import type { SensorReadingSample } from '../../../flows/hardware-setup/sensorReadingsStore.js';\n"
if prefix.count(sample_import) != 1:
    raise SystemExit(f'expected one SensorReadingSample import, got {prefix.count(sample_import)}')
prefix = prefix.replace(sample_import, '', 1)
presentation_path.write_text(prefix.rstrip() + '\n')

feature_root = repo / 'apps/mobile/src/features/thermometers'
component_dir = feature_root / 'components'
component_dir.mkdir(parents=True, exist_ok=True)
component_path = component_dir / 'SavedSensorCard.tsx'
if component_path.exists():
    raise SystemExit('feature SavedSensorCard.tsx already exists')

feature_body = feature_helpers + card_block
feature_body = feature_body.replace('SensorReadingSample', 'Measurement')
feature_body = feature_body.replace(
    "  device: SensorSetupFlow['sensorDevices'][number];",
    '  device: SavedSensorCardDevice;'
)
if "SensorSetupFlow['sensorDevices'][number]" in feature_body:
    raise SystemExit('legacy SensorSetupFlow type remained in feature card')
component_path.write_text(
    """import type { Measurement } from '@lcl/ble-core';
import type { SensorProfileId } from '@lcl/device-profiles';
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

export type SavedSensorCardDevice = {
  id: string;
  name: string;
  runtimeAddress: string;
  profileId: SensorProfileId;
};

"""
    + feature_body
)

index_path = feature_root / 'index.ts'
if index_path.exists():
    raise SystemExit('thermometers feature index.ts already exists')
index_path.write_text(
    """export {
  SavedSensorCard,
  formatSensorMetric,
  sensorProfileDisplayLabels,
  type SavedSensorCardDevice
} from './components/SavedSensorCard.js';
"""
)

# Consumers import the feature through its public API; legacy add form stays where it is.
replace_once(
    'apps/mobile/src/screens/hardware-setup/pages/SensorSetupPage.tsx',
    """import {
  formatSensorMetric,
  SavedSensorCard,
  SensorAddForm,
  sensorProfileDisplayLabels
} from './SensorSetupPresentation.js';
""",
    """import {
  formatSensorMetric,
  SavedSensorCard,
  sensorProfileDisplayLabels
} from '../../../features/thermometers/index.js';
import { SensorAddForm } from './SensorSetupPresentation.js';
"""
)
replace_once(
    'apps/mobile/src/screens/hardware-setup/pages/SensorSetupPresentation.test.tsx',
    "import { SavedSensorCard } from './SensorSetupPresentation.js';",
    "import { SavedSensorCard } from '../../../features/thermometers/index.js';"
)

# The detail is composed by the existing HardwareSetupScreen/SensorSetupPage legacy owner,
# not by adding a new product module under the frozen legacy screens tree.
detail_path = repo / 'apps/mobile/src/screens/ThermometerDetailScreen.tsx'
if not detail_path.exists():
    raise SystemExit('expected generated ThermometerDetailScreen.tsx before boundary rewrite')
detail_path.unlink()

replace_once(
    'apps/mobile/src/routes/AppRoutes.tsx',
    "import { ThermometerDetailScreen } from '../screens/ThermometerDetailScreen.js';\n",
    ''
)
replace_once(
    'apps/mobile/src/routes/AppRoutes.tsx',
    """  } else if (route.type === 'sensor-settings') {
    content = (
      <ThermometerDetailScreen
        sensorId={route.sensorId}
        onBack={() => navigate({ type: 'dashboard', kind: 'time' })}
      />
    );
  } else if (route.type === 'ble-plug-detail') {
""",
    """  } else if (route.type === 'sensor-settings') {
    content = (
      <Suspense fallback={<RouteFallback />}>
        <HardwareSetupScreen
          sensorSettingsOnlyId={route.sensorId}
          onSensorSettingsRemoved={() => navigate({ type: 'dashboard', kind: 'time' })}
        />
      </Suspense>
    );
  } else if (route.type === 'ble-plug-detail') {
"""
)

# Existing HardwareSetupScreen owns the legacy sensor flow and gains a settings-only composition.
replace_once(
    'apps/mobile/src/screens/hardware-setup/HardwareSetupScreen.tsx',
    "  sensorAddMode?: 'manual' | 'phone-scan';\n};\n",
    "  sensorAddMode?: 'manual' | 'phone-scan';\n  sensorSettingsOnlyId?: string;\n  onSensorSettingsRemoved?: () => void;\n};\n"
)
replace_once(
    'apps/mobile/src/screens/hardware-setup/HardwareSetupScreen.tsx',
    "  plugAddOnly = false,\n  sensorAddOnly = false,\n  sensorAddMode = 'phone-scan'\n}: HardwareSetupScreenProps = {}) => {\n",
    "  plugAddOnly = false,\n  sensorAddOnly = false,\n  sensorAddMode = 'phone-scan',\n  sensorSettingsOnlyId,\n  onSensorSettingsRemoved\n}: HardwareSetupScreenProps = {}) => {\n"
)
settings_anchor = """  if (localShellyPage !== null) {
"""
settings_block = """  if (sensorSettingsOnlyId) {
    return (
      <main className="demo-shell hardware-shell">
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
replace_once(
    'apps/mobile/src/screens/hardware-setup/HardwareSetupScreen.tsx',
    settings_anchor,
    settings_block + settings_anchor
)

# SensorSetupPage can render one managed Thermometer without changing flow ownership.
replace_once(
    'apps/mobile/src/screens/hardware-setup/pages/SensorSetupPage.tsx',
    "  onAddRequest?: (mode: SensorAddMode) => void;\n  onOpenSensorSettings?: (sensorId: string) => void;\n};\n",
    "  onAddRequest?: (mode: SensorAddMode) => void;\n  onOpenSensorSettings?: (sensorId: string) => void;\n  settingsOnlySensorId?: string;\n  onSettingsRemoved?: () => void;\n};\n"
)
replace_once(
    'apps/mobile/src/screens/hardware-setup/pages/SensorSetupPage.tsx',
    "  addOnly = false,\n  onAddRequest,\n  onOpenSensorSettings\n}: SensorSetupPageProps) => {\n",
    "  addOnly = false,\n  onAddRequest,\n  onOpenSensorSettings,\n  settingsOnlySensorId,\n  onSettingsRemoved\n}: SensorSetupPageProps) => {\n"
)
replace_once(
    'apps/mobile/src/screens/hardware-setup/pages/SensorSetupPage.tsx',
    "  const sensorDeviceCount = flow.sensorDevices.length;\n  const shouldRunSavedSensorLiveScan =\n    sensorDeviceCount > 0 && !addOnly && !isSensorGattPending;\n",
    "  const visibleSensorDevices = settingsOnlySensorId\n    ? flow.sensorDevices.filter(\n        (device) =>\n          device.id.toUpperCase() === settingsOnlySensorId.toUpperCase() ||\n          device.runtimeAddress.toUpperCase() === settingsOnlySensorId.toUpperCase()\n      )\n    : flow.sensorDevices;\n  const shouldRunSavedSensorLiveScan =\n    visibleSensorDevices.length > 0 && !addOnly && !isSensorGattPending;\n"
)
replace_once(
    'apps/mobile/src/screens/hardware-setup/pages/SensorSetupPage.tsx',
    """  const confirmRemoveSensor = () => {
    if (!sensorPendingRemoval) return;
    flow.removeSensorDevice(sensorPendingRemoval.id);
    setDialog({ kind: 'none' });
    pushToast('ok', t('hardware.sensor.removed'));
  };
""",
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
"""
)
# Settings-only detail has no add FAB.
replace_once(
    'apps/mobile/src/screens/hardware-setup/pages/SensorSetupPage.tsx',
    """      <button
        className={
          primaryAddAction === 'phone-scan'
            ? 'primary-action dashboard-fab'
            : 'primary-action setup-add-fab'
        }
        type="button"
        aria-label={
          primaryAddAction === 'phone-scan'
            ? t('hardware.sensor.scanPhoneTitle')
            : t('hardware.sensor.add')
        }
        title={
          primaryAddAction === 'phone-scan'
            ? t('hardware.sensor.scanPhoneTitle')
            : t('hardware.sensor.addTitle')
        }
        onClick={() => onAddRequest?.(primaryAddAction)}
      >
        <IconPlus
          className={
            primaryAddAction === 'phone-scan'
              ? 'dashboard-fab__icon'
              : 'setup-add-fab__icon'
          }
          aria-hidden="true"
        />
      </button>
""",
    """      {!settingsOnlySensorId && (
        <button
          className={
            primaryAddAction === 'phone-scan'
              ? 'primary-action dashboard-fab'
              : 'primary-action setup-add-fab'
          }
          type="button"
          aria-label={
            primaryAddAction === 'phone-scan'
              ? t('hardware.sensor.scanPhoneTitle')
              : t('hardware.sensor.add')
          }
          title={
            primaryAddAction === 'phone-scan'
              ? t('hardware.sensor.scanPhoneTitle')
              : t('hardware.sensor.addTitle')
          }
          onClick={() => onAddRequest?.(primaryAddAction)}
        >
          <IconPlus
            className={
              primaryAddAction === 'phone-scan'
                ? 'dashboard-fab__icon'
                : 'setup-add-fab__icon'
            }
            aria-hidden="true"
          />
        </button>
      )}
"""
)
replace_once(
    'apps/mobile/src/screens/hardware-setup/pages/SensorSetupPage.tsx',
    "        {flow.sensorDevices.length === 0 &&\n",
    "        {visibleSensorDevices.length === 0 &&\n"
)
replace_once(
    'apps/mobile/src/screens/hardware-setup/pages/SensorSetupPage.tsx',
    "        {flow.sensorDevices.map((device) => (\n",
    "        {visibleSensorDevices.map((device) => (\n"
)

# Route test uses the existing HardwareSetupScreen mock rather than a forbidden new screen mock.
routes_test_path = repo / 'apps/mobile/src/__tests__/app-routes.test.tsx'
routes_test = routes_test_path.read_text()
thermometer_mock = """vi.mock('../screens/ThermometerDetailScreen.js', () => ({
  ThermometerDetailScreen: ({
    sensorId,
    onBack
  }: {
    sensorId: string;
    onBack: () => void;
  }) => (
    <section>
      <p>{`mock-thermometer-${sensorId}`}</p>
      <button type="button" onClick={onBack}>
        mock-thermometer-back
      </button>
    </section>
  )
}));

"""
if routes_test.count(thermometer_mock) != 1:
    raise SystemExit(f'expected one generated Thermometer screen mock, got {routes_test.count(thermometer_mock)}')
routes_test = routes_test.replace(thermometer_mock, '', 1)
old_mock_args = """    onSetupComplete,
    plugAddOnly,
    sensorAddOnly
  }: {
"""
new_mock_args = """    onSetupComplete,
    plugAddOnly,
    sensorAddOnly,
    sensorSettingsOnlyId,
    onSensorSettingsRemoved
  }: {
"""
if routes_test.count(old_mock_args) != 1:
    raise SystemExit('HardwareSetupScreen mock args anchor not found')
routes_test = routes_test.replace(old_mock_args, new_mock_args, 1)
old_mock_types = """    plugAddOnly?: boolean;
    sensorAddOnly?: boolean;
  }) => (
"""
new_mock_types = """    plugAddOnly?: boolean;
    sensorAddOnly?: boolean;
    sensorSettingsOnlyId?: string;
    onSensorSettingsRemoved?: () => void;
  }) => (
"""
if routes_test.count(old_mock_types) != 1:
    raise SystemExit('HardwareSetupScreen mock types anchor not found')
routes_test = routes_test.replace(old_mock_types, new_mock_types, 1)
old_mock_body = """      <p>{`mock-sensor-add-${sensorAddOnly ? 'yes' : 'no'}`}</p>
      <button type="button" onClick={onBackToIntent}>
"""
new_mock_body = """      <p>{`mock-sensor-add-${sensorAddOnly ? 'yes' : 'no'}`}</p>
      <p>{`mock-sensor-settings-${sensorSettingsOnlyId ?? 'none'}`}</p>
      <button type="button" onClick={onSensorSettingsRemoved}>
        mock-sensor-settings-remove
      </button>
      <button type="button" onClick={onBackToIntent}>
"""
if routes_test.count(old_mock_body) != 1:
    raise SystemExit('HardwareSetupScreen mock body anchor not found')
routes_test = routes_test.replace(old_mock_body, new_mock_body, 1)
routes_test = routes_test.replace(
    "expect(await screen.findByText('mock-thermometer-A4:C1:38:4F:24:CD')).toBeVisible();",
    "expect(await screen.findByText('mock-sensor-settings-A4:C1:38:4F:24:CD')).toBeVisible();",
    1
)
routes_test = routes_test.replace(
    """    fireEvent.click(screen.getByRole('button', { name: 'mock-thermometer-back' }));
    expect(screen.getByRole('main', { name: 'Termometry' })).toBeVisible();
""",
    """    fireEvent.click(screen.getByRole('button', { name: 'Termometry' }));
    expect(screen.getByRole('main', { name: 'Termometry' })).toBeVisible();
""",
    1
)
routes_test_path.write_text(routes_test)

print('Moved Thermometer presentation into features/thermometers and composed settings through existing legacy owners')
