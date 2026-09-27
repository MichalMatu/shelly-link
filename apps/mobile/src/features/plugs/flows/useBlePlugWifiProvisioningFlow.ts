import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  provisionBlePlugWifi,
  scanBlePlugWifiNetworks
} from '../data/blePlugWifiProvisioning.js';
import type { SavedPlugWithBleLocator } from '../data/savedPlug.js';
import { useSavedPlugStore } from '../state/savedPlugStore.js';
import { blePlugReadOnlyDetailQueryKey } from './useBlePlugReadOnlyDetailFlow.js';

export const useBlePlugWifiProvisioningFlow = (plug: SavedPlugWithBleLocator) => {
  const queryClient = useQueryClient();
  const setWifiLocator = useSavedPlugStore((state) => state.setWifiLocator);

  const scanMutation = useMutation({
    mutationFn: () => scanBlePlugWifiNetworks(plug),
    retry: false
  });

  const connectMutation = useMutation({
    mutationFn: (input: { ssid: string; password: string }) =>
      provisionBlePlugWifi(plug, input),
    retry: false,
    onSuccess: async ({ status }) => {
      if (status.sta_ip) {
        setWifiLocator(plug.physicalId, `http://${status.sta_ip}`);
      }
      await queryClient.invalidateQueries({
        queryKey: blePlugReadOnlyDetailQueryKey(plug),
        exact: true
      });
    }
  });

  return { scanMutation, connectMutation };
};
