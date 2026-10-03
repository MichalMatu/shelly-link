import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode
} from 'react';
import { AppSettingsScreen } from '../app/AppSettingsScreen.js';
import { useTranslation } from '../app/i18n.js';
import { AppShell } from '../components/AppShell.js';
import type { AppNavigationKind } from '../components/AppBottomNavigation.js';
import { useInstalledAutomationStore } from '../features/automations/index.js';
import { SensorRemovedToast } from '../features/thermometers/index.js';
import {
  BlePlugDetailScreen,
  PlugBluetoothAddPage,
  isSameShellyDevice,
  savedPlugToWifiDevice,
  useSavedPlugStore,
  WifiPlugDetailScreen
} from '../features/plugs/index.js';
import { useHardwareSetupDraftStore } from '../flows/hardware-setup/setupDraftStore.js';
import { activeNavigationForRoute, type AppRoute } from './appRouteModel.js';
import type { SetupIntent } from '../flows/setup-intent.js';
import { AutomationDashboardScreen } from '../screens/AutomationDashboardScreen.js';
import { InstallationDetailScreen } from '../screens/InstallationDetailScreen.js';
import { PlugBleDiscoveryScreen } from '../screens/PlugBleDiscoveryScreen.js';
import { SetupIntentScreen } from '../screens/SetupIntentScreen.js';
import { useRemovalNavigation } from './useRemovalNavigation.js';

const HardwareSetupScreen = lazy(async () => {
  const module = await import('../screens/hardware-setup/HardwareSetupScreen.js');
  return { default: module.HardwareSetupScreen };
});

const RouteFallback = () => {
  const { t } = useTranslation();
  return (
    <main className="demo-shell hardware-shell">
      <section className="demo-panel">
        <p role="status">{t('app.loadingConfigurator')}</p>
      </section>
    </main>
  );
};

const resolveAndroidBackRoute = (route: AppRoute): AppRoute | null => {
  if (route.type === 'settings') return route.returnTo;
  if (route.type === 'installation') return { type: 'dashboard', kind: route.kind };
  if (route.type === 'device-add') return route.returnTo;
  if (route.type === 'sensor-settings') return { type: 'dashboard', kind: 'time' };
  if (route.type === 'plug-ble-discovery') return route.returnTo;
  if (route.type === 'plug-settings' || route.type === 'ble-plug-detail') {
    return { type: 'dashboard', kind: 'climate' };
  }
  if (route.type === 'setup') {
    return {
      type: 'intent',
      sourceKind: route.sourceKind,
      ...(route.shellyId ? { shellyId: route.shellyId } : {})
    };
  }
  if (route.type === 'intent') return { type: 'dashboard', kind: route.sourceKind };
  return null;
};

export const AppRoutes = () => {
  const selectShellyDevice = useHardwareSetupDraftStore(
    (state) => state.selectShellyDevice
  );
  const savedPlugs = useSavedPlugStore((state) => state.plugs);
  const installations = useInstalledAutomationStore((state) => state.installations);
  const removeShellyDevice = useSavedPlugStore((state) => state.removePlug);
  const [route, setRoute] = useState<AppRoute>({ type: 'dashboard' });
  const [sensorRemovalToastVisible, setSensorRemovalToastVisible] = useState(false);
  const routeRef = useRef(route);
  const navigate = useCallback((nextRoute: AppRoute) => {
    routeRef.current = nextRoute;
    setRoute(nextRoute);
  }, []);
  const { removalBlockFor, openInstalledAutomation } = useRemovalNavigation(navigate);
  const openSettings = useCallback(() => {
    const current = routeRef.current;
    if (current.type === 'settings') return;
    navigate({ type: 'settings', returnTo: current });
  }, [navigate]);

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return;

    let active = true;
    let removeListener: (() => Promise<void>) | undefined;
    void App.addListener('backButton', () => {
      const nextRoute = resolveAndroidBackRoute(routeRef.current);
      if (nextRoute === null) {
        void App.exitApp();
        return;
      }
      navigate(nextRoute);
    }).then((handle) => {
      if (!active) {
        void handle.remove();
        return;
      }
      removeListener = () => handle.remove();
    });

    return () => {
      active = false;
      if (removeListener !== undefined) void removeListener();
    };
  }, [navigate]);

  const selectIntent = (
    intent: SetupIntent,
    sourceKind: AppNavigationKind,
    shellyId?: string
  ) => {
    if (shellyId) selectShellyDevice(shellyId);
    navigate({
      type: 'setup',
      intent,
      sourceKind,
      ...(shellyId ? { shellyId } : {})
    });
  };

  let content: ReactNode;

  if (route.type === 'settings') {
    content = <AppSettingsScreen />;
  } else if (route.type === 'intent') {
    content = (
      <SetupIntentScreen
        onSelect={(intent) => selectIntent(intent, route.sourceKind, route.shellyId)}
      />
    );
  } else if (route.type === 'dashboard') {
    const dashboardKind = route.kind ?? 'climate';
    content = (
      <AutomationDashboardScreen
        {...(route.kind ? { initialKind: route.kind } : {})}
        onAddPlug={(plugTransport) =>
          navigate({
            type: 'device-add',
            device: 'plug',
            plugTransport,
            sourceKind: 'climate',
            returnTo: { type: 'dashboard', kind: 'climate' }
          })
        }
        onAddThermometer={() =>
          navigate({
            type: 'device-add',
            device: 'sensor',
            sourceKind: 'time',
            returnTo: { type: 'dashboard', kind: 'time' },
            sensorMode: 'phone-scan'
          })
        }
        onOpenThermometerSettings={(sensorId) =>
          navigate({ type: 'sensor-settings', sensorId })
        }
        onAddAutomation={(kind, shellyId) => {
          if (shellyId) selectShellyDevice(shellyId);
          if (kind === 'time') {
            navigate({ type: 'setup', intent: 'time', sourceKind: dashboardKind });
            return;
          }
          navigate({
            type: 'intent',
            sourceKind: dashboardKind,
            ...(shellyId ? { shellyId } : {})
          });
        }}
        onOpenInstallation={(installationId) =>
          navigate({
            type: 'installation',
            installationId,
            kind: 'climate'
          })
        }
        onOpenBlePlug={(physicalId) => navigate({ type: 'ble-plug-detail', physicalId })}
        onOpenPlugSettings={(deviceId) => navigate({ type: 'plug-settings', deviceId })}
      />
    );
  } else if (route.type === 'sensor-settings') {
    content = (
      <Suspense fallback={<RouteFallback />}>
        <HardwareSetupScreen
          sensorSettingsOnlyId={route.sensorId}
          onOpenSensorAutomation={openInstalledAutomation}
          onSensorSettingsRemoved={() => {
            setSensorRemovalToastVisible(true);
            navigate({ type: 'dashboard', kind: 'time' });
          }}
        />
      </Suspense>
    );
  } else if (route.type === 'ble-plug-detail') {
    const removalBlock = removalBlockFor(route.physicalId);
    content = (
      <BlePlugDetailScreen
        physicalId={route.physicalId}
        onBack={() => navigate({ type: 'dashboard', kind: 'climate' })}
        onRemove={removeShellyDevice}
        {...(removalBlock
          ? { removalBlock, onOpenBlockingAutomation: openInstalledAutomation }
          : {})}
      />
    );
  } else if (route.type === 'plug-settings') {
    const savedPlug =
      savedPlugs.find((candidate) => candidate.physicalId === route.deviceId) ?? null;
    const wifiDevice = savedPlug ? savedPlugToWifiDevice(savedPlug) : null;
    const buttonModeLocked = wifiDevice
      ? installations.some(
          (installation) =>
            installation.kind === 'climate' &&
            isSameShellyDevice(installation.shelly.deviceId, wifiDevice.id)
        )
      : false;
    content = (
      <WifiPlugDetailScreen
        device={
          wifiDevice
            ? {
                deviceId: wifiDevice.id,
                name: wifiDevice.name,
                baseUrl: wifiDevice.baseUrl,
                ...(wifiDevice.model ? { model: wifiDevice.model } : {})
              }
            : null
        }
        buttonModeLocked={buttonModeLocked}
        onAddAutomation={() => {
          if (!wifiDevice) return;
          selectShellyDevice(wifiDevice.id);
          navigate({ type: 'intent', sourceKind: 'climate', shellyId: wifiDevice.id });
        }}
        onBack={() => navigate({ type: 'dashboard', kind: 'climate' })}
        onOpenBleDiscovery={(deviceId) =>
          navigate({
            type: 'plug-ble-discovery',
            deviceId,
            returnTo: { type: 'plug-settings', deviceId }
          })
        }
        onRemove={removeShellyDevice}
        {...(wifiDevice
          ? (() => {
              const removalBlock = removalBlockFor(wifiDevice.id);
              return removalBlock
                ? { removalBlock, onOpenBlockingAutomation: openInstalledAutomation }
                : {};
            })()
          : {})}
      />
    );
  } else if (route.type === 'plug-ble-discovery') {
    content = (
      <PlugBleDiscoveryScreen
        deviceId={route.deviceId}
        onBack={() => navigate(route.returnTo)}
      />
    );
  } else if (route.type === 'device-add') {
    content =
      route.device === 'plug' && route.plugTransport === 'bluetooth' ? (
        <PlugBluetoothAddPage />
      ) : (
        <Suspense fallback={<RouteFallback />}>
          <HardwareSetupScreen
            {...(route.device === 'plug'
              ? { plugAddOnly: true }
              : { sensorAddOnly: true, sensorAddMode: route.sensorMode ?? 'manual' })}
          />
        </Suspense>
      );
  } else if (route.type === 'installation') {
    content = (
      <InstallationDetailScreen
        installationId={route.installationId}
        onBack={() => navigate({ type: 'dashboard', kind: route.kind })}
        onOpenBleDiscovery={(deviceId) =>
          navigate({
            type: 'plug-ble-discovery',
            deviceId,
            returnTo: route
          })
        }
      />
    );
  } else {
    const openDeviceAdd = (
      device: 'plug' | 'sensor',
      sensorMode?: 'manual' | 'phone-scan'
    ) =>
      navigate({
        type: 'device-add',
        device,
        sourceKind: route.sourceKind,
        returnTo: route,
        ...(sensorMode ? { sensorMode } : {})
      });
    content = (
      <Suspense fallback={<RouteFallback />}>
        <HardwareSetupScreen
          setupIntent={route.intent}
          {...(route.shellyId ? { fixedShellyId: route.shellyId } : {})}
          onBackToIntent={() =>
            navigate({
              type: 'intent',
              sourceKind: route.sourceKind,
              ...(route.shellyId ? { shellyId: route.shellyId } : {})
            })
          }
          onOpenPlugAdd={() => openDeviceAdd('plug')}
          onOpenSensorAdd={(mode) => openDeviceAdd('sensor', mode)}
          onSetupComplete={() => navigate({ type: 'dashboard', kind: route.sourceKind })}
        />
      </Suspense>
    );
  }

  return (
    <AppShell
      activeKind={activeNavigationForRoute(route)}
      onOpenClimate={() => navigate({ type: 'dashboard', kind: 'climate' })}
      onOpenTime={() => navigate({ type: 'dashboard', kind: 'time' })}
      onOpenSettings={openSettings}
    >
      <SensorRemovedToast
        open={sensorRemovalToastVisible}
        onClose={() => setSensorRemovalToastVisible(false)}
      />
      {content}
    </AppShell>
  );
};
