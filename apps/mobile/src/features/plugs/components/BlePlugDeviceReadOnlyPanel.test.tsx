import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { I18nProvider, setLocalePreference } from '../../../app/i18n.js';
import { BlePlugDeviceReadOnlyPanel } from './BlePlugDeviceReadOnlyPanel.js';

describe('BlePlugDeviceReadOnlyPanel', () => {
  beforeEach(() => setLocalePreference('en'));
  afterEach(() => setLocalePreference('system'));

  it('renders the Wi-Fi Device section skeleton with read-only BLE values', () => {
    render(
      <I18nProvider>
        <BlePlugDeviceReadOnlyPanel
          settings={{
            supported: true,
            config: {
              leds: {
                mode: 'switch',
                colors: {
                  'switch:0': {
                    on: { rgb: [0, 100, 0], brightness: 100 },
                    off: { rgb: [100, 0, 0], brightness: 100 }
                  }
                },
                night_mode: {
                  enable: true,
                  brightness: 10,
                  active_between: ['22:00', '06:00']
                }
              },
              controls: { 'switch:0': { in_mode: 'momentary' } }
            },
            capabilities: {
              switchColors: true,
              powerBrightness: false,
              nightMode: true
            },
            controlCapabilities: { buttonInputMode: true }
          }}
          cloud={{
            supported: true,
            config: { enable: false, server: 'shelly.example' },
            status: { connected: false }
          }}
        />
      </I18nProvider>
    );

    expect(screen.getByRole('heading', { name: 'Plug LED' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Physical button' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Shelly Cloud' })).toBeVisible();
    expect(screen.getByText('Show ON/OFF')).toBeVisible();
    expect(screen.getByText('enabled · 10% · 22:00–06:00')).toBeVisible();
    expect(screen.getByText('Controls relay')).toBeVisible();
    expect(screen.getByText('Enable Shelly Cloud')).toBeVisible();
    expect(screen.getByText('Cloud connection')).toBeVisible();
    expect(screen.getAllByText('disabled')).toHaveLength(1);
    expect(screen.getByText('Not connected')).toBeVisible();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('keeps all Device slots visible when PLUGS_UI is unavailable and Cloud works', () => {
    render(
      <I18nProvider>
        <BlePlugDeviceReadOnlyPanel
          settings={{ supported: false }}
          cloud={{
            supported: true,
            config: { enable: true, server: null },
            status: { connected: true }
          }}
        />
      </I18nProvider>
    );

    expect(screen.getByRole('heading', { name: 'Plug LED' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Physical button' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Shelly Cloud' })).toBeVisible();
    expect(screen.getByText('Enable Shelly Cloud')).toBeVisible();
    expect(screen.getByText('Cloud connection')).toBeVisible();
    expect(screen.getByText('enabled')).toBeVisible();
    expect(screen.getByText('Connected')).toBeVisible();
    expect(screen.queryByText('LED mode')).not.toBeInTheDocument();
    expect(screen.queryByText('Button mode')).not.toBeInTheDocument();
  });
});
