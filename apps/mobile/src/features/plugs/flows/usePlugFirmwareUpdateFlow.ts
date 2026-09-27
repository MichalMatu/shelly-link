import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  readPlugFirmwareUpdate,
  startPlugStableFirmwareUpdate,
  waitForPlugFirmwareUpdate,
  type PlugFirmwareUpdateTarget
} from '../data/plugFirmwareUpdate.js';
import { useSavedBlePlugStore } from '../state/savedBlePlugStore.js';

export type PlugFirmwareUpdatePhase =
  'idle' | 'starting' | 'reconnecting' | 'verifying' | 'complete' | 'failed';

export const plugFirmwareUpdateQueryKey = (
  target: PlugFirmwareUpdateTarget | undefined
) =>
  [
    'plug-firmware-update',
    target?.physicalId ?? 'missing',
    target?.baseUrl ?? 'missing'
  ] as const;

export const usePlugFirmwareUpdateFlow = (
  target: PlugFirmwareUpdateTarget | undefined,
  currentFirmware: string | undefined
) => {
  const queryClient = useQueryClient();
  const updateFirmware = useSavedBlePlugStore((state) => state.updateFirmware);
  const [updatePhase, setUpdatePhase] = useState<PlugFirmwareUpdatePhase>('idle');
  const queryKey = plugFirmwareUpdateQueryKey(target);
  const query = useQuery({
    queryKey,
    queryFn: () => {
      if (!target) throw new Error('Plug Wi-Fi locator is missing.');
      return readPlugFirmwareUpdate(target);
    },
    enabled: Boolean(target),
    retry: false,
    staleTime: 60_000
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!target) throw new Error('Plug Wi-Fi locator is missing.');
      const stable = query.data?.supported ? query.data.updates.stable : undefined;
      if (!stable) throw new Error('No stable firmware update is available.');

      setUpdatePhase('starting');
      await startPlugStableFirmwareUpdate(target);
      setUpdatePhase('reconnecting');
      const snapshot = await waitForPlugFirmwareUpdate(target, {
        expectedVersion: stable.version,
        previousFirmware: currentFirmware
      });
      setUpdatePhase('verifying');
      return snapshot;
    },
    retry: false,
    onSuccess: async (snapshot) => {
      if (!target) return;
      if (snapshot.deviceInfo.firmwareId) {
        updateFirmware(target.physicalId, snapshot.deviceInfo.firmwareId);
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey, exact: true }),
        queryClient.invalidateQueries({
          queryKey: ['ble-plug-read-only-detail', target.physicalId]
        }),
        queryClient.invalidateQueries({
          queryKey: ['saved-ble-plug-runtime', target.physicalId]
        })
      ]);
      setUpdatePhase('complete');
    },
    onError: () => setUpdatePhase('failed')
  });

  return { query, updateMutation, updatePhase };
};
