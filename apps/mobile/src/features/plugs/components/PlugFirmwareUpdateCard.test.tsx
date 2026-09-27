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
      updateMutation: { mutate: updateMutate, isPending: false, isError: false }
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
          updates: { stable: { version: '2.0.0' } }
        },
        isPending: false,
        isError: false,
        error: null
      },
      updateMutation: { mutate: updateMutate, isPending: false, isError: false }
    } as ReturnType<typeof usePlugFirmwareUpdateFlow>);

    render(
      <I18nProvider>
        <PlugFirmwareUpdateCard
          currentFirmware="1.2.3"
          target={{ physicalId: 'shellyplugsg3-demo', baseUrl: 'http://192.168.1.44' }}
        />
      </I18nProvider>
    );

    expect(screen.getByText('Stable update available: 2.0.0')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Update' }));
    expect(updateMutate).toHaveBeenCalledOnce();
  });
});
