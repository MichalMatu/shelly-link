import { normalizeShellyDeviceId } from '@lcl/shelly-client';
import type {
  ClimateInstalledAutomation,
  InstalledAutomation
} from './installedAutomation.js';

export type InstalledAutomationUsage = {
  id: string;
  kind: InstalledAutomation['kind'];
  name: string;
};

const usageFromInstallation = (
  installation: InstalledAutomation
): InstalledAutomationUsage => ({
  id: installation.id,
  kind: installation.kind,
  name: installation.shelly.name
});

const normalizeRuntimeAddress = (value: string): string => value.trim().toUpperCase();

export const installedAutomationsUsingShelly = (
  installations: readonly InstalledAutomation[],
  physicalId: string
): InstalledAutomationUsage[] => {
  const normalizedPhysicalId = normalizeShellyDeviceId(physicalId);
  return installations
    .filter(
      (installation) =>
        normalizeShellyDeviceId(installation.shelly.deviceId) === normalizedPhysicalId
    )
    .map(usageFromInstallation);
};

export const installedAutomationsUsingSensor = (
  installations: readonly InstalledAutomation[],
  runtimeAddress: string
): InstalledAutomationUsage[] => {
  const normalizedAddress = normalizeRuntimeAddress(runtimeAddress);
  return installations
    .filter(
      (installation): installation is ClimateInstalledAutomation =>
        installation.kind === 'climate'
    )
    .filter((installation) => {
      const sensors = [
        installation.config.sensor,
        ...(installation.config.sensorSet?.additionalSensors ?? [])
      ];
      return sensors.some(
        (sensor) => normalizeRuntimeAddress(sensor.runtimeAddress) === normalizedAddress
      );
    })
    .map(usageFromInstallation);
};
