import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider, setLocalePreference } from '../../../app/i18n.js';
import { deviceTimeCopy } from '../../../app/locales/deviceTime.js';
import {
  BlePlugTimeSyncUnsupportedError,
  syncBlePlugTime
} from '../data/blePlugTimeSync.js';
import type { SavedPlugWithBleLocator } from '../data/savedPlug.js';
import { BlePlugTimeSyncCard } from './BlePlugTimeSyncCard.js';

type BlePlugTimeSyncModule = {
  BlePlugTimeSyncUnsupportedError: typeof BlePlugTimeSyncUnsupportedError;
  syncBlePlugTime: typeof syncBlePlugTime;
};

vi.mock('../data/blePlugTimeSync.js', async (importOriginal) => {
  const actual = await importOriginal<BlePlugTimeSyncModule>();
  return { ...actual, syncBlePlugTime: vi.fn() };
});

const copy = deviceTimeCopy.pl;
const plug: SavedPlugWithBleLocator = {
  physicalId: 'shellyplugsg3-demo',
  name: 'Grow Plug',
  bleDeviceId: 'BLE-LOCATOR',
  advertisementName: 'ShellyPlugSG3-demo',
  model: 'S3PL-00112EU',
  generation: 3,
  firmwareId: '1.7.5',
  matterEnabled: false
};

const renderCard = (localTime: string | null = '18:42') => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return render(
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <BlePlugTimeSyncCard
          plug={plug}
          clock={{ ...(localTime ? { localTime } : {}), timeSynced: false }}
        />
      </QueryClientProvider>
    </I18nProvider>
  );
};

describe('BlePlugTimeSyncCard', () => {
  beforeEach(() => {
    setLocalePreference('pl');
    vi.mocked(syncBlePlugTime).mockReset();
  });

  afterEach(() => {
    cleanup();
    setLocalePreference('system');
  });

  it('shows device time and performs one explicit BLE time sync', async () => {
    vi.mocked(syncBlePlugTime).mockResolvedValue({ unixTimeSec: 1_800_000_000.123 });
    renderCard();

    expect(screen.getByText('18:42')).toBeVisible();
    const button = screen.getByRole('button', { name: copy.sync });
    fireEvent.click(button);

    expect(await screen.findByText(copy.synced)).toBeVisible();
    expect(syncBlePlugTime).toHaveBeenCalledOnce();
    expect(syncBlePlugTime).toHaveBeenCalledWith(plug);
  });

  it('keeps unexpected technical failures out of user-facing feedback', async () => {
    const technicalMessage = 'RPC -32601: No handler for Sys.SetTime';
    vi.mocked(syncBlePlugTime).mockRejectedValue(new Error(technicalMessage));
    renderCard();

    fireEvent.click(screen.getByRole('button', { name: copy.sync }));

    expect(await screen.findByText(copy.actionFailed)).toBeVisible();
    expect(screen.queryByText(technicalMessage)).toBeNull();
    expect(syncBlePlugTime).toHaveBeenCalledOnce();
  });

  it('shows an unset clock and firmware-specific unsupported feedback', async () => {
    vi.mocked(syncBlePlugTime).mockRejectedValue(new BlePlugTimeSyncUnsupportedError());
    renderCard(null);

    expect(screen.getByText(copy.unavailable)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: copy.sync }));

    expect(await screen.findByText(copy.unsupported)).toBeVisible();
    expect(syncBlePlugTime).toHaveBeenCalledOnce();
  });
});
