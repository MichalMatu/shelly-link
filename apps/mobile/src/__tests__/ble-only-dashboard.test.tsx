import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider, setLocalePreference } from '../app/i18n.js';
import { resetSavedPlugStore, useSavedPlugStore } from '../features/plugs/index.js';
import { resetHardwareSetupDraftStore } from '../flows/hardware-setup/setupDraftStore.js';
import { resetInstalledAutomationStore } from '../flows/installations/store.js';
import { AutomationDashboardScreen } from '../screens/AutomationDashboardScreen.js';

const bleRuntime = vi.hoisted(() => ({
  status: {
    relayOn: false,
    telemetry: { powerW: 4.2, voltageV: 230, energyWh: 42 },
    clock: { localTime: '12:34', timeSynced: true }
  },
  isPending: false,
  isFetching: false,
  isError: false,
  statusError: null,
  isRelayPending: false,
  isRelayError: false,
  relayError: null,
  turnRelayOn: vi.fn(),
  turnRelayOff: vi.fn()
}));

vi.mock('../features/plugs/flows/useSavedBlePlugRuntime.js', () => ({
  useSavedBlePlugRuntime: () => bleRuntime
}));

vi.mock('../flows/hardware-setup/useHardwareSetupFlow.js', () => ({
  useHardwareSetupFlow: () => {
    throw new Error('Thermometer dashboard must not mount the full hardware setup flow.');
  }
}));

const saveBlePlug = (physicalId: string, name: string) => {
  useSavedPlugStore.getState().saveBleCandidate({
    bleDeviceId: `BLE:${physicalId}`,
    advertisementName: 'ShellyPlugSG3-BLE',
    rssi: -42,
    physicalId,
    model: 'S3PL-00112EU',
    generation: 3,
    firmwareId: '1.7.5',
    matterEnabled: false
  });
  useSavedPlugStore.getState().renamePlug(physicalId, name);
};

const renderDashboard = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return render(
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <AutomationDashboardScreen
          initialSection="plugs"
          onAddPlug={vi.fn()}
          onAddThermometer={vi.fn()}
          onAddAutomation={vi.fn()}
          onOpenInstallation={vi.fn()}
          onOpenBlePlug={vi.fn()}
          onOpenPlugSettings={vi.fn()}
        />
      </QueryClientProvider>
    </I18nProvider>
  );
};

describe('BLE-only dashboard integration', () => {
  beforeEach(() => {
    setLocalePreference('en');
    resetSavedPlugStore();
    resetHardwareSetupDraftStore();
    resetSavedPlugStore();
    resetInstalledAutomationStore();
  });

  afterEach(() => {
    cleanup();
    resetSavedPlugStore();
    resetHardwareSetupDraftStore();
    resetSavedPlugStore();
    resetInstalledAutomationStore();
    setLocalePreference('system');
  });

  it('shows a saved BLE-only Plug with runtime status and keeps transport metadata out of the card header', () => {
    saveBlePlug('shellyplugsg3-ble-only-1', 'BLE lamp');

    renderDashboard();

    expect(screen.getByText('BLE lamp')).toBeVisible();
    expect(screen.queryByText('Bluetooth · S3PL-00112EU')).not.toBeInTheDocument();
    expect(screen.getByText('4.2 W')).toBeVisible();
    expect(screen.getByRole('button', { name: 'ON' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'OFF' })).toBeVisible();
  });

  it('does not duplicate a physical Plug already represented by Wi-Fi', () => {
    const physicalId = 'shellyplugsg3-shared-1';
    saveBlePlug(physicalId, 'BLE shadow');
    useSavedPlugStore.getState().saveWifiDevice({
      physicalId: physicalId,
      name: 'Wi-Fi Plug',
      wifiBaseUrl: 'http://192.168.0.44/',
      scriptIdInput: '1'
    });

    renderDashboard();

    expect(screen.getByText('BLE shadow')).toBeVisible();
    expect(screen.queryByText('Wi-Fi Plug')).toBeNull();
  });
});
