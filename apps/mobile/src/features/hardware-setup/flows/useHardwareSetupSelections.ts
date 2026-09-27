import { useMemo } from 'react';
import type {
  SensorDraftDevice,
  ShellyDraftDevice
} from '../data/setupDraftPersistence.js';

type HardwareSetupSelectionParams = {
  shellyDevices: ShellyDraftDevice[];
  selectedShellyId: string | null;
  sensorDevices: SensorDraftDevice[];
  selectedSensorId: string | null;
  additionalSensorIds: string[];
  inheritedSensorIds: string[];
  inheritedSensorSourceId: string | null;
  editInstallationId: string | undefined;
};

export const verifiedWifiPlugInput = (device: ShellyDraftDevice) => ({
  physicalId: device.id,
  name: device.name,
  wifiBaseUrl: device.baseUrl,
  scriptIdInput: device.scriptIdInput,
  ...(device.model ? { model: device.model } : {}),
  ...(device.gen !== undefined ? { generation: device.gen } : {})
});

export const useHardwareSetupSelections = ({
  shellyDevices,
  selectedShellyId,
  sensorDevices,
  selectedSensorId,
  additionalSensorIds,
  inheritedSensorIds,
  inheritedSensorSourceId,
  editInstallationId
}: HardwareSetupSelectionParams) => {
  const selectedShelly = useMemo(
    () => shellyDevices.find((device) => device.id === selectedShellyId) ?? null,
    [selectedShellyId, shellyDevices]
  );
  const selectedSensor = useMemo(
    () => sensorDevices.find((device) => device.id === selectedSensorId) ?? null,
    [selectedSensorId, sensorDevices]
  );
  const additionalSensors = useMemo(
    () =>
      additionalSensorIds
        .map((id) => sensorDevices.find((device) => device.id === id) ?? null)
        .filter((device): device is SensorDraftDevice => device !== null),
    [additionalSensorIds, sensorDevices]
  );
  const scopedInheritedSensorIds =
    editInstallationId && inheritedSensorSourceId === editInstallationId
      ? inheritedSensorIds
      : [];

  return { selectedShelly, selectedSensor, additionalSensors, scopedInheritedSensorIds };
};
