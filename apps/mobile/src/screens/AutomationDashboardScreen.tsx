import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { calculateVpdKpa } from '@lcl/automation-core';
import { IconAlertTriangle, IconPlug } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { StandalonePulseAutomationCard } from '../app/StandalonePulseAutomationCard.js';
import { useTranslation } from '../app/i18n.js';
import type { AppNavigationKind } from '../components/AppBottomNavigation.js';
import { Pulse } from '../features/automations/index.js';
import {
  BleOnlyPlugDashboardCards,
  hasBleLocator,
  isSameShellyDevice,
  PlugAddSpeedDial,
  PlugAutomationModeControl,
  PlugDashboardCardShell,
  savedPlugToWifiDevice,
  useSavedPlugStore,
  type PlugAddTransport
} from '../features/plugs/index.js';
import { isDashboardRuntimeQuery } from '../features/dashboard/index.js';
import { type ShellyDraftDevice } from '../flows/hardware-setup/setupDraftStore.js';
import type {
  ClimateInstalledAutomation,
  InstalledAutomation
} from '../flows/installations/model.js';
import {
  formatInstallationMetric,
  formatInstallationVpd,
  installationHealthLabel,
  installationThresholdSummary
} from '../flows/installations/presentation.js';
import { installedAutomationHealth } from '../flows/installations/runtimeDiagnostics.js';
import { installedAutomationScriptMatch } from '../flows/installations/runtimeControl.js';
import { useInstalledAutomationStore } from '../flows/installations/store.js';
import {
  useInstalledAutomationActions,
  useInstalledAutomationControl,
  useInstalledAutomationDiagnostics
} from '../flows/installations/useInstalledAutomationRuntime.js';
import { usePlainShellyRuntime } from '../flows/hardware-setup/usePlainShellyRuntime.js';
import { useSensorSetupFlow } from '../flows/hardware-setup/usePhoneSensorFlow.js';
import { TimeAutomationCard } from './TimeAutomationCard.js';
import { SensorSetupPage } from './hardware-setup/pages/SensorSetupPage.js';
import './AutomationDashboardScreen.css';

type AutomationCardProps = {
  installation: InstalledAutomation;
  onOpen(installationId: string): void;
  onNameChange(installation: InstalledAutomation, value: string): void;
};

const CLIMATE_READING_PULSE_MS = 650;
const DASHBOARD_DIAGNOSTICS_REFRESH_MS = 5_000;

const ClimateAutomationCard = ({
  installation,
  onOpen,
  onNameChange
}: {
  installation: ClimateInstalledAutomation;
  onOpen(installationId: string): void;
  onNameChange(value: string): void;
}) => {
  const { t } = useTranslation();
  const query = useInstalledAutomationDiagnostics(installation, {
    refetchInterval: DASHBOARD_DIAGNOSTICS_REFRESH_MS
  });
  const control = useInstalledAutomationControl(installation);
  const action = useInstalledAutomationActions(installation);

  const snapshot = query.data;
  const lastSeenUptimeMs = snapshot?.diagnostics.lastSeenUptimeMs ?? null;
  const currentUptimeMs =
    snapshot?.time.uptimeSec != null && Number.isFinite(snapshot.time.uptimeSec)
      ? snapshot.time.uptimeSec * 1000
      : null;
  const previousReadingRef = useRef<{
    lastSeenUptimeMs: number;
    currentUptimeMs: number | null;
  } | null>(null);
  const readingPulseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isReadingPulseActive, setIsReadingPulseActive] = useState(false);
  const [readingPulseSequence, setReadingPulseSequence] = useState(0);

  useEffect(() => {
    if (lastSeenUptimeMs === null) return;

    const previousReading = previousReadingRef.current;
    previousReadingRef.current = { lastSeenUptimeMs, currentUptimeMs };
    if (previousReading === null) return;

    const runtimeRestarted =
      previousReading.currentUptimeMs !== null &&
      currentUptimeMs !== null &&
      currentUptimeMs < previousReading.currentUptimeMs;
    if (runtimeRestarted || lastSeenUptimeMs <= previousReading.lastSeenUptimeMs) return;

    setReadingPulseSequence((current) => current + 1);
    setIsReadingPulseActive(true);
    if (readingPulseTimeoutRef.current !== null) {
      clearTimeout(readingPulseTimeoutRef.current);
    }
    readingPulseTimeoutRef.current = setTimeout(() => {
      setIsReadingPulseActive(false);
      readingPulseTimeoutRef.current = null;
    }, CLIMATE_READING_PULSE_MS);
  }, [currentUptimeMs, lastSeenUptimeMs]);

  useEffect(
    () => () => {
      if (readingPulseTimeoutRef.current !== null) {
        clearTimeout(readingPulseTimeoutRef.current);
      }
    },
    []
  );
  const health = snapshot ? installedAutomationHealth(snapshot) : null;
  const controlStatus = control.data;
  const controlMatch = controlStatus
    ? installedAutomationScriptMatch(installation, controlStatus)
    : null;
  const controlsVerified = controlMatch === 'matched';
  const runtimeMode = controlStatus?.automationMode;
  const runtimeControllable =
    controlsVerified &&
    runtimeMode !== 'stopped' &&
    runtimeMode !== 'missing' &&
    controlStatus?.safetyLockout !== true;
  const automationRunning = controlsVerified && runtimeMode === 'auto';
  const manualControl = controlsVerified && runtimeMode === 'manual';
  const relayState =
    snapshot?.plug?.relayState ??
    controlStatus?.relayOn ??
    snapshot?.diagnostics.relayState;
  const pulseSnapshot = snapshot?.execution?.pulse;
  const pulseStatus = installation.config.execution?.pulse
    ? Pulse.Operational.normalizeStatus(
        pulseSnapshot
          ? {
              phase: pulseSnapshot.phase,
              cyclesCompleted: pulseSnapshot.cyclesCompleted,
              nextTransitionUptimeMs: pulseSnapshot.nextTransitionUptimeMs,
              lastReason:
                pulseSnapshot.lastReason ?? snapshot?.diagnostics.lastReason ?? null,
              requestedOutputOn:
                snapshot?.diagnostics.automationRequestedRelayState ?? null,
              finalOutputOn: relayState ?? null,
              automationFault:
                controlStatus?.automationFault ??
                snapshot?.diagnostics.automationFault ??
                null,
              hardSafety:
                controlStatus?.safetyLockout ??
                snapshot?.diagnostics.safetyLockout ??
                null,
              hardSafetyReason:
                controlStatus?.safetyReason ?? snapshot?.diagnostics.safetyReason ?? null,
              deviceUptimeMs: currentUptimeMs
            }
          : null
      )
    : null;
  const controlsHumidity = installation.config.rule.control.metric === 'humidity';
  const thresholdSummary = installationThresholdSummary(installation, t);
  const thresholdLines = controlsHumidity
    ? [thresholdSummary]
    : thresholdSummary.split(' · ');

  const primaryMetric = controlsHumidity
    ? {
        label: t('dashboard.humidity'),
        value: formatInstallationMetric(snapshot?.diagnostics.lastHumidity, '%')
      }
    : {
        label: t('dashboard.temperature'),
        value: formatInstallationMetric(snapshot?.diagnostics.lastTemp, '°C')
      };
  const secondaryMetric = controlsHumidity
    ? {
        label: t('dashboard.temperature'),
        value: formatInstallationMetric(snapshot?.diagnostics.lastTemp, '°C')
      }
    : {
        label: t('dashboard.humidity'),
        value: formatInstallationMetric(snapshot?.diagnostics.lastHumidity, '%')
      };
  const currentVpdKpa =
    snapshot?.diagnostics.lastVpd ??
    calculateVpdKpa(
      snapshot?.diagnostics.lastTemp ?? undefined,
      snapshot?.diagnostics.lastHumidity ?? undefined
    );
  const targetVpdKpa = installation.config.rule.vpdAssist.enabled
    ? installation.config.rule.vpdAssist.targetKpa
    : null;

  let warningLabel: string | null = null;
  let warningClass = 'attention';
  if (controlMatch !== null && controlMatch !== 'matched') {
    warningLabel = t('dashboard.health.attention');
  } else if (query.isError && control.isError) {
    warningLabel = t('dashboard.health.offline');
    warningClass = 'offline';
  } else if (health !== null && health !== 'ok') {
    warningLabel = installationHealthLabel(health, t);
    warningClass = health;
  } else if (control.isError || query.isError) {
    warningLabel = t('dashboard.health.attention');
  }

  const body = (
    <>
      <div className="automation-card__main" aria-label={t('dashboard.currentValues')}>
        <div className="automation-card__primary-metric">
          <strong aria-label={`${primaryMetric.label}: ${primaryMetric.value}`}>
            {primaryMetric.value}
          </strong>
          <small aria-label={`${t('dashboard.thresholds')}: ${thresholdSummary}`}>
            {thresholdLines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </small>
        </div>

        <div className="automation-card__secondary-metrics">
          <div>
            <strong aria-label={`${secondaryMetric.label}: ${secondaryMetric.value}`}>
              {secondaryMetric.value}
            </strong>
          </div>
          <div>
            <span>{t('dashboard.vpd')}</span>
            <strong>{formatInstallationVpd(currentVpdKpa, targetVpdKpa)}</strong>
          </div>
        </div>

        <PlugAutomationModeControl
          autoActive={automationRunning}
          manualActive={manualControl}
          disabled={action.isPending || !runtimeControllable}
          onAuto={() => {
            if (controlStatus?.automationMode !== 'auto') action.mutate('auto');
          }}
          onManual={() => {
            if (!manualControl) action.mutate('manual');
          }}
        />
      </div>
      {pulseStatus && <Pulse.Operational.StatusSummary status={pulseStatus} compact />}
    </>
  );

  const footer =
    warningLabel || action.isError ? (
      <footer className="automation-card__footer">
        {warningLabel && (
          <div
            className={`automation-card__status automation-card__status--${warningClass}`}
            role="status"
          >
            <IconAlertTriangle aria-hidden="true" />
            <span>{warningLabel}</span>
          </div>
        )}
        {action.isError && (
          <span className="automation-control-error" role="alert">
            {t('detail.actionFailed')}
          </span>
        )}
      </footer>
    ) : undefined;

  return (
    <PlugDashboardCardShell
      name={installation.shelly.name}
      relayState={relayState}
      busy={action.isPending}
      telemetry={{
        powerW: snapshot?.plug?.powerW,
        voltageV: snapshot?.plug?.voltageV,
        energyWh: snapshot?.plug?.energyWh,
        localTime: snapshot?.time.localTime
      }}
      body={body}
      className="automation-card automation-card--climate"
      detailContext="Wi-Fi"
      footer={footer}
      leadingIconFresh={isReadingPulseActive}
      leadingIconKey={readingPulseSequence}
      openDetailsOnCardClick={false}
      relayActionState={controlStatus?.manualRequestOn}
      relayControlsDisabled={!manualControl}
      onNameChange={onNameChange}
      onOpenDetails={() => onOpen(installation.id)}
      onTurnRelayOn={() => action.mutate('on')}
      onTurnRelayOff={() => action.mutate('off')}
    />
  );
};

const AutomationCard = ({ installation, onOpen, onNameChange }: AutomationCardProps) =>
  installation.kind === 'pulse' ? (
    <StandalonePulseAutomationCard
      installation={installation}
      onOpen={onOpen}
      onNameChange={(value) => onNameChange(installation, value)}
    />
  ) : installation.kind === 'time' ? (
    <TimeAutomationCard
      installation={installation}
      onOpen={onOpen}
      onNameChange={(value) => onNameChange(installation, value)}
    />
  ) : (
    <ClimateAutomationCard
      installation={installation}
      onOpen={onOpen}
      onNameChange={(value) => onNameChange(installation, value)}
    />
  );

const ThermometerDashboardSection = ({
  onAdd,
  onOpenInstallation,
  onOpenSensorSettings
}: {
  onAdd(): void;
  onOpenInstallation(installationId: string): void;
  onOpenSensorSettings?: (sensorId: string) => void;
}) => {
  const flow = useSensorSetupFlow();
  return (
    <SensorSetupPage
      flow={flow}
      primaryAddAction="phone-scan"
      embedded
      onAddRequest={onAdd}
      onOpenInstallation={onOpenInstallation}
      {...(onOpenSensorSettings ? { onOpenSensorSettings } : {})}
    />
  );
};

const PlainPlugCard = ({
  device,
  onAddAutomation,
  onOpenSettings,
  onNameChange
}: {
  device: ShellyDraftDevice;
  onAddAutomation(): void;
  onOpenSettings(): void;
  onNameChange(value: string): void;
}) => {
  const { status, isRelayPending, turnRelayOn, turnRelayOff } =
    usePlainShellyRuntime(device);

  return (
    <PlugDashboardCardShell
      name={device.name}
      relayState={status?.relayOn}
      busy={isRelayPending}
      telemetry={{
        powerW: status?.telemetry.powerW,
        voltageV: status?.telemetry.voltageV,
        energyWh: status?.telemetry.energyWh,
        localTime: status?.clock.localTime
      }}
      automationAction={{ disabled: false, onClick: onAddAutomation }}
      detailContext="Wi-Fi"
      onNameChange={onNameChange}
      onOpenDetails={onOpenSettings}
      onTurnRelayOn={turnRelayOn}
      onTurnRelayOff={turnRelayOff}
    />
  );
};

type AutomationDashboardScreenProps = {
  initialKind?: AppNavigationKind;
  onAddPlug(transport: PlugAddTransport): void;
  onAddThermometer(): void;
  onOpenThermometerSettings?: (sensorId: string) => void;
  onAddAutomation(kind: AppNavigationKind, shellyId?: string): void;
  onOpenInstallation(installationId: string): void;
  onOpenBlePlug(physicalId: string): void;
  onOpenPlugSettings(deviceId: string): void;
};

export const AutomationDashboardScreen = ({
  initialKind,
  onAddPlug,
  onAddThermometer,
  onOpenThermometerSettings,
  onAddAutomation,
  onOpenInstallation,
  onOpenBlePlug,
  onOpenPlugSettings
}: AutomationDashboardScreenProps) => {
  const { t } = useTranslation();
  const installations = useInstalledAutomationStore((state) => state.installations);
  const renameShellyDevice = useInstalledAutomationStore(
    (state) => state.renameShellyDevice
  );
  const savedPlugs = useSavedPlugStore((state) => state.plugs);
  const renameSavedPlug = useSavedPlugStore((state) => state.renamePlug);
  const shellyDevices = savedPlugs.flatMap((plug) => {
    const device = savedPlugToWifiDevice(plug);
    return device ? [device] : [];
  });
  const bleOnlyPlugs = savedPlugs.filter(
    (plug) =>
      hasBleLocator(plug) &&
      !plug.wifiBaseUrl &&
      !installations.some((installation) =>
        isSameShellyDevice(installation.shelly.deviceId, plug.physicalId)
      )
  );
  const queryClient = useQueryClient();
  const activeKind = initialKind ?? 'climate';
  useEffect(() => {
    if (Capacitor.getPlatform() === 'web') return;

    let active = true;
    let removeListener: (() => Promise<void>) | undefined;
    void CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        void queryClient.refetchQueries({ predicate: isDashboardRuntimeQuery });
      }
    }).then((handle) => {
      if (!active) {
        void handle.remove();
        return;
      }
      removeListener = () => handle.remove();
    });

    return () => {
      active = false;
      if (removeListener) void removeListener();
    };
  }, [queryClient]);

  const renameInstalledPlug = (installation: InstalledAutomation, value: string) => {
    renameShellyDevice(installation.shelly.deviceId, value);
    renameSavedPlug(installation.shelly.deviceId, value);
  };
  const matchedInstallationIds = new Set<string>();
  const plugEntries = shellyDevices.map((device) => {
    const installation =
      installations.find((candidate) =>
        isSameShellyDevice(candidate.shelly.deviceId, device.id)
      ) ?? null;
    if (installation) matchedInstallationIds.add(installation.id);
    return { device, installation };
  });
  const unmatchedInstallations = installations.filter(
    (installation) => !matchedInstallationIds.has(installation.id)
  );
  const hasPlugEntries =
    plugEntries.length > 0 ||
    unmatchedInstallations.length > 0 ||
    bleOnlyPlugs.length > 0;

  return (
    <main
      className="demo-shell dashboard-shell"
      aria-label={
        activeKind === 'climate' ? t('dashboard.climateTab') : t('dashboard.timeTab')
      }
    >
      <section className="dashboard-grid" aria-label={t('dashboard.systemsLabel')}>
        {activeKind === 'time' ? (
          <ThermometerDashboardSection
            onAdd={onAddThermometer}
            onOpenInstallation={onOpenInstallation}
            {...(onOpenThermometerSettings
              ? { onOpenSensorSettings: onOpenThermometerSettings }
              : {})}
          />
        ) : hasPlugEntries ? (
          <>
            {plugEntries.map(({ device, installation }) =>
              installation ? (
                <AutomationCard
                  key={installation.id}
                  installation={installation}
                  onOpen={onOpenInstallation}
                  onNameChange={renameInstalledPlug}
                />
              ) : (
                <PlainPlugCard
                  key={`plug:${device.id}`}
                  device={device}
                  onAddAutomation={() => onAddAutomation('climate', device.id)}
                  onOpenSettings={() => onOpenPlugSettings(device.id)}
                  onNameChange={(value) => renameSavedPlug(device.id, value)}
                />
              )
            )}
            {unmatchedInstallations.map((installation) => (
              <AutomationCard
                key={installation.id}
                installation={installation}
                onOpen={onOpenInstallation}
                onNameChange={renameInstalledPlug}
              />
            ))}
            <BleOnlyPlugDashboardCards
              plugs={bleOnlyPlugs}
              onNameChange={renameSavedPlug}
              onOpen={onOpenBlePlug}
            />
          </>
        ) : (
          <div className="dashboard-kind-empty" role="status">
            <IconPlug className="dashboard-kind-empty__icon" aria-hidden="true" />
            <strong>{t('hardware.shelly.empty')}</strong>
          </div>
        )}
      </section>

      {activeKind === 'climate' && <PlugAddSpeedDial onSelect={onAddPlug} />}
    </main>
  );
};
