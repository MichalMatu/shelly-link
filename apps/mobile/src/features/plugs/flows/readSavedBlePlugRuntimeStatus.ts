import {
  isRecoverableBlePlugRuntimeReadError,
  readBlePlugRuntimeStatus,
  type BlePlugRuntimeStatus
} from '../data/blePlugRuntime.js';
import type { SavedPlugWithBleLocator } from '../data/savedPlug.js';
import {
  recoverSavedBlePlugLocator,
  type SavedBlePlugLocatorRecoveryDependencies,
  type SavedBlePlugLocatorRecoveryOptions
} from './recoverSavedBlePlugLocator.js';

export { PLUG_BLE_LOCATOR_RECOVERY_MAX_CANDIDATES } from './recoverSavedBlePlugLocator.js';

export type SavedBlePlugRuntimeRecoveryOptions = SavedBlePlugLocatorRecoveryOptions;

export type SavedBlePlugRuntimeRecoveryDependencies =
  SavedBlePlugLocatorRecoveryDependencies & {
    readStatus?(plug: Pick<SavedPlugWithBleLocator, 'bleDeviceId'>): Promise<BlePlugRuntimeStatus>;
  };

export const readSavedBlePlugRuntimeStatus = async (
  plug: SavedPlugWithBleLocator,
  options: SavedBlePlugRuntimeRecoveryOptions,
  dependencies: SavedBlePlugRuntimeRecoveryDependencies = {}
): Promise<BlePlugRuntimeStatus> => {
  const readStatus = dependencies.readStatus ?? readBlePlugRuntimeStatus;

  try {
    return await readStatus(plug);
  } catch (error) {
    if (!isRecoverableBlePlugRuntimeReadError(error)) throw error;
  }

  const bleDeviceId = await recoverSavedBlePlugLocator(plug, options, dependencies);
  return readStatus({ bleDeviceId });
};
