from pathlib import Path

repo = Path('.')


def replace_once(path: str, old: str, new: str) -> None:
    target = repo / path
    text = target.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one anchor, got {count}')
    target.write_text(text.replace(old, new, 1))

# Route model: Thermometer settings is a nested Thermometers route.
replace_once(
    'apps/mobile/src/routes/appRouteModel.ts',
    "type PlugSettingsRoute = { type: 'plug-settings'; deviceId: string };\n",
    "type PlugSettingsRoute = { type: 'plug-settings'; deviceId: string };\ntype SensorSettingsRoute = { type: 'sensor-settings'; sensorId: string };\n",
)
replace_once(
    'apps/mobile/src/routes/appRouteModel.ts',
    "  | PlugSettingsRoute\n  | BlePlugDetailRoute\n",
    "  | PlugSettingsRoute\n  | SensorSettingsRoute\n  | BlePlugDetailRoute\n",
)
replace_once(
    'apps/mobile/src/routes/appRouteModel.ts',
    "  if (route.type === 'installation') return route.kind;\n  if (\n",
    "  if (route.type === 'installation') return route.kind;\n  if (route.type === 'sensor-settings') return 'time';\n  if (\n",
)

# App routing and Android Back behavior.
replace_once(
    'apps/mobile/src/routes/AppRoutes.tsx',
    "import { SetupIntentScreen } from '../screens/SetupIntentScreen.js';\n",
    "import { SetupIntentScreen } from '../screens/SetupIntentScreen.js';\nimport { ThermometerDetailScreen } from '../screens/ThermometerDetailScreen.js';\n",
)
replace_once(
    'apps/mobile/src/routes/AppRoutes.tsx',
    "  if (route.type === 'device-add') return route.returnTo;\n  if (route.type === 'plug-ble-discovery') return route.returnTo;\n",
    "  if (route.type === 'device-add') return route.returnTo;\n  if (route.type === 'sensor-settings') return { type: 'dashboard', kind: 'time' };\n  if (route.type === 'plug-ble-discovery') return route.returnTo;\n",
)
replace_once(
    'apps/mobile/src/routes/AppRoutes.tsx',
    "        onAddThermometer={() =>\n          navigate({\n            type: 'device-add',\n            device: 'sensor',\n            sourceKind: 'time',\n            returnTo: { type: 'dashboard', kind: 'time' },\n            sensorMode: 'phone-scan'\n          })\n        }\n",
    "        onAddThermometer={() =>\n          navigate({\n            type: 'device-add',\n            device: 'sensor',\n            sourceKind: 'time',\n            returnTo: { type: 'dashboard', kind: 'time' },\n            sensorMode: 'phone-scan'\n          })\n        }\n        onOpenThermometerSettings={(sensorId) =>\n          navigate({ type: 'sensor-settings', sensorId })\n        }\n",
)
replace_once(
    'apps/mobile/src/routes/AppRoutes.tsx',
    "  } else if (route.type === 'ble-plug-detail') {\n",
    "  } else if (route.type === 'sensor-settings') {\n    content = (\n      <ThermometerDetailScreen\n        sensorId={route.sensorId}\n        onBack={() => navigate({ type: 'dashboard', kind: 'time' })}\n      />\n    );\n  } else if (route.type === 'ble-plug-detail') {\n",
)

# Dashboard composition: give Thermometers a settings destination.
replace_once(
    'apps/mobile/src/screens/AutomationDashboardScreen.tsx',
    "const ThermometerDashboardSection = ({ onAdd }: { onAdd(): void }) => {\n  const flow = useSensorSetupFlow();\n  return (\n    <SensorSetupPage\n      flow={flow}\n      primaryAddAction=\"phone-scan\"\n      embedded\n      onAddRequest={onAdd}\n    />\n  );\n};\n",
    "const ThermometerDashboardSection = ({\n  onAdd,\n  onOpenSettings\n}: {\n  onAdd(): void;\n  onOpenSettings(sensorId: string): void;\n}) => {\n  const flow = useSensorSetupFlow();\n  return (\n    <SensorSetupPage\n      flow={flow}\n      primaryAddAction=\"phone-scan\"\n      embedded\n      onAddRequest={onAdd}\n      onOpenSensorSettings={onOpenSettings}\n    />\n  );\n};\n",
)
replace_once(
    'apps/mobile/src/screens/AutomationDashboardScreen.tsx',
    "  onAddThermometer(): void;\n  onAddAutomation(kind: AppNavigationKind, shellyId?: string): void;\n",
    "  onAddThermometer(): void;\n  onOpenThermometerSettings(sensorId: string): void;\n  onAddAutomation(kind: AppNavigationKind, shellyId?: string): void;\n",
)
replace_once(
    'apps/mobile/src/screens/AutomationDashboardScreen.tsx',
    "  onAddPlug,\n  onAddThermometer,\n  onAddAutomation,\n",
    "  onAddPlug,\n  onAddThermometer,\n  onOpenThermometerSettings,\n  onAddAutomation,\n",
)
replace_once(
    'apps/mobile/src/screens/AutomationDashboardScreen.tsx',
    "          <ThermometerDashboardSection onAdd={onAddThermometer} />\n",
    "          <ThermometerDashboardSection\n            onAdd={onAddThermometer}\n            onOpenSettings={onOpenThermometerSettings}\n          />\n",
)

# Sensor setup page: dashboard cards open detail; setup-context cards keep inline management.
replace_once(
    'apps/mobile/src/screens/hardware-setup/pages/SensorSetupPage.tsx',
    "  onAddRequest?: (mode: SensorAddMode) => void;\n};\n",
    "  onAddRequest?: (mode: SensorAddMode) => void;\n  onOpenSensorSettings?: (sensorId: string) => void;\n};\n",
)
replace_once(
    'apps/mobile/src/screens/hardware-setup/pages/SensorSetupPage.tsx',
    "  embedded = false,\n  addOnly = false,\n  onAddRequest\n}: SensorSetupPageProps) => {\n",
    "  embedded = false,\n  addOnly = false,\n  onAddRequest,\n  onOpenSensorSettings\n}: SensorSetupPageProps) => {\n",
)
replace_once(
    'apps/mobile/src/screens/hardware-setup/pages/SensorSetupPage.tsx',
    "            onPvvxSetTime={() => flow.setPvvxTimeMutation.mutate(device)}\n            onRemove={() => setDialog({ kind: 'remove', device })}\n",
    "            onPvvxSetTime={() => flow.setPvvxTimeMutation.mutate(device)}\n            onRemove={() => setDialog({ kind: 'remove', device })}\n            {...(embedded && onOpenSensorSettings\n              ? { onOpenDetails: () => onOpenSensorSettings(device.id) }\n              : {})}\n",
)

# Presentation: dashboard variant prioritizes readings and one settings affordance.
replace_once(
    'apps/mobile/src/screens/hardware-setup/pages/SensorSetupPresentation.tsx',
    "  IconDeviceMobile,\n  IconPencil,\n",
    "  IconDeviceMobile,\n  IconDotsVertical,\n  IconPencil,\n",
)
replace_once(
    'apps/mobile/src/screens/hardware-setup/pages/SensorSetupPresentation.tsx',
    "  onPvvxSetTime(): void;\n  onRemove(): void;\n};\n",
    "  onPvvxSetTime(): void;\n  onRemove(): void;\n  onOpenDetails?: () => void;\n};\n",
)
replace_once(
    'apps/mobile/src/screens/hardware-setup/pages/SensorSetupPresentation.tsx',
    "  onNameChange,\n  onPvvxSetTime,\n  onRemove\n}: SavedSensorCardProps) => {\n",
    "  onNameChange,\n  onPvvxSetTime,\n  onRemove,\n  onOpenDetails\n}: SavedSensorCardProps) => {\n",
)
replace_once(
    'apps/mobile/src/screens/hardware-setup/pages/SensorSetupPresentation.tsx',
    "            <button\n              className=\"icon-action rule-summary-icon-action\"\n              type=\"button\"\n              aria-label={t('hardware.sensor.nameLabel')}\n              title={t('hardware.sensor.nameLabel')}\n              onClick={onEditStart}\n            >\n              <IconPencil className=\"icon-action__svg\" aria-hidden=\"true\" />\n            </button>\n",
    "            {!onOpenDetails && (\n              <button\n                className=\"icon-action rule-summary-icon-action\"\n                type=\"button\"\n                aria-label={t('hardware.sensor.nameLabel')}\n                title={t('hardware.sensor.nameLabel')}\n                onClick={onEditStart}\n              >\n                <IconPencil className=\"icon-action__svg\" aria-hidden=\"true\" />\n              </button>\n            )}\n",
)
old_actions = """        <div className=\"sensor-card-actions\">\n          {device.profileId === 'xiaomi_lywsd03mmc_bthome_v2' && (\n            <button\n              className=\"icon-action\"\n              type=\"button\"\n              disabled={pvvxTimePending}\n              aria-label={t('hardware.sensor.pvvxSetTimeTitle')}\n              title={t('hardware.sensor.pvvxSetTimeTitle')}\n              onClick={onPvvxSetTime}\n            >\n              <IconClock className=\"icon-action__svg\" aria-hidden=\"true\" />\n            </button>\n          )}\n          <button\n            className=\"icon-action icon-action--danger\"\n            type=\"button\"\n            aria-label={t('hardware.sensor.deleteTitle')}\n            title={t('hardware.sensor.deleteTitle')}\n            onClick={onRemove}\n          >\n            <IconTrash className=\"icon-action__svg\" aria-hidden=\"true\" />\n          </button>\n        </div>\n"""
new_actions = """        <div className=\"sensor-card-actions\">\n          {onOpenDetails ? (\n            <button\n              className=\"icon-action\"\n              type=\"button\"\n              aria-label={t('hardware.sensor.settingsAria', { name: device.name })}\n              title={t('hardware.sensor.settings')}\n              onClick={onOpenDetails}\n            >\n              <IconDotsVertical className=\"icon-action__svg\" aria-hidden=\"true\" />\n            </button>\n          ) : (\n            <>\n              {device.profileId === 'xiaomi_lywsd03mmc_bthome_v2' && (\n                <button\n                  className=\"icon-action\"\n                  type=\"button\"\n                  disabled={pvvxTimePending}\n                  aria-label={t('hardware.sensor.pvvxSetTimeTitle')}\n                  title={t('hardware.sensor.pvvxSetTimeTitle')}\n                  onClick={onPvvxSetTime}\n                >\n                  <IconClock className=\"icon-action__svg\" aria-hidden=\"true\" />\n                </button>\n              )}\n              <button\n                className=\"icon-action icon-action--danger\"\n                type=\"button\"\n                aria-label={t('hardware.sensor.deleteTitle')}\n                title={t('hardware.sensor.deleteTitle')}\n                onClick={onRemove}\n              >\n                <IconTrash className=\"icon-action__svg\" aria-hidden=\"true\" />\n              </button>\n            </>\n          )}\n        </div>\n"""
replace_once('apps/mobile/src/screens/hardware-setup/pages/SensorSetupPresentation.tsx', old_actions, new_actions)
replace_once(
    'apps/mobile/src/screens/hardware-setup/pages/SensorSetupPresentation.tsx',
    "      <div className=\"sensor-card-device-meta\" aria-label={t('hardware.sensor.details')}>\n        <span>{sensorProfileDisplayLabels[device.profileId]}</span>\n        <span>{device.runtimeAddress}</span>\n      </div>\n",
    "      {!onOpenDetails && (\n        <div className=\"sensor-card-device-meta\" aria-label={t('hardware.sensor.details')}>\n          <span>{sensorProfileDisplayLabels[device.profileId]}</span>\n          <span>{device.runtimeAddress}</span>\n        </div>\n      )}\n",
)

# New nested detail screen reuses the management-mode sensor card and existing feedback/lifecycle.
detail_path = repo / 'apps/mobile/src/screens/ThermometerDetailScreen.tsx'
if detail_path.exists():
    raise SystemExit('ThermometerDetailScreen.tsx already exists')
detail_path.write_text("""import { Modal } from '@lcl/ui';
import { useState } from 'react';
import { useTranslation } from '../app/i18n.js';
import { AppToastViewport } from '../components/AppToastViewport.js';
import { useSensorSetupFlow } from '../flows/hardware-setup/usePhoneSensorFlow.js';
import { SavedSensorCard } from './hardware-setup/pages/SensorSetupPresentation.js';
import { useSensorSetupFeedback } from './hardware-setup/pages/useSensorSetupFeedback.js';
import { useToastQueue } from './hardware-setup/useToastQueue.js';

type ThermometerDetailScreenProps = {
  sensorId: string;
  onBack(): void;
};

export const ThermometerDetailScreen = ({
  sensorId,
  onBack
}: ThermometerDetailScreenProps) => {
  const { t } = useTranslation();
  const flow = useSensorSetupFlow();
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { dismissToast, pushToast, toasts } = useToastQueue('sensor-detail-toast');
  const normalizedSensorId = sensorId.toUpperCase();
  const device = flow.sensorDevices.find(
    (candidate) =>
      candidate.id.toUpperCase() === normalizedSensorId ||
      candidate.runtimeAddress.toUpperCase() === normalizedSensorId
  );
  const shouldRunSavedSensorLiveScan =
    device !== undefined && !flow.setPvvxTimeMutation.isPending;

  useSensorSetupFeedback({
    flow,
    shouldRunSavedSensorLiveScan,
    pushToast,
    t
  });

  const samples = device
    ? (flow.sensorSamplesById[device.id.toUpperCase()] ?? [])
    : [];

  const confirmRemove = () => {
    if (!device) return;
    flow.removeSensorDevice(device.id);
    setDeleteOpen(false);
    onBack();
  };

  return (
    <main className=\"demo-shell\" aria-label={t('hardware.sensor.settingsTitle')}>
      <header className=\"demo-header app-page-header\">
        <h1>{t('hardware.sensor.settingsTitle')}</h1>
      </header>

      {device ? (
        <div className=\"saved-list\" aria-label={t('hardware.sensor.savedListLabel')}>
          <SavedSensorCard
            device={device}
            samples={samples}
            isEditing={editing}
            pvvxTimePending={flow.setPvvxTimeMutation.isPending}
            onEditStart={() => setEditing(true)}
            onEditEnd={() => setEditing(false)}
            onNameChange={(value) => flow.setSensorDeviceName(device.id, value)}
            onPvvxSetTime={() => flow.setPvvxTimeMutation.mutate(device)}
            onRemove={() => setDeleteOpen(true)}
          />
        </div>
      ) : (
        <p>{t('hardware.sensor.empty')}</p>
      )}

      <Modal
        closeLabel={t('common.cancel')}
        description={device?.name ?? ''}
        open={deleteOpen && device !== undefined}
        title={t('hardware.sensor.deleteConfirmTitle')}
        actions={
          <button
            className=\"secondary-action secondary-action--danger\"
            type=\"button\"
            title={t('hardware.sensor.deleteTitle')}
            onClick={confirmRemove}
          >
            {t('common.delete')}
          </button>
        }
        onClose={() => setDeleteOpen(false)}
      >
        <p>{t('hardware.sensor.deleteDescription')}</p>
      </Modal>

      <AppToastViewport
        dismissLabel={t('toast.dismiss')}
        label={t('toast.regionLabel')}
        toasts={toasts}
        onDismiss={dismissToast}
      />
    </main>
  );
};
""")

# Presentation unit test for dashboard-vs-management affordances.
replace_once(
    'apps/mobile/src/screens/hardware-setup/pages/SensorSetupPresentation.test.tsx',
    "import { act, cleanup, render } from '@testing-library/react';\n",
    "import { act, cleanup, render, screen } from '@testing-library/react';\n",
)
unit_path = repo / 'apps/mobile/src/screens/hardware-setup/pages/SensorSetupPresentation.test.tsx'
unit = unit_path.read_text()
insert = """

  it('uses one settings affordance on dashboard cards and keeps technical actions for detail', () => {
    const onOpenDetails = vi.fn();
    render(
      <I18nProvider>
        <SavedSensorCard
          device={device}
          samples={[sample(1000)]}
          isEditing={false}
          pvvxTimePending={false}
          onEditStart={vi.fn()}
          onEditEnd={vi.fn()}
          onNameChange={vi.fn()}
          onPvvxSetTime={vi.fn()}
          onRemove={vi.fn()}
          onOpenDetails={onOpenDetails}
        />
      </I18nProvider>
    );

    screen.getByRole('button', { name: 'Ustawienia termometru Xiaomi salon' }).click();
    expect(onOpenDetails).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Nazwa termometru' })).toBeNull();
    expect(
      screen.queryByRole('button', {
        name: 'Ustaw czas Xiaomi/PVVX zgodnie z telefonem'
      })
    ).toBeNull();
    expect(screen.queryByRole('button', { name: 'Usuń termometr tylko z aplikacji' })).toBeNull();
    expect(screen.queryByText(device.runtimeAddress)).toBeNull();
  });
"""
pos = unit.rfind('\n});\n')
if pos < 0:
    raise SystemExit('SensorSetupPresentation.test.tsx final describe close not found')
unit_path.write_text(unit[:pos] + insert + unit[pos:])

# App route composition test with a lightweight detail mock.
replace_once(
    'apps/mobile/src/__tests__/app-routes.test.tsx',
    "import { AppRoutes } from '../routes/AppRoutes.js';\n",
    "vi.mock('../screens/ThermometerDetailScreen.js', () => ({\n  ThermometerDetailScreen: ({\n    sensorId,\n    onBack\n  }: {\n    sensorId: string;\n    onBack: () => void;\n  }) => (\n    <section>\n      <p>{`mock-thermometer-${sensorId}`}</p>\n      <button type=\"button\" onClick={onBack}>\n        mock-thermometer-back\n      </button>\n    </section>\n  )\n}));\n\nimport { AppRoutes } from '../routes/AppRoutes.js';\n",
)
routes_test_path = repo / 'apps/mobile/src/__tests__/app-routes.test.tsx'
routes_test = routes_test_path.read_text()
routes_insert = """

  it('opens Thermometer settings as a nested Thermometers route', async () => {
    useHardwareSetupDraftStore.getState().upsertSensorDevice({
      id: 'A4:C1:38:4F:24:CD',
      name: 'Przedpokój',
      runtimeAddress: 'A4:C1:38:4F:24:CD',
      profileId: 'xiaomi_lywsd03mmc_bthome_v2'
    });

    renderRoutes();
    fireEvent.click(screen.getByRole('button', { name: 'Termometry', exact: true }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Ustawienia termometru Przedpokój' })
    );

    expect(await screen.findByText('mock-thermometer-A4:C1:38:4F:24:CD')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Termometry', exact: true })).toHaveAttribute(
      'aria-current',
      'page'
    );

    fireEvent.click(screen.getByRole('button', { name: 'mock-thermometer-back' }));
    expect(screen.getByRole('main', { name: 'Termometry' })).toBeVisible();
  });
"""
pos = routes_test.rfind('\n});\n')
if pos < 0:
    raise SystemExit('app-routes.test.tsx final describe close not found')
routes_test_path.write_text(routes_test[:pos] + routes_insert + routes_test[pos:])

# E2E: dashboard is simplified; technical actions live on a nested detail screen.
e2e_path = repo / 'apps/mobile/e2e/responsive.spec.ts'
e2e = e2e_path.read_text()
e2e_anchor = """    if (viewport.name === 'phone-large') {
      await expectVisualScreen(page, '12-thermometers-dashboard');
    }
    await page.getByRole('button', { name: 'Skanuj termometry BLE telefonem' }).click();
"""
e2e_replacement = """    if (viewport.name === 'phone-large') {
      await expectVisualScreen(page, '12-thermometers-dashboard');
    }
    const thermometerCard = page
      .getByRole('heading', { name: 'Przedpokój' })
      .locator('xpath=ancestor::article[1]');
    await expect(thermometerCard.getByText('A4:C1:38:4F:24:CD')).toHaveCount(0);
    await expect(
      thermometerCard.getByRole('button', { name: 'Usuń termometr tylko z aplikacji' })
    ).toHaveCount(0);
    await thermometerCard
      .getByRole('button', { name: 'Ustawienia termometru Przedpokój' })
      .click();
    await expect(page.getByRole('main', { name: 'Ustawienia termometru' })).toBeVisible();
    await expect(page.getByText('A4:C1:38:4F:24:CD')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Usuń termometr tylko z aplikacji' })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Termometry', exact: true })
    ).toHaveAttribute('aria-current', 'page');
    if (viewport.name === 'phone-large') {
      await expectVisualScreen(page, '22-thermometer-detail');
    }
    await page.getByRole('button', { name: 'Termometry', exact: true }).click();
    await expect(page.getByRole('main', { name: 'Termometry' })).toBeVisible();
    await page.getByRole('button', { name: 'Skanuj termometry BLE telefonem' }).click();
"""
if e2e.count(e2e_anchor) != 1:
    raise SystemExit(f'responsive Thermometers anchor count {e2e.count(e2e_anchor)}')
e2e_path.write_text(e2e.replace(e2e_anchor, e2e_replacement, 1))

# Keep the typed visual-contract list canonical, including the previously added Time Info screen.
replace_once(
    'apps/mobile/e2e/visual-contract.ts',
    "  '20-climate-button-mode-managed'\n] as const;\n",
    "  '20-climate-button-mode-managed',\n  '21-time-info',\n  '22-thermometer-detail'\n] as const;\n",
)

# Record the UX ownership decision.
replace_once(
    'docs/UX_VISUAL_CONTRACT.md',
    "   Installed Time and Climate Plug details expose the same saved-Plug forget action from Info; forgetting the saved Plug does not uninstall durable automation ownership.\n",
    "   Installed Time and Climate Plug details expose the same saved-Plug forget action from Info; forgetting the saved Plug does not uninstall durable automation ownership.\n   Thermometer dashboard cards prioritize identity, live readings and compact telemetry; rename, PVVX time sync, delete and technical identity stay on the nested Thermometer settings screen.\n",
)

print('Added nested Thermometer settings and simplified dashboard management affordances')
