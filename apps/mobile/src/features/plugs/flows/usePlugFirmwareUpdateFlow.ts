import { useMutation, useQuery } from '@tanstack/react-query';
import {
  readPlugFirmwareUpdate,
  startPlugStableFirmwareUpdate,
  type PlugFirmwareUpdateTarget
} from '../data/plugFirmwareUpdate.js';

export const plugFirmwareUpdateQueryKey = (
  target: PlugFirmwareUpdateTarget | undefined
) => [
  'plug-firmware-update',
  target?.physicalId ?? 'missing',
  target?.baseUrl ?? 'missing'
] as const;

export const usePlugFirmwareUpdateFlow = (
  target: PlugFirmwareUpdateTarget | undefined
) => {
  const query = useQuery({
    queryKey: plugFirmwareUpdateQueryKey(target),
    queryFn: () => {
      if (!target) throw new Error('Plug Wi-Fi locator is missing.');
      return readPlugFirmwareUpdate(target);
    },
    enabled: Boolean(target),
    retry: false,
    staleTime: 60_000
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!target) throw new Error('Plug Wi-Fi locator is missing.');
      return startPlugStableFirmwareUpdate(target);
    },
    retry: false
  });

  return { query, updateMutation };
};
