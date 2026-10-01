import { useCallback } from 'react';
import {
  installedAutomationsUsingSensor,
  installedAutomationsUsingShelly
} from '../data/installedAutomationUsage.js';
import { useInstalledAutomationStore } from '../state/installedAutomationStore.js';

type SensorUsageCandidate = { id: string; runtimeAddress: string };

export const useShellyUsage = () => {
  const installations = useInstalledAutomationStore((state) => state.installations);
  return useCallback(
    (physicalId: string) => installedAutomationsUsingShelly(installations, physicalId),
    [installations]
  );
};

export const useSensorUsage = (sensorDevices: readonly SensorUsageCandidate[]) => {
  const installations = useInstalledAutomationStore((state) => state.installations);
  return useCallback(
    (id: string) => {
      const normalizedId = id.trim().toUpperCase();
      const device = sensorDevices.find(
        (candidate) =>
          candidate.id.trim().toUpperCase() === normalizedId ||
          candidate.runtimeAddress.trim().toUpperCase() === normalizedId
      );
      return device
        ? installedAutomationsUsingSensor(installations, device.runtimeAddress)
        : [];
    },
    [installations, sensorDevices]
  );
};
