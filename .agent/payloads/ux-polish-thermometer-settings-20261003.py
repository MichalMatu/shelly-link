from pathlib import Path
import re


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    source = file.read_text()
    count = source.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one exact match, got {count}")
    file.write_text(source.replace(old, new, 1))


def regex_replace_once(path: str, pattern: str, replacement: str) -> None:
    file = Path(path)
    source = file.read_text()
    updated, count = re.subn(pattern, replacement, source, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f"{path}: expected one regex match, got {count}")
    file.write_text(updated)


Path("apps/mobile/src/features/thermometers/components/SensorLiveReadings.tsx").write_text(r'''import type { Measurement } from '@lcl/ble-core';
import { IconBattery, IconClock, IconWifi } from '@tabler/icons-react';
import { useTranslation } from '../../../app/i18n.js';
import {
  formatBattery,
  formatSeenAt,
  formatSensorMetric,
  latestBatterySample,
  latestNumericSample,
  latestSample
} from '../presentation/savedSensorCardPresentation.js';

type SensorLiveReadingsProps = {
  samples: readonly Measurement[];
};

export const SensorLiveReadings = ({ samples }: SensorLiveReadingsProps) => {
  const { locale, t } = useTranslation();
  const temperatureSample = latestNumericSample(samples, 'temperatureC');
  const humiditySample = latestNumericSample(samples, 'humidityPct');
  const hasTemperatureData =
    typeof temperatureSample?.temperatureC === 'number' &&
    Number.isFinite(temperatureSample.temperatureC);
  const hasHumidityData =
    typeof humiditySample?.humidityPct === 'number' &&
    Number.isFinite(humiditySample.humidityPct);
  const latest = latestSample(samples);
  const batterySample = latestBatterySample(samples);
  const rssiSample = latestNumericSample(samples, 'rssi');

  return (
    <>
      <div className="sensor-metric-grid">
        <div
          className={
            hasTemperatureData
              ? 'sensor-data-metric-card'
              : 'sensor-data-metric-card sensor-data-metric-card--empty'
          }
        >
          <span className="sensor-data-metric-card__label">
            {t('hardware.metrics.temperature')}
          </span>
          <strong
            className={
              hasTemperatureData
                ? 'sensor-data-metric-card__value'
                : 'sensor-data-metric-card__value sensor-data-metric-card__value--empty'
            }
          >
            {formatSensorMetric(temperatureSample?.temperatureC, '°C', 1, '— °C')}
          </strong>
        </div>
        <div
          className={
            hasHumidityData
              ? 'sensor-data-metric-card'
              : 'sensor-data-metric-card sensor-data-metric-card--empty'
          }
        >
          <span className="sensor-data-metric-card__label">
            {t('hardware.metrics.humidity')}
          </span>
          <strong
            className={
              hasHumidityData
                ? 'sensor-data-metric-card__value'
                : 'sensor-data-metric-card__value sensor-data-metric-card__value--empty'
            }
          >
            {formatSensorMetric(humiditySample?.humidityPct, '%', 1, '— %')}
          </strong>
        </div>
      </div>

      <div className="sensor-status-strip">
        <span
          className="sensor-status-strip__item"
          aria-label={`${t('hardware.metrics.battery')}: ${formatBattery(
            batterySample,
            '—'
          )}`}
          title={t('hardware.metrics.battery')}
        >
          <IconBattery aria-hidden="true" />
          <strong>{formatBattery(batterySample, '—')}</strong>
        </span>
        <span
          className="sensor-status-strip__item"
          aria-label={`${t('common.rssi')}: ${formatSensorMetric(
            rssiSample?.rssi,
            ' dBm',
            0,
            '—'
          )}`}
          title={t('common.rssi')}
        >
          <IconWifi aria-hidden="true" />
          <strong>{formatSensorMetric(rssiSample?.rssi, ' dBm', 0, '—')}</strong>
        </span>
        <span
          className="sensor-status-strip__item"
          aria-label={`${t('hardware.metrics.lastMeasurement')}: ${formatSeenAt(
            latest,
            locale,
            '—'
          )}`}
          title={t('hardware.metrics.lastMeasurement')}
        >
          <IconClock aria-hidden="true" />
          <strong>{formatSeenAt(latest, locale, '—')}</strong>
        </span>
      </div>
    </>
  );
};
''')

Path("apps/mobile/src/features/thermometers/components/ThermometerSettingsPage.tsx").write_text(r'''import type { Measurement } from '@lcl/ble-core';
import { IconClock, IconTrash } from '@tabler/icons-react';
import { useTranslation } from '../../../app/i18n.js';
import type { SavedSensorCardDevice } from '../presentation/savedSensorCardPresentation.js';
import { sensorProfileDisplayLabels } from '../presentation/savedSensorCardPresentation.js';
import { SensorLiveReadings } from './SensorLiveReadings.js';
import './ThermometerSettingsPage.css';

type ThermometerSettingsPageProps = {
  device: SavedSensorCardDevice;
  samples: readonly Measurement[];
  pvvxTimePending: boolean;
  onNameChange(value: string): void;
  onPvvxSetTime(): void;
  onRemove(): void;
};

export const ThermometerSettingsPage = ({
  device,
  samples,
  pvvxTimePending,
  onNameChange,
  onPvvxSetTime,
  onRemove
}: ThermometerSettingsPageProps) => {
  const { t } = useTranslation();

  return (
    <div className="thermometer-settings">
      <section
        className="thermometer-settings__section"
        aria-labelledby="thermometer-settings-identity"
      >
        <header className="thermometer-settings__section-header">
          <h2 id="thermometer-settings-identity">
            {t('hardware.sensor.identitySection')}
          </h2>
          <strong>{device.name}</strong>
        </header>

        <label className="thermometer-settings__name-field">
          <span>{t('hardware.sensor.nameLabel')}</span>
          <input
            type="text"
            value={device.name}
            onChange={(event) => onNameChange(event.currentTarget.value)}
          />
        </label>

        <dl className="thermometer-settings__identity-list">
          <div>
            <dt>{t('hardware.sensor.typeLabel')}</dt>
            <dd>{sensorProfileDisplayLabels[device.profileId]}</dd>
          </div>
          <div>
            <dt>{t('hardware.sensor.macLabel')}</dt>
            <dd>{device.runtimeAddress}</dd>
          </div>
        </dl>
      </section>

      <section
        className="thermometer-settings__section"
        aria-labelledby="thermometer-settings-live"
      >
        <header className="thermometer-settings__section-header">
          <h2 id="thermometer-settings-live">
            {t('hardware.sensor.liveReadingsSection')}
          </h2>
        </header>
        <SensorLiveReadings samples={samples} />
      </section>

      <section
        className="thermometer-settings__section"
        aria-labelledby="thermometer-settings-actions"
      >
        <header className="thermometer-settings__section-header">
          <h2 id="thermometer-settings-actions">
            {t('hardware.sensor.deviceActionsSection')}
          </h2>
        </header>
        <div className="thermometer-settings__actions">
          {device.profileId === 'xiaomi_lywsd03mmc_bthome_v2' && (
            <button
              className="secondary-action thermometer-settings__action"
              type="button"
              disabled={pvvxTimePending}
              aria-busy={pvvxTimePending || undefined}
              onClick={onPvvxSetTime}
            >
              <IconClock aria-hidden="true" />
              <span>{t('hardware.sensor.pvvxSetTime')}</span>
            </button>
          )}
          <button
            className="secondary-action thermometer-settings__action thermometer-settings__action--danger"
            type="button"
            onClick={onRemove}
          >
            <IconTrash aria-hidden="true" />
            <span>{t('hardware.sensor.deleteTitle')}</span>
          </button>
        </div>
      </section>
    </div>
  );
};
''')

Path("apps/mobile/src/features/thermometers/components/ThermometerSettingsPage.css").write_text(r'''.thermometer-settings {
  display: grid;
  gap: var(--lcl-spacing-md);
}

.thermometer-settings__section {
  background: var(--lcl-color-surface);
  border: var(--lcl-border-width-sm) solid var(--lcl-color-border);
  border-radius: var(--lcl-radius-lg);
  display: grid;
  gap: var(--lcl-spacing-md);
  min-width: 0;
  padding: var(--lcl-spacing-md);
}

.thermometer-settings__section-header {
  display: grid;
  gap: var(--lcl-spacing-xs);
}

.thermometer-settings__section-header h2 {
  color: var(--lcl-color-text-muted);
  font-size: var(--lcl-font-size-xs);
  font-weight: var(--lcl-font-weight-semibold);
  line-height: var(--lcl-line-height-compact);
  margin: 0;
  text-transform: uppercase;
}

.thermometer-settings__section-header strong {
  font-size: var(--lcl-font-size-xl);
  line-height: var(--lcl-line-height-tight);
  overflow-wrap: anywhere;
}

.thermometer-settings__name-field {
  display: grid;
  gap: var(--lcl-spacing-xs);
}

.thermometer-settings__name-field > span,
.thermometer-settings__identity-list dt {
  color: var(--lcl-color-text-muted);
  font-size: var(--lcl-font-size-xs);
  font-weight: var(--lcl-font-weight-semibold);
  line-height: var(--lcl-line-height-compact);
}

.thermometer-settings__name-field input {
  min-width: 0;
  width: 100%;
}

.thermometer-settings__identity-list {
  display: grid;
  gap: var(--lcl-spacing-sm);
  margin: 0;
}

.thermometer-settings__identity-list > div {
  align-items: baseline;
  border-top: var(--lcl-border-width-sm) solid var(--lcl-color-border);
  display: grid;
  gap: var(--lcl-spacing-sm);
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr);
  padding-top: var(--lcl-spacing-sm);
}

.thermometer-settings__identity-list dd {
  font-size: var(--lcl-font-size-sm);
  font-weight: var(--lcl-font-weight-bold);
  line-height: var(--lcl-line-height-compact);
  margin: 0;
  overflow-wrap: anywhere;
  text-align: right;
}

.thermometer-settings__actions {
  display: grid;
  gap: var(--lcl-spacing-sm);
}

.thermometer-settings__action {
  align-items: center;
  display: flex;
  gap: var(--lcl-spacing-sm);
  justify-content: center;
  width: 100%;
}

.thermometer-settings__action svg {
  height: var(--lcl-size-control-icon-size);
  width: var(--lcl-size-control-icon-size);
}

.thermometer-settings__action--danger {
  border-color: var(--lcl-color-status-danger-border);
  color: var(--lcl-color-status-danger-text);
}

.thermometer-settings__action--danger:hover,
.thermometer-settings__action--danger:focus-visible {
  border-color: var(--lcl-color-status-danger-border);
  color: var(--lcl-color-status-danger-text);
}

@media (min-width: 44rem) {
  .thermometer-settings__identity-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .thermometer-settings__actions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
''')

# Reuse one live-reading component on the dashboard and nested settings surface.
replace_once(
    "apps/mobile/src/features/thermometers/components/SavedSensorCard.tsx",
    "  IconBattery,\n  IconClock,\n  IconDeviceMobile,\n  IconDotsVertical,\n  IconPencil,\n  IconPlug,\n  IconTemperature,\n  IconTrash,\n  IconWifi\n",
    "  IconClock,\n  IconDeviceMobile,\n  IconDotsVertical,\n  IconPencil,\n  IconPlug,\n  IconTemperature,\n  IconTrash\n",
)
replace_once(
    "apps/mobile/src/features/thermometers/components/SavedSensorCard.tsx",
    "  formatBattery,\n  formatSeenAt,\n  formatSensorMetric,\n  latestBatterySample,\n  latestNumericSample,\n  latestSample,\n",
    "  latestSample,\n",
)
replace_once(
    "apps/mobile/src/features/thermometers/components/SavedSensorCard.tsx",
    "} from '../presentation/savedSensorCardPresentation.js';\n",
    "} from '../presentation/savedSensorCardPresentation.js';\nimport { SensorLiveReadings } from './SensorLiveReadings.js';\n",
)
regex_replace_once(
    "apps/mobile/src/features/thermometers/components/SavedSensorCard.tsx",
    r"  const \{ locale, t \} = useTranslation\(\);\n  const temperatureSample = latestNumericSample\(samples, 'temperatureC'\);.*?  const rssiSample = latestNumericSample\(samples, 'rssi'\);\n",
    "  const { t } = useTranslation();\n",
)
regex_replace_once(
    "apps/mobile/src/features/thermometers/components/SavedSensorCard.tsx",
    r"\n      <div className=\"sensor-metric-grid\">.*?\n      \{!onOpenDetails && \(",
    "\n      <SensorLiveReadings samples={samples} />\n\n      {!onOpenDetails && (",
)

replace_once(
    "apps/mobile/src/features/thermometers/index.ts",
    "export { SavedSensorList } from './components/SavedSensorList.js';\n",
    "export { SavedSensorList } from './components/SavedSensorList.js';\nexport { ThermometerSettingsPage } from './components/ThermometerSettingsPage.js';\n",
)

# Dedicated settings composition while preserving the existing flow, dialogs and device actions.
replace_once(
    "apps/mobile/src/screens/hardware-setup/pages/SensorSetupPage.tsx",
    "  SavedSensorList,\n  SensorRemovalBlockedModal,\n",
    "  SavedSensorList,\n  SensorRemovalBlockedModal,\n  ThermometerSettingsPage,\n",
)
replace_once(
    "apps/mobile/src/screens/hardware-setup/pages/SensorSetupPage.tsx",
    "  hideAddAction?: boolean;\n  onSensorRemoved?: () => void;\n",
    "  hideAddAction?: boolean;\n  settingsOnly?: boolean;\n  onSensorRemoved?: () => void;\n",
)
replace_once(
    "apps/mobile/src/screens/hardware-setup/pages/SensorSetupPage.tsx",
    "  hideAddAction = false,\n  onSensorRemoved\n",
    "  hideAddAction = false,\n  settingsOnly = false,\n  onSensorRemoved\n",
)
settings_branch = r'''
  if (settingsOnly) {
    const device = flow.sensorDevices[0] ?? null;
    return (
      <section
        className="thermometer-settings-route"
        aria-label={t('hardware.sensor.settingsTitle')}
      >
        <SensorRemovalBlockedModal
          deviceName={blockedSensorRemoval?.device.name ?? null}
          usage={blockedSensorRemoval?.usage ?? null}
          onClose={() => setDialog({ kind: 'none' })}
          {...(onOpenInstallation
            ? {
                onOpenAutomation: (installationId: string) => {
                  setDialog({ kind: 'none' });
                  onOpenInstallation(installationId);
                }
              }
            : {})}
        />
        <SensorRemovalConfirmModal
          deviceName={sensorPendingRemoval?.name ?? null}
          onClose={() => setDialog({ kind: 'none' })}
          onConfirm={confirmRemoveSensor}
        />
        <AppToastViewport
          dismissLabel={t('toast.dismiss')}
          label={t('toast.regionLabel')}
          toasts={toasts}
          onDismiss={dismissToast}
        />
        {device ? (
          <ThermometerSettingsPage
            device={device}
            samples={flow.sensorSamplesById[device.id.toUpperCase()] ?? []}
            pvvxTimePending={flow.setPvvxTimeMutation.isPending}
            onNameChange={(value) => flow.setSensorDeviceName(device.id, value)}
            onPvvxSetTime={() => flow.setPvvxTimeMutation.mutate(device)}
            onRemove={() => requestRemoveSensor(device)}
          />
        ) : (
          <p>{t('hardware.sensor.empty')}</p>
        )}
      </section>
    );
  }

'''
replace_once(
    "apps/mobile/src/screens/hardware-setup/pages/SensorSetupPage.tsx",
    "  return (\n    <section\n      className={\n        embedded\n",
    settings_branch + "  return (\n    <section\n      className={\n        embedded\n",
)

replace_once(
    "apps/mobile/src/screens/hardware-setup/HardwareSetupScreen.tsx",
    "        <SensorSetupPage\n          flow={sensorSettingsFlow}\n          hideAddAction\n",
    "        <SensorSetupPage\n          flow={sensorSettingsFlow}\n          hideAddAction\n          settingsOnly\n",
)

# The route callback already exists; wire it through the dashboard instead of dropping it.
replace_once(
    "apps/mobile/src/screens/AutomationDashboardScreen.tsx",
    "const ThermometerDashboardSection = ({\n  onAdd,\n  onOpenInstallation\n}: {\n  onAdd(): void;\n  onOpenInstallation(installationId: string): void;\n}) => {\n",
    "const ThermometerDashboardSection = ({\n  onAdd,\n  onOpenInstallation,\n  onOpenSensorSettings\n}: {\n  onAdd(): void;\n  onOpenInstallation(installationId: string): void;\n  onOpenSensorSettings?: (sensorId: string) => void;\n}) => {\n",
)
replace_once(
    "apps/mobile/src/screens/AutomationDashboardScreen.tsx",
    "      onAddRequest={onAdd}\n      onOpenInstallation={onOpenInstallation}\n",
    "      onAddRequest={onAdd}\n      onOpenInstallation={onOpenInstallation}\n      {...(onOpenSensorSettings ? { onOpenSensorSettings } : {})}\n",
)
replace_once(
    "apps/mobile/src/screens/AutomationDashboardScreen.tsx",
    "  onAddPlug,\n  onAddThermometer,\n  onAddAutomation,\n",
    "  onAddPlug,\n  onAddThermometer,\n  onOpenThermometerSettings,\n  onAddAutomation,\n",
)
replace_once(
    "apps/mobile/src/screens/AutomationDashboardScreen.tsx",
    "          <ThermometerDashboardSection\n            onAdd={onAddThermometer}\n            onOpenInstallation={onOpenInstallation}\n          />\n",
    "          <ThermometerDashboardSection\n            onAdd={onAddThermometer}\n            onOpenInstallation={onOpenInstallation}\n            {...(onOpenThermometerSettings\n              ? { onOpenSensorSettings: onOpenThermometerSettings }\n              : {})}\n          />\n",
)

# i18n section labels.
translations = {
    "en.ts": ("Identity", "Live readings", "Device actions"),
    "pl.ts": ("Tożsamość", "Odczyty na żywo", "Akcje urządzenia"),
    "de.ts": ("Identität", "Live-Messwerte", "Geräteaktionen"),
    "es.ts": ("Identidad", "Lecturas en vivo", "Acciones del dispositivo"),
    "fr.ts": ("Identité", "Mesures en direct", "Actions de l’appareil"),
    "it.ts": ("Identità", "Letture in tempo reale", "Azioni del dispositivo"),
    "ptBr.ts": ("Identidade", "Leituras ao vivo", "Ações do dispositivo"),
}
for filename, (identity, live, actions) in translations.items():
    path = Path("apps/mobile/src/app/locales") / filename
    source = path.read_text()
    pattern = r"(      settingsTitle: '[^']*',\n)(      noBleFound:)"
    replacement = (
        rf"\1      identitySection: '{identity}',\n"
        rf"      liveReadingsSection: '{live}',\n"
        rf"      deviceActionsSection: '{actions}',\n\2"
    )
    updated, count = re.subn(pattern, replacement, source, count=1)
    if count != 1:
        raise SystemExit(f"{path}: could not add sensor section translations")
    path.write_text(updated)

# Route-level behavior: dashboard summary only, nested management page.
regex_replace_once(
    "apps/mobile/src/__tests__/app-routes.test.tsx",
    r"  it\('keeps Thermometer management on the dashboard with a direct delete action', async \(\) => \{.*?\n  \}\);\n\}\);",
    r'''  it('opens nested Thermometer settings from a dashboard summary card', async () => {
    useHardwareSetupDraftStore.getState().upsertSensorDevice({
      id: 'A4:C1:38:4F:24:CD',
      name: 'Przedpokój',
      runtimeAddress: 'A4:C1:38:4F:24:CD',
      profileId: 'xiaomi_lywsd03mmc_bthome_v2'
    });

    renderRoutes();
    fireEvent.click(screen.getByRole('button', { name: 'Termometry' }));

    const card = screen.getByRole('heading', { name: 'Przedpokój' }).closest('article');
    expect(card).not.toBeNull();
    expect(
      within(card as HTMLElement).getByRole('button', {
        name: 'Ustawienia termometru Przedpokój'
      })
    ).toBeVisible();
    expect(
      within(card as HTMLElement).queryByRole('button', {
        name: 'Usuń termometr tylko z aplikacji'
      })
    ).toBeNull();
    expect(within(card as HTMLElement).queryByText('A4:C1:38:4F:24:CD')).toBeNull();

    fireEvent.click(
      within(card as HTMLElement).getByRole('button', {
        name: 'Ustawienia termometru Przedpokój'
      })
    );
    expect(await screen.findByText('mock-sensor-settings-A4:C1:38:4F:24:CD')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Termometry' })).toHaveAttribute(
      'aria-current',
      'page'
    );
  });
});''',
)

# Canonical responsive flow now reviews both the compact dashboard card and nested settings page.
replace_once(
    "apps/mobile/e2e/responsive.spec.ts",
    "    await expect(thermometerCard.getByText('A4:C1:38:4F:24:CD')).toBeVisible();\n    await expect(\n      thermometerCard.getByRole('button', { name: 'Usuń termometr tylko z aplikacji' })\n    ).toBeVisible();\n    await page.getByRole('button', { name: 'Skanuj termometry BLE telefonem' }).click();\n",
    "    await expect(thermometerCard.getByText('A4:C1:38:4F:24:CD')).toHaveCount(0);\n    await expect(\n      thermometerCard.getByRole('button', { name: 'Usuń termometr tylko z aplikacji' })\n    ).toHaveCount(0);\n    const thermometerSettings = thermometerCard.getByRole('button', {\n      name: 'Ustawienia termometru Przedpokój'\n    });\n    await expect(thermometerSettings).toBeVisible();\n    await thermometerSettings.click();\n    await expect(\n      page.getByRole('heading', { name: 'Ustawienia termometru' })\n    ).toBeVisible();\n    await expect(page.getByRole('heading', { name: 'Tożsamość' })).toBeVisible();\n    await expect(page.getByLabel('Nazwa termometru')).toHaveValue('Przedpokój');\n    await expect(page.getByText('A4:C1:38:4F:24:CD')).toBeVisible();\n    await expect(page.getByRole('heading', { name: 'Odczyty na żywo' })).toBeVisible();\n    await expect(page.getByRole('heading', { name: 'Akcje urządzenia' })).toBeVisible();\n    await expect(page.getByRole('button', { name: 'Ustaw czas' })).toBeVisible();\n    await expect(\n      page.getByRole('button', { name: 'Usuń termometr tylko z aplikacji' })\n    ).toBeVisible();\n    await expectNoHorizontalOverflow(page);\n    if (viewport.name === 'phone-large') {\n      await expectVisualScreen(page, '28-thermometer-settings');\n    }\n    await page.getByRole('button', { name: 'Termometry', exact: true }).click();\n    await page.getByRole('button', { name: 'Skanuj termometry BLE telefonem' }).click();\n",
)

replace_once(
    "apps/mobile/e2e/visual-contract.ts",
    "  '26-standalone-pulse-setup',\n  '27-standalone-pulse-dashboard'\n",
    "  '26-standalone-pulse-setup',\n  '27-standalone-pulse-dashboard',\n  '28-thermometer-settings'\n",
)

replace_once(
    "docs/UX_VISUAL_CONTRACT.md",
    "Dashboard cards prioritize identity, live readings and compact telemetry. Rename, PVVX time sync, delete and technical identity belong in nested Thermometer settings, not as a cluster of permanent dashboard actions.\n",
    "Dashboard cards prioritize identity, live readings and compact telemetry. Rename, PVVX time sync, delete and technical identity belong in nested Thermometer settings, not as a cluster of permanent dashboard actions. The nested page groups Identity, Live readings and Device actions; its canonical state is `28-thermometer-settings`.\n",
)

replace_once(
    "scripts/quality/ux-gate.mjs",
    "  'apps/mobile/src/features/automations/components/ClimateHistoryChart.css',\n  'apps/mobile/src/features/plugs/components/PlugDetailTabs.css',\n",
    "  'apps/mobile/src/features/automations/components/ClimateHistoryChart.css',\n  'apps/mobile/src/features/thermometers/components/ThermometerSettingsPage.css',\n  'apps/mobile/src/features/plugs/components/PlugDetailTabs.css',\n",
)
