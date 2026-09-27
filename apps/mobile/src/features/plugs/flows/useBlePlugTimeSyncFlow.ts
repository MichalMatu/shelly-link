import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { SavedPlugWithBleLocator } from '../data/savedPlug.js';
import { syncSavedPlugTime } from '../data/savedPlugTimeSync.js';
import { blePlugReadOnlyDetailQueryKey } from './useBlePlugReadOnlyDetailFlow.js';

export const useBlePlugTimeSyncFlow = (plug: SavedPlugWithBleLocator) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => syncSavedPlugTime(plug),
    retry: false,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: blePlugReadOnlyDetailQueryKey(plug),
        exact: true
      });
    }
  });
};
