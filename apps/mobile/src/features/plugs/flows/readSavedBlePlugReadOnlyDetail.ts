import { isRecoverableBlePlugReadOnlyError } from '../data/blePlugReadOnlyError.js';
import {
  readBlePlugReadOnlyDetail,
  readPlugReadOnlyDetailFromTarget,
  type PlugReadOnlyDetail
} from '../data/plugReadOnlyDetail.js';
import type { SavedPlugWithBleLocator } from '../data/savedPlug.js';
import {
  recoverSavedBlePlugLocator,
  type SavedBlePlugLocatorRecoveryDependencies,
  type SavedBlePlugLocatorRecoveryOptions
} from './recoverSavedBlePlugLocator.js';

export type SavedBlePlugReadOnlyDetailRecoveryDependencies =
  SavedBlePlugLocatorRecoveryDependencies & {
    readDetail?(
      plug: Pick<SavedPlugWithBleLocator, 'physicalId' | 'bleDeviceId'>
    ): Promise<PlugReadOnlyDetail>;
    readWifiDetail?(
      plug: Pick<SavedPlugWithBleLocator, 'physicalId' | 'wifiBaseUrl'>
    ): Promise<PlugReadOnlyDetail>;
  };

export const readSavedBlePlugReadOnlyDetail = async (
  plug: SavedPlugWithBleLocator,
  options: SavedBlePlugLocatorRecoveryOptions,
  dependencies: SavedBlePlugReadOnlyDetailRecoveryDependencies = {}
): Promise<PlugReadOnlyDetail> => {
  if (plug.wifiBaseUrl) {
    const readWifiDetail =
      dependencies.readWifiDetail ??
      ((target: Pick<SavedPlugWithBleLocator, 'physicalId' | 'wifiBaseUrl'>) =>
        readPlugReadOnlyDetailFromTarget({
          transport: 'wifi',
          physicalId: target.physicalId,
          baseUrl: target.wifiBaseUrl as string
        }));
    return readWifiDetail(plug);
  }

  const readDetail = dependencies.readDetail ?? readBlePlugReadOnlyDetail;

  try {
    return await readDetail(plug);
  } catch (error) {
    if (!isRecoverableBlePlugReadOnlyError(error)) throw error;
  }

  const bleDeviceId = await recoverSavedBlePlugLocator(plug, options, dependencies);
  return readDetail({ physicalId: plug.physicalId, bleDeviceId });
};
