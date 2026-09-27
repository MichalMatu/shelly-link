import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider, setLocalePreference } from '../../../app/i18n.js';
import { useBlePlugWifiProvisioningFlow } from '../flows/useBlePlugWifiProvisioningFlow.js';
import type { SavedBlePlug } from '../data/savedBlePlug.js';
import { BlePlugWifiProvisioningCard } from './BlePlugWifiProvisioningCard.js';

vi.mock('../flows/useBlePlugWifiProvisioningFlow.js', () => ({
  useBlePlugWifiProvisioningFlow: vi.fn()
}));

const plug: SavedBlePlug = {
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
    } as ReturnType<typeof useBlePlugWifiProvisioningFlow>);
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

    fireEvent.click(screen.getByRole('button', { name: 'Scan networks' }));
    fireEvent.click(screen.getByRole('button', { name: 'Network' }));
    const homeOption = screen.getByRole('option', { name: 'Home' });
    expect(homeOption).toBeVisible();
    fireEvent.click(homeOption);

    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'wifi-secret' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Connect' }));

    expect(connectMutate).toHaveBeenCalledOnce();
    expect(connectMutate.mock.calls[0]?.[0]).toEqual({
      ssid: 'Home',
      password: 'wifi-secret'
    });
  });
});
