import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider, setLocalePreference } from '../../../app/i18n.js';
import type { SavedBlePlug } from '../data/savedBlePlug.js';
import { BleOnlyPlugCard } from './BleOnlyPlugCard.js';

const runtime = vi.hoisted(() => ({
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

vi.mock('../flows/useSavedBlePlugRuntime.js', () => ({
  useSavedBlePlugRuntime: () => runtime
}));

const plug: SavedBlePlug = {
  physicalId: 'shellyplugsg3-demo',
  name: 'BLE lamp',
  bleDeviceId: 'BLE-LOCATOR',
  advertisementName: 'ShellyPlugSG3-Demo',
  model: 'S3PL-00112EU',
  generation: 3,
  firmwareId: '1.7.5',
  matterEnabled: false
};

const renderCard = (onOpen = vi.fn(), candidate = plug) =>
  render(
    <I18nProvider>
      <BleOnlyPlugCard plug={candidate} onNameChange={vi.fn()} onOpen={onOpen} />
    </I18nProvider>
  );

describe('BleOnlyPlugCard', () => {
  beforeEach(() => {
    setLocalePreference('en');
    runtime.isPending = false;
    runtime.isRelayPending = false;
    runtime.isError = false;
    runtime.isRelayError = false;
    runtime.turnRelayOn.mockReset();
    runtime.turnRelayOff.mockReset();
  });

  afterEach(() => setLocalePreference('system'));

  it('shows normalized BLE runtime status without transport metadata on the dashboard', () => {
    renderCard();

    expect(screen.getByText('BLE lamp')).toBeVisible();
    expect(screen.queryByText('Bluetooth · S3PL-00112EU')).not.toBeInTheDocument();
    expect(screen.getByText('4.2 W')).toBeVisible();
    expect(screen.getByText('230 V')).toBeVisible();
    expect(screen.getByText('42 Wh')).toBeVisible();
    expect(screen.getByText('12:34')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'ON' }));
    expect(runtime.turnRelayOn).toHaveBeenCalledOnce();
    expect(runtime.turnRelayOff).not.toHaveBeenCalled();
  });

  it('shows the model like Wi-Fi cards when the saved name is still the factory advertisement', () => {
    renderCard(vi.fn(), {
      ...plug,
      name: 'ShellyPlugSG3-Demo'
    });

    expect(screen.getByText('S3PL-00112EU')).toBeVisible();
    expect(screen.queryByText('ShellyPlugSG3-Demo')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Details: S3PL-00112EU' })).toBeVisible();
  });

  it('opens the read-only Plug detail from the same Details menu used by Wi-Fi cards', () => {
    const onOpen = vi.fn();
    renderCard(onOpen);

    fireEvent.click(screen.getByRole('button', { name: 'Details: BLE lamp' }));
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it('keeps pending state accessible without rendering a Refreshing footer', () => {
    runtime.isPending = true;
    runtime.isError = true;

    renderCard();

    expect(screen.queryByText('Refreshing from Shelly')).not.toBeInTheDocument();
    expect(screen.getByRole('article')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Cannot reach Shelly');
    expect(screen.getByRole('button', { name: 'ON' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'OFF' })).toBeDisabled();
  });

  it('keeps relay mutation errors visible without a normal pending footer', () => {
    runtime.isRelayPending = true;
    runtime.isRelayError = true;

    renderCard();

    expect(screen.queryByText('Refreshing from Shelly')).not.toBeInTheDocument();
    expect(screen.getByText('Could not safely change automation state.')).toBeVisible();
  });
});
