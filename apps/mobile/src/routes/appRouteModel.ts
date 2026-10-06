import type { AppNavigationSection } from '../components/AppBottomNavigation.js';
import type { SetupIntent } from '../flows/setup-intent.js';

type DashboardRoute = { type: 'dashboard'; section?: AppNavigationSection };
type SetupRoute = {
  type: 'setup';
  intent: SetupIntent;
  sourceSection: AppNavigationSection;
  shellyId?: string;
};
type DeviceAddReturnRoute = DashboardRoute | SetupRoute;
type DeviceAddRoute = {
  type: 'device-add';
  device: 'plug' | 'sensor';
  sourceSection: AppNavigationSection;
  returnTo: DeviceAddReturnRoute;
  sensorMode?: 'manual' | 'phone-scan';
  plugTransport?: 'wifi' | 'bluetooth';
};
type InstallationRoute = {
  type: 'installation';
  installationId: string;
  section: AppNavigationSection;
};
type PlugSettingsRoute = { type: 'plug-settings'; deviceId: string };
type SensorSettingsRoute = { type: 'sensor-settings'; sensorId: string };
type BlePlugDetailRoute = { type: 'ble-plug-detail'; physicalId: string };
type PlugBleReturnRoute = PlugSettingsRoute | InstallationRoute;
type PlugBleDiscoveryRoute = {
  type: 'plug-ble-discovery';
  deviceId: string;
  returnTo: PlugBleReturnRoute;
};
type PrimaryAppRoute =
  | DashboardRoute
  | DeviceAddRoute
  | PlugSettingsRoute
  | SensorSettingsRoute
  | BlePlugDetailRoute
  | PlugBleDiscoveryRoute
  | { type: 'intent'; sourceSection: AppNavigationSection; shellyId?: string }
  | SetupRoute
  | InstallationRoute;

export type AppRoute = PrimaryAppRoute | { type: 'settings'; returnTo: PrimaryAppRoute };

export const activeNavigationSectionForRoute = (
  route: AppRoute
): AppNavigationSection | 'settings' => {
  if (route.type === 'settings') return 'settings';
  if (route.type === 'dashboard') return route.section ?? 'plugs';
  if (route.type === 'installation') return route.section;
  if (route.type === 'sensor-settings') return 'thermometers';
  if (
    route.type === 'plug-settings' ||
    route.type === 'ble-plug-detail' ||
    route.type === 'plug-ble-discovery'
  ) {
    return 'plugs';
  }
  if (route.type === 'device-add') return route.sourceSection;
  return route.sourceSection;
};
