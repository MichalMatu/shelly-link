import { useQuery } from '@tanstack/react-query';
import type { SavedPlugWithBleLocator } from '../data/savedPlug.js';
import { useSavedPlugStore } from '../state/savedPlugStore.js';
import { readSavedBlePlugReadOnlyDetail } from './readSavedBlePlugReadOnlyDetail.js';

export const blePlugReadOnlyDetailQueryKey = (plug: SavedPlugWithBleLocator | undefined) =>
  [
    'ble-plug-read-only-detail',
    plug?.physicalId ?? 'missing',
    plug?.bleDeviceId ?? 'missing',
    plug?.wifiBaseUrl ?? 'no-wifi'
  ] as const;

export const useBlePlugReadOnlyDetailFlow = (plug: SavedPlugWithBleLocator | undefined) => {
  const replaceBleLocator = useSavedPlugStore((state) => state.replaceBleLocator);

  return useQuery({
    queryKey: blePlugReadOnlyDetailQueryKey(plug),
    queryFn: () => {
      if (!plug) throw new Error('Saved BLE Plug is missing.');
      return readSavedBlePlugReadOnlyDetail(plug, { persistLocator: replaceBleLocator });
    },
    enabled: Boolean(plug),
    retry: false,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true
  });
};
