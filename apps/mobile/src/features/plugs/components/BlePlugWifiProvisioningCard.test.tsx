import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider, setLocalePreference } from '../../../app/i18n.js';
import {
  fireIonChange,
  fireIonInput,
  getIonicButton,
  getIonicInput,
  getIonicSelect
} from '../../../test/ionicTestEvents.js';
import { useBlePlugWifiProvisioningFlow } from '../flows/useBlePlugWifiProvisioningFlow.js';
import type { SavedPlugWithBleLocator } from '../data/savedPlug.js';
import { BlePlugWifiProvisioningCard } from './BlePlugWifiProvisioningCard.js';

vi.mock('../flows/useBlePlugWifiProvisioningFlow.js', () => ({
  useBlePlugWifiProvisioningFlow: vi.fn()
}));

const plug: SavedPlugWithBleLocator = {
  physicalId: 'shellyplugsg3-demo',
  name: 'Grow Plug',
  bleDeviceId: 'BLE-LOCATOR',
  advertisementName: 'ShellyPlugSG3-demo',
  model: 'S3PL-00112EU',
  generation: 3,
  firmwareId: '1.2.3',
  matterEnabled: false
};

const renderCard = () =>
  render(
    <I18nProvider>
      <BlePlugWifiProvisioningCard plug={plug} />
    </I18nProvider>
  );

describe('BlePlugWifiProvisioningCard', () => {
  const scanMutate = vi.fn();
  const connectMutate = vi.fn();

  beforeEach(() => {
    setLocalePreference('en');
    scanMutate.mockReset();
    connectMutate.mockReset();
    vi.mocked(useBlePlugWifiProvisioningFlow).mockReturnValue({
      scanMutation: {
        mutate: scanMutate,
        isPending: false,
        isError: false
      },
      connectMutation: {
        mutate: connectMutate,
        isPending: false,
        isError: false
      }
    } as unknown as ReturnType<typeof useBlePlugWifiProvisioningFlow>);
  });

  afterEach(() => {
    cleanup();
    setLocalePreference('system');
  });

  it('scans, selects a secured network, and submits credentials once', () => {
    scanMutate.mockImplementation((_input, options) => {
      options?.onSuccess?.([
        { ssid: 'Home', auth: 3, rssi: -40 },
        { ssid: 'Guest', auth: 0, rssi: -70 }
      ]);
    });
    renderCard();

    fireEvent.click(getIonicButton(document, 'Scan networks'));
    const networkSelect = getIonicSelect(document, 'Network');
    fireIonChange(networkSelect, 'Home');

    fireIonInput(getIonicInput(document, 'Password'), 'wifi-secret');
    fireEvent.click(getIonicButton(document, 'Connect'));

    expect(connectMutate).toHaveBeenCalledOnce();
    expect(connectMutate.mock.calls[0]?.[0]).toEqual({
      ssid: 'Home',
      password: 'wifi-secret'
    });
  });
});
