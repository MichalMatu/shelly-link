import { hasBleLocator, type SavedPlug } from '../data/savedPlug.js';
import { BleOnlyPlugCard } from './BleOnlyPlugCard.js';

export type BleOnlyPlugDashboardCardsProps = {
  plugs: readonly SavedPlug[];
  onNameChange(physicalId: string, value: string): void;
  onOpen(physicalId: string): void;
};

export const BleOnlyPlugDashboardCards = ({
  plugs,
  onNameChange,
  onOpen
}: BleOnlyPlugDashboardCardsProps) =>
  plugs.filter(hasBleLocator).map((plug) => (
    <BleOnlyPlugCard
      key={`ble-plug:${plug.physicalId}`}
      plug={plug}
      onNameChange={(value) => onNameChange(plug.physicalId, value)}
      onOpen={() => onOpen(plug.physicalId)}
    />
  ));
