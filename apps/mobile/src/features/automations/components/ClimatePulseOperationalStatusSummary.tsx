import {
  climatePulseOperationalStatus,
  type ClimatePulseOperationalControl,
  type ClimatePulseOperationalSnapshot
} from '../data/climatePulseOperationalStatus.js';
import { PulseOperationalStatusSummary } from './PulseOperationalStatusSummary.js';

export type ClimatePulseOperationalStatusSummaryProps = {
  snapshot: ClimatePulseOperationalSnapshot | undefined;
  control: ClimatePulseOperationalControl | undefined;
  compact?: boolean;
};

export const ClimatePulseOperationalStatusSummary = ({
  snapshot,
  control,
  compact = false
}: ClimatePulseOperationalStatusSummaryProps) => (
  <PulseOperationalStatusSummary
    status={climatePulseOperationalStatus({ snapshot, control })}
    compact={compact}
  />
);
