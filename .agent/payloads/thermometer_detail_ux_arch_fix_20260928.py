from pathlib import Path

repo = Path('.')


def replace_once(path: str, old: str, new: str) -> None:
    target = repo / path
    text = target.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one anchor, got {count}')
    target.write_text(text.replace(old, new, 1))

# Move the extracted SavedSensorCard into the existing hardware-setup feature and
# remove all legacy flow/type dependencies from the feature component.
legacy_card = repo / 'apps/mobile/src/screens/hardware-setup/pages/SavedSensorCard.tsx'
card = legacy_card.read_text()
card = card.replace(
    "import type { SensorReadingSample } from '../../../flows/hardware-setup/sensorReadingsStore.js';\n",
    "import type { SensorDraftDevice } from '../data/setupDraftPersistence.js';\n",
    1,
)
card = card.replace("import type { SensorSetupFlow } from '../pageContracts.js';\n", '', 1)
helper_import = """import {
  formatSensorMetric,
  sensorProfileDisplayLabels
} from './SensorSetupPresentation.js';

"""
if card.count(helper_import) != 1:
    raise SystemExit(f'expected one legacy helper import, got {card.count(helper_import)}')
card = card.replace(helper_import, '', 1)
insert_anchor = "const formatBattery = (\n"
if card.count(insert_anchor) != 1:
    raise SystemExit('could not locate SavedSensorCard helper insertion point')
feature_helpers = """export type SensorCardReadingSample = {
  source: string;
  temperatureC?: number | undefined;
  humidityPct?: number | undefined;
  batteryPct?: number | undefined;
  voltageV?: number | undefined;
  rssi?: number | undefined;
  seenAtMs: number;
};

const sensorProfileDisplayLabels = {
  xiaomi_lywsd03mmc_bthome_v2: 'BTHome v2',
  tp357_custom_v1: 'TP357'
} as const;

const formatSensorMetric = (
  value: number | null | undefined,
  suffix = '',
  fractionDigits = 1,
  missingLabel: string
): string =>
  typeof value === 'number' && Number.isFinite(value)
    ? `${value.toFixed(fractionDigits)}${suffix}`
    : missingLabel;

"""
card = card.replace(insert_anchor, feature_helpers + insert_anchor, 1)
card = card.replace("device: SensorSetupFlow['sensorDevices'][number];", 'device: SensorDraftDevice;', 1)
card = card.replace('readonly SensorReadingSample[]', 'readonly SensorCardReadingSample[]')
feature_card = repo / 'apps/mobile/src/features/hardware-setup/components/SavedSensorCard.tsx'
feature_card.parent.mkdir(parents=True, exist_ok=True)
if feature_card.exists():
    raise SystemExit('feature SavedSensorCard already exists')
feature_card.write_text(card)
legacy_card.unlink()

index_path = repo / 'apps/mobile/src/features/hardware-setup/index.ts'
index = index_path.read_text()
export_block = """export { SavedSensorCard } from './components/SavedSensorCard.js';
export type { SensorCardReadingSample } from './components/SavedSensorCard.js';
"""
if export_block.strip() in index:
    raise SystemExit('SavedSensorCard already exported')
index_path.write_text(index.rstrip() + '\n' + export_block)

# Legacy composition imports the feature only through its public API.
replace_once(
    'apps/mobile/src/screens/hardware-setup/pages/SensorSetupPage.tsx',
    "import { SavedSensorCard } from './SavedSensorCard.js';\n",
    "import { SavedSensorCard } from '../../../features/hardware-setup/index.js';\n",
)
replace_once(
    'apps/mobile/src/screens/hardware-setup/pages/SensorSetupPresentation.test.tsx',
    "import { SavedSensorCard } from './SavedSensorCard.js';\n",
    "import { SavedSensorCard } from '../../../features/hardware-setup/index.js';\n",
)

# Thermometer detail stays inside the existing legacy hardware-setup owner instead of
# adding a new product module below src/screens.
detail_path = repo / 'apps/mobile/src/screens/ThermometerDetailScreen.tsx'
if not detail_path.exists():
    raise SystemExit('expected generated ThermometerDetailScreen before architecture fix')
detail_path.unlink()

replace_once(
    'apps/mobile/src/routes/AppRoutes.tsx',
    "import { SetupIntentScreen } from '../screens/SetupIntentScreen.js';\nimport { ThermometerDetailScreen } from '../screens/ThermometerDetailScreen.js';\n",
    "import { SetupIntentScreen } from '../screens/SetupIntentScreen.js';\n",
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
      <HardwareSetupScreen
        sensorDetailId={route.sensorId}
        onSensorDetailClose={() => navigate({ type: 'dashboard', kind: 'time' })}
      />
    );
  } else if (route.type === 'ble-plug-detail') {
""",
)

# Existing HardwareSetupScreen remains the state/side-effect owner for the detail route.
replace_once(
    'apps/mobile/src/screens/hardware-setup/HardwareSetupScreen.tsx',
    "  sensorAddMode?: 'manual' | 'phone-scan';\n};\n",
    "  sensorAddMode?: 'manual' | 'phone-scan';\n  sensorDetailId?: string;\n  onSensorDetailClose?: () => void;\n};\n",
)
replace_once(
    'apps/mobile/src/screens/hardware-setup/HardwareSetupScreen.tsx',
    "  sensorAddOnly = false,\n  sensorAddMode = 'phone-scan'\n}: HardwareSetupScreenProps = {}) => {\n",
    "  sensorAddOnly = false,\n  sensorAddMode = 'phone-scan',\n  sensorDetailId,\n  onSensorDetailClose\n}: HardwareSetupScreenProps = {}) => {\n",
)
replace_once(
    'apps/mobile/src/screens/hardware-setup/HardwareSetupScreen.tsx',
    """  const closeLocalAdd = () => {
    if (localAddPage === 'plug') flow.stopShellyScan();
    if (localAddPage === 'sensor') flow.stopPhoneBleScan();
    setLocalAddPage(null);
  };

  if (localShellyPage !== null) {
""",
    """  const closeLocalAdd = () => {
    if (localAddPage === 'plug') flow.stopShellyScan();
    if (localAddPage === 'sensor') flow.stopPhoneBleScan();
    setLocalAddPage(null);
  };

  if (sensorDetailId) {
    return (
      <main
        className=\"demo-shell hardware-shell\"
        aria-label={t('hardware.sensor.settingsTitle')}
      >
        <header className=\"demo-header app-page-header\">
          <h1>{t('hardware.sensor.settingsTitle')}</h1>
        </header>
        <SensorSetupPage
          flow={flow}
          detailSensorId={sensorDetailId}
          {...(onSensorDetailClose ? { onDetailClose: onSensorDetailClose } : {})}
        />
      </main>
    );
  }

  if (localShellyPage !== null) {
""",
)

# SensorSetupPage uses the same card/list/dialog lifecycle, filtered to one device in detail mode.
replace_once(
    'apps/mobile/src/screens/hardware-setup/pages/SensorSetupPage.tsx',
    "  onAddRequest?: (mode: SensorAddMode) => void;\n  onOpenSensorSettings?: (sensorId: string) => void;\n};\n",
    "  onAddRequest?: (mode: SensorAddMode) => void;\n  onOpenSensorSettings?: (sensorId: string) => void;\n  detailSensorId?: string;\n  onDetailClose?: () => void;\n};\n",
)
replace_once(
    'apps/mobile/src/screens/hardware-setup/pages/SensorSetupPage.tsx',
    "  addOnly = false,\n  onAddRequest,\n  onOpenSensorSettings\n}: SensorSetupPageProps) => {\n",
    "  addOnly = false,\n  onAddRequest,\n  onOpenSensorSettings,\n  detailSensorId,\n  onDetailClose\n}: SensorSetupPageProps) => {\n",
)
replace_once(
    'apps/mobile/src/screens/hardware-setup/pages/SensorSetupPage.tsx',
    """  const sensorDeviceCount = flow.sensorDevices.length;
  const shouldRunSavedSensorLiveScan =
    sensorDeviceCount > 0 && !addOnly && !isSensorGattPending;
""",
    """  const normalizedDetailSensorId = detailSensorId?.toUpperCase();
  const isDetail = normalizedDetailSensorId !== undefined;
  const visibleSensorDevices = isDetail
    ? flow.sensorDevices.filter(
        (device) =>
          device.id.toUpperCase() === normalizedDetailSensorId ||
          device.runtimeAddress.toUpperCase() === normalizedDetailSensorId
      )
    : flow.sensorDevices;
  const shouldRunSavedSensorLiveScan =
    visibleSensorDevices.length > 0 && !addOnly && !isSensorGattPending;
""",
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
    flow.removeSensorDevice(sensorPendingRemoval.id);
    setDialog({ kind: 'none' });
    pushToast('ok', t('hardware.sensor.removed'));
    if (isDetail) onDetailClose?.();
  };
""",
)
replace_once(
    'apps/mobile/src/screens/hardware-setup/pages/SensorSetupPage.tsx',
    """      className={
        embedded
          ? 'sensor-setup-panel sensor-setup-panel--embedded'
          : 'demo-panel sensor-setup-panel'
      }
      aria-label={t('hardware.nav.sensorTitle')}
    >
      <button
""",
    """      className={
        embedded || isDetail
          ? 'sensor-setup-panel sensor-setup-panel--embedded'
          : 'demo-panel sensor-setup-panel'
      }
      aria-label={t(isDetail ? 'hardware.sensor.settingsTitle' : 'hardware.nav.sensorTitle')}
    >
      {!isDetail && (
        <button
""",
)
replace_once(
    'apps/mobile/src/screens/hardware-setup/pages/SensorSetupPage.tsx',
    """        <IconPlus
          className={
            primaryAddAction === 'phone-scan'
              ? 'dashboard-fab__icon'
              : 'setup-add-fab__icon'
          }
          aria-hidden=\"true\"
        />
      </button>

      <Modal
""",
    """          <IconPlus
            className={
              primaryAddAction === 'phone-scan'
                ? 'dashboard-fab__icon'
                : 'setup-add-fab__icon'
            }
            aria-hidden=\"true\"
          />
        </button>
      )}

      <Modal
""",
)
replace_once(
    'apps/mobile/src/screens/hardware-setup/pages/SensorSetupPage.tsx',
    """        {flow.sensorDevices.length === 0 &&
          (embedded ? (
""",
    """        {visibleSensorDevices.length === 0 &&
          (embedded || isDetail ? (
""",
)
replace_once(
    'apps/mobile/src/screens/hardware-setup/pages/SensorSetupPage.tsx',
    "        {flow.sensorDevices.map((device) => (\n",
    "        {visibleSensorDevices.map((device) => (\n",
)

# Fold the route test into the existing HardwareSetupScreen mock and remove the forbidden
# newly-added legacy screen mock.
test_path = repo / 'apps/mobile/src/__tests__/app-routes.test.tsx'
test = test_path.read_text()
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
      <button type=\"button\" onClick={onBack}>
        mock-thermometer-back
      </button>
    </section>
  )
}));

"""
if test.count(thermometer_mock) != 1:
    raise SystemExit(f'expected one ThermometerDetailScreen mock, got {test.count(thermometer_mock)}')
test = test.replace(thermometer_mock, '', 1)
test = test.replace(
    "    plugAddOnly,\n    sensorAddOnly\n",
    "    plugAddOnly,\n    sensorAddOnly,\n    sensorDetailId,\n    onSensorDetailClose\n",
    1,
)
test = test.replace(
    "    plugAddOnly?: boolean;\n    sensorAddOnly?: boolean;\n",
    "    plugAddOnly?: boolean;\n    sensorAddOnly?: boolean;\n    sensorDetailId?: string;\n    onSensorDetailClose?: () => void;\n",
    1,
)
test = test.replace(
    "      <p>{`mock-sensor-add-${sensorAddOnly ? 'yes' : 'no'}`}</p>\n",
    "      <p>{`mock-sensor-add-${sensorAddOnly ? 'yes' : 'no'}`}</p>\n      <p>{`mock-thermometer-${sensorDetailId ?? 'none'}`}</p>\n",
    1,
)
test = test.replace(
    """      <button type=\"button\" onClick={onSetupComplete}>
        mock-complete
      </button>
""",
    """      <button type=\"button\" onClick={onSetupComplete}>
        mock-complete
      </button>
      <button type=\"button\" onClick={onSensorDetailClose}>
        mock-thermometer-back
      </button>
""",
    1,
)
test_path.write_text(test)

print('Moved Thermometer card to feature boundary and reused HardwareSetupScreen for detail')
