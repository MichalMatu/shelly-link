type ShellyDeviceRef = { id: string };

type DeviceRemovalActionInput = {
  plugRemovalUsage(id: string): readonly { name: string }[];
  removePlug(id: string): void;
  selectedShellyId: string | null;
  shellyDevices: readonly ShellyDeviceRef[];
  selectShellyDevice(id: string | null): void;
  removeShellyControlState(id: string): void;
  resetShellySetupStatus(): void;
  resetInstallState(): void;
  removeSensorDevice(id: string): boolean;
};

export const createDeviceRemovalActions = (input: DeviceRemovalActionInput) => ({
  plugRemovalUsage: input.plugRemovalUsage,
  removeShellyDevice(id: string): boolean {
    if (input.plugRemovalUsage(id).length > 0) return false;
    input.removePlug(id);
    if (input.selectedShellyId === id) {
      const next = input.shellyDevices.find((device) => device.id !== id);
      input.selectShellyDevice(next?.id ?? null);
    }
    input.removeShellyControlState(id);
    input.resetShellySetupStatus();
    input.resetInstallState();
    return true;
  },
  removeSensorDevice(id: string): boolean {
    const removed = input.removeSensorDevice(id);
    if (removed) input.resetInstallState();
    return removed;
  }
});
