import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { SavedBlePlug } from '../data/savedBlePlug.js';
import { syncSavedPlugTime } from '../data/savedPlugTimeSync.js';
import { blePlugReadOnlyDetailQueryKey } from './useBlePlugReadOnlyDetailFlow.js';

export const useBlePlugTimeSyncFlow = (plug: SavedBlePlug) => {
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
