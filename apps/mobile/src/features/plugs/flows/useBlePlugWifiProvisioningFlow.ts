import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  provisionBlePlugWifi,
  scanBlePlugWifiNetworks
} from '../data/blePlugWifiProvisioning.js';
import type { SavedBlePlug } from '../data/savedBlePlug.js';
import { useSavedBlePlugStore } from '../state/savedBlePlugStore.js';
import { blePlugReadOnlyDetailQueryKey } from './useBlePlugReadOnlyDetailFlow.js';

export const useBlePlugWifiProvisioningFlow = (plug: SavedBlePlug) => {
  const queryClient = useQueryClient();
  const setWifiLocator = useSavedBlePlugStore((state) => state.setWifiLocator);

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
