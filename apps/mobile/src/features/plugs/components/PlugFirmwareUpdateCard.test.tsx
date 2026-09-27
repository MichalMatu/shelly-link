import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider, setLocalePreference } from '../../../app/i18n.js';
import { usePlugFirmwareUpdateFlow } from '../flows/usePlugFirmwareUpdateFlow.js';
import { PlugFirmwareUpdateCard } from './PlugFirmwareUpdateCard.js';

vi.mock('../flows/usePlugFirmwareUpdateFlow.js', () => ({
  usePlugFirmwareUpdateFlow: vi.fn()
}));

describe('PlugFirmwareUpdateCard', () => {
  const updateMutate = vi.fn();

  beforeEach(() => {
    setLocalePreference('en');
    updateMutate.mockReset();
  });

  afterEach(() => {
    cleanup();
    setLocalePreference('system');
  });

  it('explains that Wi-Fi is required before update checks', () => {
    vi.mocked(usePlugFirmwareUpdateFlow).mockReturnValue({
      query: { data: undefined, isPending: false, isError: false, error: null },
      updateMutation: {
        mutate: updateMutate,
        isPending: false,
        isError: false,
        data: undefined
      },
      updatePhase: 'idle'
    } as ReturnType<typeof usePlugFirmwareUpdateFlow>);

    render(
      <I18nProvider>
        <PlugFirmwareUpdateCard currentFirmware="1.2.3" />
      </I18nProvider>
    );

    expect(screen.getByText('1.2.3')).toBeVisible();
    expect(
      screen.getByText('Connect this Plug to Wi-Fi first to check for firmware updates.')
    ).toBeVisible();
  });

  it('offers one explicit stable update when the verified Plug reports one', () => {
    vi.mocked(usePlugFirmwareUpdateFlow).mockReturnValue({
      query: {
        data: {
          supported: true,
          canUpdate: true,
          updates: { stable: { version: '2.0.1' } }
        },
        isPending: false,
        isError: false,
        error: null
      },
      updateMutation: {
        mutate: updateMutate,
        isPending: false,
        isError: false,
        data: undefined
      },
      updatePhase: 'idle'
    } as ReturnType<typeof usePlugFirmwareUpdateFlow>);

    render(
      <I18nProvider>
        <PlugFirmwareUpdateCard
          currentFirmware="20240820-134301/1.2.3-plugsg3prod0-gec79607"
          target={{ physicalId: 'shellyplugsg3-demo', baseUrl: 'http://192.168.1.44' }}
        />
      </I18nProvider>
    );

    expect(screen.getByText('Stable update available: 2.0.1')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Update' }));
    expect(updateMutate).toHaveBeenCalledOnce();
  });

  it('shows the verified firmware after reboot completes', () => {
    vi.mocked(usePlugFirmwareUpdateFlow).mockReturnValue({
      query: {
        data: { supported: true, canUpdate: true, updates: {} },
        isPending: false,
        isError: false,
        error: null
      },
      updateMutation: {
        mutate: updateMutate,
        isPending: false,
        isError: false,
        data: {
          deviceInfo: {
            id: 'shellyplugsg3-demo',
            model: 'S3PL-00112EU',
            gen: 3,
            firmwareId: '20260923-075613/2.0.1-ge1a198b'
          },
          methods: ['Shelly.ListMethods']
        }
      },
      updatePhase: 'complete'
    } as ReturnType<typeof usePlugFirmwareUpdateFlow>);

    render(
      <I18nProvider>
        <PlugFirmwareUpdateCard
          currentFirmware="1.2.3"
          target={{ physicalId: 'shellyplugsg3-demo', baseUrl: 'http://192.168.1.44' }}
        />
      </I18nProvider>
    );

    expect(screen.getByText('20260923-075613/2.0.1-ge1a198b')).toBeVisible();
    expect(screen.getByText('Firmware update verified.')).toBeVisible();
  });
});
