import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider, setLocalePreference } from '../../../app/i18n.js';
import { getIonicButton, isIonicDisabled } from '../../../test/ionicTestEvents.js';
import type { SavedPlugWithBleLocator } from '../data/savedPlug.js';
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
  isOffline: false,
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

const plug: SavedPlugWithBleLocator = {
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
    runtime.isOffline = false;
    runtime.isFetching = false;
    runtime.isRelayError = false;
    runtime.turnRelayOn.mockReset();
    runtime.turnRelayOff.mockReset();
  });

  afterEach(() => setLocalePreference('system'));

  it('shows the shared Plug card skeleton without visible transport metadata', () => {
    renderCard();

    expect(screen.getByText('BLE lamp')).toBeVisible();
    expect(screen.queryByText('Bluetooth · S3PL-00112EU')).not.toBeInTheDocument();
    expect(screen.getByText('4.2 W')).toBeVisible();
    expect(screen.getByText('230 V')).toBeVisible();
    expect(screen.getByText('42 Wh')).toBeVisible();
    expect(screen.getByText('12:34')).toBeVisible();
    expect(isIonicDisabled(getIonicButton(document, 'Add automation'))).toBe(true);

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
    expect(
      screen.getByRole('button', { name: 'Details: S3PL-00112EU · Bluetooth' })
    ).toBeVisible();
  });

  it('opens the read-only Plug detail from the same Details menu used by Wi-Fi cards', () => {
    const onOpen = vi.fn();
    renderCard(onOpen);

    fireEvent.click(
      screen.getByRole('button', { name: 'Details: BLE lamp · Bluetooth' })
    );
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it('keeps pending state accessible without rendering a Refreshing footer', () => {
    runtime.isPending = true;
    runtime.isError = true;
    runtime.isOffline = true;

    renderCard();

    expect(screen.queryByText('Refreshing from Shelly')).not.toBeInTheDocument();
    expect(screen.getByRole('article')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Cannot reach Shelly');
    expect(screen.getByRole('button', { name: 'ON' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'OFF' })).toBeDisabled();
  });

  it('keeps the offline status mounted through a background refresh attempt', () => {
    runtime.isError = true;
    runtime.isOffline = true;
    const rendered = renderCard();
    const footer = rendered.container.querySelector('.automation-card__footer');

    expect(footer).not.toBeNull();
    expect(screen.getByRole('alert')).toHaveTextContent('Cannot reach Shelly');
    expect(screen.getByRole('button', { name: 'ON' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'OFF' })).toBeDisabled();

    runtime.isError = false;
    runtime.isFetching = true;
    rendered.rerender(
      <I18nProvider>
        <BleOnlyPlugCard plug={plug} onNameChange={vi.fn()} onOpen={vi.fn()} />
      </I18nProvider>
    );

    expect(rendered.container.querySelector('.automation-card__footer')).toBe(footer);
    expect(screen.getByRole('alert')).toHaveTextContent('Cannot reach Shelly');
    expect(screen.getByRole('button', { name: 'ON' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'OFF' })).toBeDisabled();
  });

  it('clears the offline status only after a successful runtime read', () => {
    runtime.isOffline = true;
    runtime.isError = true;
    const rendered = renderCard();
    expect(screen.getByRole('alert')).toHaveTextContent('Cannot reach Shelly');

    runtime.isOffline = false;
    runtime.isError = false;
    runtime.isFetching = false;
    rendered.rerender(
      <I18nProvider>
        <BleOnlyPlugCard plug={plug} onNameChange={vi.fn()} onOpen={vi.fn()} />
      </I18nProvider>
    );

    expect(screen.queryByText('Cannot reach Shelly')).not.toBeInTheDocument();
    expect(rendered.container.querySelector('.automation-card__footer')).toBeNull();
    expect(screen.getByRole('button', { name: 'ON' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'OFF' })).toBeEnabled();
  });

  it('keeps relay mutation errors visible without a normal pending footer', () => {
    runtime.isRelayPending = true;
    runtime.isRelayError = true;

    renderCard();

    expect(screen.queryByText('Refreshing from Shelly')).not.toBeInTheDocument();
    expect(screen.getByText('Could not safely change automation state.')).toBeVisible();
  });
});
